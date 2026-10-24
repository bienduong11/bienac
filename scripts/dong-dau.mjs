#!/usr/bin/env node
/* =====================================================================
 * Đóng dấu phiên bản cho file CSS/JS nội bộ trong mọi trang HTML.
 *   href="/css/theme.css"  →  href="/css/theme.css?v=ab12cd3"
 * Mỗi lần dựng có mã mới, nên trình duyệt luôn tải đúng bản CSS/JS mới nhất,
 * không bị lệch giữa HTML mới và CSS cũ còn trong bộ nhớ đệm.
 * Chạy cuối cùng trong `npm run build`.
 * ===================================================================== */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const V = (process.env.CF_PAGES_COMMIT_SHA || Date.now().toString(36)).slice(0, 8);
const SKIP = new Set(['node_modules', '.git', '.github', 'libs']);

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

let n = 0;
for await (const f of htmlFiles(ROOT)) {
  const s = await readFile(f, 'utf8');
  // chỉ file nội bộ (không có giao thức), bỏ dấu cũ nếu có
  const out = s.replace(/((?:href|src)=")((?!https?:|\/\/)[^"?#]+\.(?:css|js))(?:\?v=[\w]+)?(")/g, (_, a, url, b) => `${a}${url}?v=${V}${b}`);
  if (out !== s) { await writeFile(f, out); n++; }
}
console.log(`Đã đóng dấu phiên bản ${V} cho ${n} trang.`);
