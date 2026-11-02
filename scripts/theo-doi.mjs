#!/usr/bin/env node
/* =====================================================================
 * Theo dõi bienac.com (GitHub Actions chạy 30 phút một lần).
 * Kiểm mọi đường dẫn đã ghi vào mô tả YouTube: còn chạy, chuyển đúng chỗ,
 * trang ủng hộ còn đúng số tài khoản. Có lỗi thì thoát mã 1 và ghi báo cáo
 * vào theo-doi.md để workflow mở issue.
 * Chạy tay: node scripts/theo-doi.mjs [https://bienac.com]
 * ===================================================================== */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINKS } from '../lib/links.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.argv[2] || 'https://bienac.com').replace(/\/$/, '');
const SLOW_MS = 8000;

// Thông tin thanh toán phải luôn có trên /support. Đổi tài khoản thì sửa cả ở đây.
const PAY = { number: '4506285887', holder: 'DUONG VAN BIEN', bank: '@bidv' };
const QR_SHA256 = '7607d4807acab56190ebaff7d89bf904fdc9086f202334b657c612762fb3c74b'; // assets/qr-bidv.png

const fails = [];
const notes = [];
async function hit(p, { redirect = 'manual', expect, contains = [], header, sha } = {}) {
  const url = SITE + p;
  const t0 = Date.now();
  let res, body = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      res = await fetch(url, { redirect, headers: { 'user-agent': 'bienac-theo-doi/1.0 (+https://github.com/bienduong11/bienac)' }, signal: AbortSignal.timeout(15000) });
      if (res.status < 500) break;
    } catch (e) { res = { status: 0, error: e.message, headers: new Headers() }; }
    await new Promise((r) => setTimeout(r, 3000));       // thử lại một lần cho chắc, tránh báo động nhầm
  }
  const ms = Date.now() - t0;
  const bad = (why) => fails.push(`- \`${p}\`: ${why}`);
  if (!res.status) return bad(`không kết nối được (${res.error})`);
  if (expect && !expect(res.status)) bad(`mã ${res.status}`);
  if (header) for (const [k, v] of Object.entries(header)) {
    const got = res.headers.get(k) || '';
    if (v instanceof RegExp ? !v.test(got) : got !== v) bad(`header ${k} = "${got}"`);
  }
  if (contains.length || sha) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (sha && createHash('sha256').update(buf).digest('hex') !== sha) bad('nội dung file khác bản gốc');
    body = buf.toString('utf8');
    for (const c of contains) if (!body.includes(c)) bad(`thiếu "${c}"`);
  }
  if (ms > SLOW_MS) bad(`chậm ${ms} ms`);
  return res;
}
const ok200 = (s) => s === 200;
const redir = (s) => s === 301 || s === 302 || s === 308;

// 1. Trang chính
await hit('/', { expect: ok200, contains: ['Bienac'] });
await hit('/support/', { expect: ok200, contains: [PAY.number, PAY.holder, PAY.bank, '/assets/qr-bidv.svg'], header: { 'strict-transport-security': /max-age=\d{7,}/, 'x-frame-options': 'SAMEORIGIN' } });
await hit('/assets/qr-bidv.png', { expect: ok200, sha: QR_SHA256 });
await hit('/assets/qr-bidv.svg', { expect: ok200 });
await hit('/email/', { expect: ok200, contains: ['bienacvn@gmail.com'] });
await hit('/support', { expect: redir });
await hit('/email', { expect: redir });
await hit('/api/stats', { expect: ok200 });

// 2. Link mạng xã hội: phải chuyển đúng địa chỉ
for (const [name, to] of Object.entries(LINKS)) {
  const r = await hit('/' + name, { expect: (s) => s === 302 });
  if (r && r.headers && r.headers.get('location') !== to) fails.push(`- \`/${name}\`: chuyển tới "${r.headers.get('location')}" thay vì ${to}`);
}

// 3. Trang từng video (mọi file content/videos/*.json) và link cũ /v/<tên Việt>
let slugs = [];
try { slugs = (await readdir(path.join(ROOT, 'content', 'videos'))).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => f.slice(0, -5)); } catch {}
for (const s of slugs) await hit(`/v/${s}/`, { expect: ok200, contains: ['id="player-box"'] });
for (const f of (await readdir(path.join(ROOT, 'posts'))).filter((f) => f.endsWith('.md') && !f.startsWith('_'))) {
  const raw = await readFile(path.join(ROOT, 'posts', f), 'utf8');
  if (/^draft:\s*true/m.test(raw)) continue;
  const link = (raw.match(/^link:\s*(\S+)/m) || [])[1] || f.slice(0, -3);
  await hit(`/v/${link}`, { expect: redir });
}
notes.push(`${slugs.length} trang video, ${Object.keys(LINKS).length} link mạng xã hội.`);

const stamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
if (fails.length) {
  const report = `Kiểm tra lúc ${stamp} (giờ Việt Nam) thấy ${fails.length} lỗi trên ${SITE}:\n\n${fails.join('\n')}\n\n${notes.join(' ')}\n`;
  await writeFile(path.join(ROOT, 'theo-doi.md'), report);
  console.error(report);
  process.exit(1);
}
console.log(`Ổn cả (${stamp}). ${notes.join(' ')}`);
