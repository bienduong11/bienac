#!/usr/bin/env node
/* =====================================================================
 * Dựng ảnh chia sẻ 1200×630 (assets/og/<name>.jpg) theo khuôn chung của
 * bienac.com: logo + BIENAC.COM + tiêu đề + phụ đề bên trái, ảnh chụp
 * trang thật trong khung bo tròn bên phải.
 *
 * Cách dùng:
 *   node scripts/og-card.mjs <name> <đường dẫn trang> "<Tiêu đề>" "<Phụ đề>"
 *   ví dụ: node scripts/og-card.mjs nguyen-to /elements.html "Bảng tuần hoàn" "118 nguyên tố, mỗi ô một hiệu ứng"
 * Cần Playwright + Chromium (có sẵn trong máy của Claude).
 * ===================================================================== */
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [name, page, title, sub, site = 'https://bienac.com'] = process.argv.slice(2);
if (!name || !page || !title) { console.error('node scripts/og-card.mjs <name> <path> "<title>" "<subtitle>"'); process.exit(1); }

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/home/claude/x.js')('playwright')); }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const b = await chromium.launch();

// 1. Chụp trang thật (khung máy tính), đợi hiệu ứng chạy một chút.
const shotCtx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Macintosh) Chrome/120 bienac-theo-doi' });
const sp = await shotCtx.newPage();
await sp.goto(site + page, { waitUntil: 'load', timeout: 45000 });
await sp.waitForTimeout(3500);
const shot = (await sp.screenshot({ type: 'jpeg', quality: 88 })).toString('base64');
await shotCtx.close();

// 2. Ghép khuôn.
const logo = (await readFile(path.join(ROOT, 'assets', 'logo-192.webp'))).toString('base64');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/css/fonts.css" />
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:radial-gradient(120% 140% at 0% 0%,#0d1a1a 0%,#06070b 55%);font-family:'Be Vietnam Pro',sans-serif;color:#ece6d6}
  .l{position:absolute;left:64px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center}
  .brand{display:flex;align-items:center;gap:16px;margin-bottom:36px}
  .brand img{width:56px;height:56px;filter:drop-shadow(0 0 14px rgba(55,240,207,.55))}
  .brand span{font:600 26px 'Chakra Petch',monospace;letter-spacing:.18em;color:#37f0cf}
  h1{font-weight:700;font-size:${title.length > 18 ? 50 : 60}px;line-height:1.12;margin:0 0 22px}
  p{font-weight:500;font-size:25px;line-height:1.5;margin:0;color:rgba(236,230,214,.72)}
  .r{position:absolute;left:580px;top:70px;width:700px;height:466px;border-radius:26px;overflow:hidden;border:1px solid rgba(236,230,214,.14);box-shadow:0 30px 80px rgba(0,0,0,.6)}
  .r img{width:100%;height:100%;object-fit:cover;object-position:left top;display:block}
</style></head><body>
<div class="l"><div class="brand"><img src="data:image/webp;base64,${logo}"><span>BIENAC.COM</span></div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
<div class="r"><img src="data:image/jpeg;base64,${shot}"></div>
</body></html>`;
const ctx = await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
await pg.setContent(html, { waitUntil: 'networkidle' }).catch(() => {});
await pg.evaluate(() => document.fonts.ready);
const out = path.join(ROOT, 'assets', 'og', `${name}.jpg`);
await writeFile(out, await pg.screenshot({ type: 'jpeg', quality: 86 }));
await b.close();
console.log('Đã dựng', path.relative(ROOT, out));
