#!/usr/bin/env node
/* =====================================================================
 * Kiểm tra sâu trang ủng hộ bienac.com/support (GitHub Actions, mỗi ngày).
 *  1. Danh sách app trên trang khớp danh sách deeplink VietQR hôm nay
 *     (app bị gỡ, app mới, cờ tự điền, app không có trên iOS).
 *  2. Từng deeplink mở được app trên iOS và Android.
 *  3. App tự điền vẫn được VietQR cấp "ticket" (thiếu là hết tự điền).
 *  4. Logo, mã QR, MoMo đúng tên, PayPal sống.
 * Lỗi thì ghi support-check.md và thoát mã 1 để workflow mở issue.
 * Chạy tay: node scripts/support-check.mjs [https://bienac.com]
 * ===================================================================== */
import { writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.argv[2] || 'https://bienac.com').replace(/\/$/, '');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';
const SKIP = ['acb-biz', 'vib'];          // cố ý không đưa lên trang (app doanh nghiệp, app VIB cũ trùng vib-2)

const fails = [], notes = [];
const get = async (url, ua = 'Mozilla/5.0 (compatible; bienac-theo-doi/1.0)', redirect = 'follow') => {
  for (let i = 0; i < 2; i++) {
    // Giả như trình duyệt mở trang (navigate): VietQR chỉ cấp ticket cho kiểu yêu cầu này.
    const headers = { 'user-agent': ua, accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'vi-VN,vi;q=0.9', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document', 'sec-fetch-site': 'cross-site' };
    try { return await fetch(url, { headers, redirect, signal: AbortSignal.timeout(20000) }); }
    catch (e) { if (i) throw e; await new Promise((r) => setTimeout(r, 3000)); }
  }
};

// 0. Đọc trang thật
const html = await (await get(SITE + '/support/')).text();
const APPS = JSON.parse(html.match(/const APPS = (\[.*?\]);/)[1]);
const NO_IOS = JSON.parse(html.match(/const NO_IOS = (\[.*?\]);/)[1].replace(/'/g, '"'));
const ACC = Object.fromEntries([...html.match(/const ACC = \{([^}]+)\}/)[1].matchAll(/(\w+): '([^']*)'/g)].map((m) => [m[1], m[2]]));
const BACK = (html.match(/const BACK = '([^']+)'/) || [])[1];
if (!BACK) fails.push('- Trang mất tham số url (BACK) của deeplink: không app nào tự điền được nữa.');
const q = `ba=${ACC.number}@${ACC.bank}&tn=${encodeURIComponent(ACC.memo)}&bn=${encodeURIComponent(ACC.holder)}&url=${encodeURIComponent(BACK || '')}`;

// 1. So với danh sách VietQR hôm nay
const api = async (os) => (await (await get(`https://api.vietqr.io/v2/${os}-app-deeplinks`)).json()).apps;
const A = Object.fromEntries((await api('android')).map((x) => [x.appId, x]));
const I = Object.fromEntries((await api('ios')).map((x) => [x.appId, x]));
const onPage = new Set(APPS.map((a) => a[0]));
for (const [id, name, full] of APPS) {
  if (!A[id] && !I[id]) fails.push(`- ${name} (${id}): VietQR đã gỡ khỏi danh sách deeplink. Bỏ nút này.`);
  if (A[id] && !I[id] && !NO_IOS.includes(id)) fails.push(`- ${name} (${id}): không còn deeplink trên iOS, cần thêm vào NO_IOS.`);
  if (I[id] && NO_IOS.includes(id)) notes.push(`${name} đã có deeplink iOS, có thể bỏ khỏi NO_IOS.`);
  const af = Boolean((A[id] || I[id] || {}).autofill);
  if (af !== Boolean(full)) fails.push(`- ${name} (${id}): cờ tự điền trên trang = ${full}, VietQR hôm nay = ${af ? 1 : 0}. Sửa dấu ✓ và câu ghi chú.`);
}
const fresh = [...new Set([...Object.keys(A), ...Object.keys(I)])].filter((k) => !onPage.has(k) && !SKIP.includes(k));
if (fresh.length) fails.push(`- VietQR có app mới chưa có trên trang: ${fresh.map((k) => `${(A[k] || I[k]).appName} (${k}${(A[k] || I[k]).autofill ? ', tự điền' : ''})`).join(', ')}`);

// 2–3. Từng deeplink
let ok = 0;
for (const [id, name, full] of APPS) {
  for (const [os, ua] of [['iOS', IOS], ['Android', AND]]) {
    if (os === 'iOS' && NO_IOS.includes(id)) continue;
    try {
      // Gọi bằng curl: VietQR nhận ra fetch của Node là máy và không cấp ticket, curl thì giống trình duyệt hơn.
      const { stdout } = await run('curl', ['-s', '-m', '20', '-A', ua, '-w', '\n@@%{http_code} %{redirect_url}', `https://dl.vietqr.io/pay?app=${id}&${q}`], { maxBuffer: 4e6 });
      const cut = stdout.lastIndexOf('\n@@');
      const body = stdout.slice(0, cut);
      const [code, loc = ''] = stdout.slice(cut + 3).split(' ');
      const r = { status: Number(code) };
      const opens = (r.status === 302 && loc.startsWith('intent://')) || /"fallback":"[^"]*:\/\//.test(body);
      if (!opens) { fails.push(`- ${name} trên ${os}: deeplink không mở app (mã ${r.status}).`); continue; }
      if (full && !/"ticket":"/.test(body)) fails.push(`- ${name} trên ${os}: VietQR không cấp ticket, app sẽ KHÔNG tự điền.`);
      ok++;
    } catch (e) { fails.push(`- ${name} trên ${os}: lỗi kết nối VietQR (${e.message}).`); }
  }
}
notes.push(`${ok} deeplink chạy tốt.`);

// 4. Logo, MoMo, PayPal
for (const [id, name] of APPS) {
  const r = await get(`${SITE}/assets/banks/${id}.webp`).catch(() => null);
  if (!r || r.status !== 200 || !/image\/webp/.test(r.headers.get('content-type') || '')) fails.push(`- Logo ${name} (${id}.webp) không tải được.`);
}
const momo = await (await get(ACC.momo, IOS)).text().catch(() => '');
if (!/Dương Văn Biên/.test(momo)) fails.push(`- MoMo ${ACC.momo}: không thấy tên "Dương Văn Biên".`);
const pp = await get(ACC.paypal, IOS).catch(() => null);
if (!pp || pp.status !== 200) fails.push(`- PayPal ${ACC.paypal}: mã ${pp ? pp.status : 'lỗi'}.`);

const stamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
if (fails.length) {
  const report = `Kiểm tra trang ủng hộ lúc ${stamp} (giờ Việt Nam), ${fails.length} vấn đề:\n\n${fails.join('\n')}\n\n${notes.join(' ')}\n`;
  await writeFile(path.join(ROOT, 'support-check.md'), report);
  console.error(report);
  process.exit(1);
}
console.log(`Trang ủng hộ ổn (${stamp}). ${notes.join(' ')}`);
