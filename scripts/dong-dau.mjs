#!/usr/bin/env node
/* =====================================================================
 * Bước cuối của `npm run build`. Làm ba việc cho web nhanh:
 *
 * 1. Thu gọn CSS/JS (chỉ khi dựng trên Cloudflare Pages, biến CF_PAGES).
 *    Ở máy riêng thì cả ba việc đều KHÔNG chạy, để không ghi đè mã nguồn.
 *    File nào thu gọn lỗi thì giữ nguyên bản gốc.
 *
 * 2. Đóng dấu phiên bản cho file CSS/JS nội bộ trong mọi trang HTML:
 *      href="/css/theme.css"  →  href="/css/theme.css?v=ab12cd34"
 *    Dấu là mã băm NỘI DUNG file. File không đổi thì dấu không đổi, nên
 *    trình duyệt giữ bản đã tải (xem _headers: /css, /js lưu 1 năm).
 *    File đổi thì dấu đổi, trình duyệt tải bản mới ngay.
 *
 * 3. Chèn "speculation rules": khi người xem rê chuột hoặc chạm vào một link
 *    nội bộ, trình duyệt tải trước trang đó nên bấm là mở gần như tức thì.
 *    Chỉ TẢI TRƯỚC HTML (prefetch), không chạy trang, nên không làm sai bộ đếm.
 *    Không áp dụng cho link ngắn mạng xã hội (/facebook…: mở là tính một lượt),
 *    /api, /email (tự mở app thư), /stats.
 * ===================================================================== */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.github', 'libs', 'scripts', 'functions', 'lib']);
const ON_CF = !!process.env.CF_PAGES;
// Ở máy riêng: không đụng vào file nào (trước đây dấu ?v= lọt vào mã nguồn). Muốn chạy thử: thêm --force.
if (!ON_CF && !process.argv.includes('--force')) { console.log('Không phải Cloudflare Pages: bỏ qua thu gọn, đóng dấu và tải trước.'); process.exit(0); }

async function* walk(dir, ext) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, ext);
    else if (ext.some((x) => e.name.endsWith(x))) yield p;
  }
}

/* ---- 1. Thu gọn ---- */
if (ON_CF) {
  let esbuild = null;
  try { esbuild = await import('esbuild'); } catch (e) { console.log('Không có esbuild, bỏ qua bước thu gọn.'); }
  if (esbuild) {
    let ok = 0, bad = 0, before = 0, after = 0;
    for await (const f of walk(ROOT, ['.css', '.js'])) {
      if (/\.min\.(js|css)$/.test(f) || f.includes(`${path.sep}vendor${path.sep}`)) continue;
      const src = await readFile(f, 'utf8');
      try {
        const r = await esbuild.transform(src, { loader: f.endsWith('.css') ? 'css' : 'js', minify: true, legalComments: 'none', charset: 'utf8', target: f.endsWith('.css') ? ['chrome90', 'safari14', 'firefox90'] : 'es2019' });
        if (r.code && r.code.length < src.length) { await writeFile(f, r.code); before += src.length; after += r.code.length; ok++; }
      } catch (e) { bad++; console.log(`Giữ nguyên (không thu gọn được): ${path.relative(ROOT, f)}`); }
    }
    console.log(`Đã thu gọn ${ok} file CSS/JS: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB${bad ? `, ${bad} file giữ nguyên` : ''}.`);
  }
}

/* ---- 2 + 3. Đóng dấu và chèn tải trước ---- */
const hashes = new Map();
async function stamp(file) {
  if (!hashes.has(file)) {
    let h = '';
    try { h = createHash('sha1').update(await readFile(file)).digest('hex').slice(0, 8); } catch (e) { h = ''; }
    hashes.set(file, h);
  }
  return hashes.get(file);
}

const SHORT = ['facebook', 'group', 'tiktok', 'x', 'discord', 'spotify', 'podcast', 'messenger'];
const RULES = {
  prefetch: [{
    where: {
      and: [
        { href_matches: '/*' },
        { not: { href_matches: ['/api/*', '/stats*', '/email*', '/contact*', '/assets/*', '/data/*', '/fonts/*', ...SHORT.map((s) => `/${s}`), ...SHORT.map((s) => `/${s}/`)] } },
        { not: { selector_matches: '[target=_blank], [download], [rel~=nofollow]' } },
      ],
    },
    eagerness: 'moderate',
  }],
};
const RULES_TAG = `<script type="speculationrules">${JSON.stringify(RULES)}</script>`;

let n = 0;
for await (const f of walk(ROOT, ['.html'])) {
  const s = await readFile(f, 'utf8');
  const dir = path.dirname(f);
  const re = /((?:href|src)=")((?!https?:|\/\/|data:)[^"?#]+\.(?:css|js))(?:\?v=[\w]+)?(")/g;
  let out = '', last = 0;
  for (const m of s.matchAll(re)) {
    const url = m[2];
    const file = url.startsWith('/') ? path.join(ROOT, url) : path.join(dir, url);
    const h = await stamp(file);
    out += s.slice(last, m.index) + m[1] + url + (h ? `?v=${h}` : '') + m[3];
    last = m.index + m[0].length;
  }
  out += s.slice(last);
  if (!out.includes('type="speculationrules"') && out.includes('</body>')) out = out.replace('</body>', `${RULES_TAG}\n</body>`);
  if (out !== s) { await writeFile(f, out); n++; }
}
console.log(`Đã đóng dấu phiên bản (theo nội dung file) và chèn tải trước cho ${n} trang.`);
