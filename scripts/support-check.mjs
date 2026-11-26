#!/usr/bin/env node
/* =====================================================================
 * Kiểm tra sâu trang ủng hộ bienac.com/support (GitHub Actions, mỗi ngày và sau mỗi lần sửa support/).
 * Từ 26/11/2026 trang chỉ còn: mã QR + số tài khoản BIDV, MoMo, PayPal, Hội viên YouTube, Patreon
 * (bỏ lưới ngân hàng và deeplink VietQR theo quyết định của Bien).
 *  1. Trang có đủ số tài khoản, tên, mã QR (SVG + PNG), các link MoMo / PayPal / Hội viên / Patreon.
 *  2. MoMo mở ra đúng tên "Dương Văn Biên", PayPal sống, trang Hội viên và Patreon không lỗi.
 *  3. Chuỗi VietQR mà trang tự tạo đúng định dạng (BIDV 970418, số tài khoản, CRC).
 * Lỗi thì ghi support-check.md và thoát mã 1 để workflow mở issue.
 * Chạy tay: node scripts/support-check.mjs [https://bienac.com]
 * ===================================================================== */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.argv[2] || 'https://bienac.com').replace(/\/$/, '');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 bienac-theo-doi';
const fails = [], notes = [];
const get = async (url, ua = 'Mozilla/5.0 (compatible; bienac-theo-doi/1.0)') => {
  for (let i = 0; i < 2; i++) {
    try { return await fetch(url, { headers: { 'user-agent': ua, accept: 'text/html,*/*;q=0.8', 'accept-language': 'vi-VN,vi;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(20000) }); }
    catch (e) { if (i) throw e; await new Promise((r) => setTimeout(r, 3000)); }
  }
};

// 1. Trang thật
const html = await (await get(SITE + '/support/')).text();
const ACC = Object.fromEntries([...(html.match(/const ACC = \{([^}]+)\}/) || ['', ''])[1].matchAll(/(\w+): '([^']*)'/g)].map((m) => [m[1], m[2]]));
if (ACC.number !== '4506285887' || ACC.holder !== 'DUONG VAN BIEN' || ACC.bank !== 'bidv') fails.push(`- Khối ACC trên trang sai hoặc mất: ${JSON.stringify(ACC)}`);
const LINKS = { momo: 'https://me.momo.vn/bienac', paypal: 'https://paypal.me/bienac', member: 'https://youtube.com/@Bienac/join', patreon: 'https://patreon.com/bienac/join' };
for (const [k, u] of Object.entries(LINKS)) if (!html.includes(`href="${u}"`)) fails.push(`- Trang không còn nút ${k} (${u}).`);
for (const f of ['/assets/qr-bidv.svg', '/assets/qr-bidv.png', '/js/vendor/qrcode-generator.min.js']) {
  const r = await get(SITE + f).catch(() => null);
  if (!r || r.status !== 200) fails.push(`- ${f} không tải được (mã ${r ? r.status : 'lỗi'}).`);
}

// 2. Đích các nút
const momo = await (await get(LINKS.momo, IOS)).text().catch(() => '');
if (!/Dương Văn Biên/.test(momo)) fails.push(`- MoMo ${LINKS.momo}: không thấy tên "Dương Văn Biên".`);
for (const k of ['paypal', 'member', 'patreon']) {
  const r = await get(LINKS[k], IOS).catch(() => null);
  // 401/403/429 là tường chống bot (Patreon chặn máy), không phải link hỏng.
  if (!r || r.status === 404 || r.status === 410 || r.status >= 500) fails.push(`- ${k} ${LINKS[k]}: mã ${r ? r.status : 'lỗi'}.`);
}

// 3. Chuỗi VietQR (chép đúng thuật toán trên trang)
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
const crc16 = (str) => { let c = 0xffff; for (const ch of new TextEncoder().encode(str)) { c ^= ch << 8; for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff; } return c.toString(16).toUpperCase().padStart(4, '0'); };
const p = tlv('00', '01') + tlv('01', '11') + tlv('38', tlv('00', 'A000000727') + tlv('01', tlv('00', '970418') + tlv('01', '4506285887')) + tlv('02', 'QRIBFTTA')) + tlv('53', '704') + tlv('58', 'VN') + '6304';
const qr = p + crc16(p);
if (qr !== '00020101021138540010A00000072701240006970418011045062858870208QRIBFTTA53037045802VN6304A2F2') fails.push('- Chuỗi VietQR khác bản đã kiểm ngày 19/11/2026.');
if (!html.includes("tlv('01', tlv('00', '970418') + tlv('01', ACC.number))")) fails.push('- Đoạn tạo mã VietQR trên trang đã bị đổi, cần kiểm lại mã QR.');
notes.push(`Mã VietQR: ${qr}.`);

const stamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
if (fails.length) {
  const report = `Kiểm tra trang ủng hộ lúc ${stamp} (giờ Việt Nam), ${fails.length} vấn đề:\n\n${fails.join('\n')}\n\n${notes.join(' ')}\n`;
  await writeFile(path.join(ROOT, 'support-check.md'), report);
  console.error(report);
  process.exit(1);
}
console.log(`Trang ủng hộ ổn (${stamp}). ${notes.join(' ')}`);
