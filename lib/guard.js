// Dùng chung cho các API nhận dữ liệu từ người xem (bình chọn, đăng ký nhận tin, điểm đố vui).
import { isBot } from './count.js';

const ORIGIN = /^https:\/\/(www\.)?bienac\.com$|^https:\/\/[\w-]+\.bienac\.pages\.dev$|^http:\/\/localhost(:\d+)?$/;
// Chỉ nhận từ chính trang bienac.com (chặn web khác gửi hộ).
export const sameSite = (request) => { const o = request.headers.get('origin') || ''; return !o || ORIGIN.test(o); };
export const human = (request) => !isBot(request.headers.get('user-agent') || '');
// Mã băm của IP (không lưu IP thật). salt đổi thì mã đổi, nên không ghép được giữa các bảng.
export async function who(request, salt = '') {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bienac:' + salt + ':' + (request.headers.get('cf-connecting-ip') || '')));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}
export const json = (data, status = 200, cache = 'no-store') => Response.json(data, { status, headers: { 'Cache-Control': cache } });
export const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
