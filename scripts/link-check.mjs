#!/usr/bin/env node
/* =====================================================================
 * Kiểm link tài liệu tham khảo và tư liệu của mọi trang video
 * (content/videos/*.json). Chạy đầu mỗi tháng trên GitHub Actions.
 *
 * Chỉ báo link CHẾT THẬT: 404/410, mất tên miền/không kết nối được (sau 2 lần
 * thử), video YouTube bị gỡ (oEmbed 404). Bỏ qua 401/403/429 vì nhiều trang
 * (doi.org, Britannica, YouTube, Wikipedia…) chặn công cụ tự động nhưng người
 * thật vẫn vào được.
 * Có link chết thì ghi link-check.md và thoát mã 1 để workflow mở issue.
 * Sửa: thay bằng bản lưu Internet Archive (https://web.archive.org/web/<năm>/<url>)
 * hoặc nguồn tương đương, ghi rõ trong text.
 * ===================================================================== */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'content', 'videos');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const where = new Map();
for (const f of (await readdir(DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  const d = JSON.parse(await readFile(path.join(DIR, f), 'utf8'));
  for (const key of ['references', 'footage'])
    for (const it of d[key] || []) {
      const u = String(it.url || '').trim();
      if (!/^https?:\/\//.test(u)) continue;
      if (!where.has(u)) where.set(u, []);
      where.get(u).push(`${f.slice(0, -5)} (${key === 'references' ? 'nguồn' : 'tư liệu'}): ${String(it.text || '').slice(0, 70)}`);
    }
}

const ytId = (u) => !/^https?:\/\/web\.archive\.org\//.test(u) && (u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/) || [])[1];
async function status(u) {
  const id = ytId(u);
  const target = id ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}` : u;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(target, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*;q=0.8', 'accept-language': 'vi,en;q=0.8' }, signal: AbortSignal.timeout(25000) });
      r.body?.cancel().catch(() => {});
      if (id && r.status === 401) return 200;        // video có nhưng tắt nhúng
      if (r.status === 404 || r.status === 410) { if (i) return r.status; }
      else return r.status;
    } catch (e) { if (i) return 0; }
    await new Promise((r) => setTimeout(r, 4000));
  }
}

const urls = [...where.keys()];
const dead = [];
let next = 0;
await Promise.all(Array.from({ length: 12 }, async () => {
  while (next < urls.length) {
    const u = urls[next++];
    const s = await status(u);
    if (s === 404 || s === 410 || s === 0) dead.push([s, u]);
  }
}));

const stamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
if (dead.length) {
  const body = dead.sort((a, b) => a[1].localeCompare(b[1]))
    .map(([s, u]) => `- **${s || 'không kết nối được'}** ${u}\n${where.get(u).map((w) => `  - ${w}`).join('\n')}`).join('\n');
  const report = `Kiểm ${urls.length} link tài liệu/tư liệu lúc ${stamp} (giờ Việt Nam): ${dead.length} link chết.\n\n${body}\n\nCách sửa: thay bằng bản lưu Internet Archive hoặc nguồn tương đương trong content/videos/<slug>.json.\n`;
  await writeFile(path.join(ROOT, 'link-check.md'), report);
  console.error(report);
  process.exit(1);
}
console.log(`Ổn (${stamp}): ${urls.length} link, không có link chết.`);
