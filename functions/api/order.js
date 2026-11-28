// Đặt hàng ở /shop/. Danh sách món lấy từ data/products.json (giá tính ở máy chủ, không tin giá trình duyệt gửi lên).
// POST {items:[{id, qty}], name, email, phone, address, note} → tạo đơn, trả {code, total, payload}.
//   Người mua quét QR chuyển khoản với nội dung = mã đơn. Bien đối chiếu sao kê rồi đổi trạng thái:
//   UPDATE orders SET status = 'paid' | 'sent' | 'cancelled' WHERE code = '…'
// GET ?code=BN… → {status, total} để người mua tự xem đơn tới đâu.
// Bảng D1: orders (code, ts, items, total, name, email, phone, address, note, status, country, who).
import { sameSite, human, who, json, clean } from '../../lib/guard.js';
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';     // bỏ các ký tự dễ nhầm (0/O, 1/I)

async function products(context) {
  try { const r = await context.env.ASSETS.fetch(new URL('/data/products.json', context.request.url)); const a = await r.json(); return Array.isArray(a) ? a.filter((p) => p && p.active !== false && Number.isInteger(p.price) && p.price > 0) : []; } catch { return []; }
}

export async function onRequestGet({ request, env }) {
  const code = (new URL(request.url).searchParams.get('code') || '').toUpperCase();
  if (!env.DB || !/^BN[A-Z0-9]{6}$/.test(code)) return json({ ok: false }, 400);
  const o = await env.DB.prepare('SELECT status, total, ts FROM orders WHERE code = ?').bind(code).first().catch(() => null);
  return o ? json({ ok: true, code, status: o.status, total: o.total, ts: o.ts }) : json({ ok: false }, 404);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB || !sameSite(request) || !human(request)) return json({ ok: false }, 403);
  let f; try { f = await request.json(); } catch { return json({ ok: false }, 400); }
  if (f.website) return json({ ok: true, code: 'BN000000', total: 0 });           // ô bẫy
  const list = await products(context), byId = new Map(list.map((p) => [p.id, p]));
  const items = []; let total = 0, needShip = false;
  for (const it of Array.isArray(f.items) ? f.items.slice(0, 30) : []) {
    const p = byId.get(String(it.id)), qty = Math.floor(Number(it.qty));
    if (!p || !(qty >= 1 && qty <= 20)) continue;
    items.push({ id: p.id, name: p.name, price: p.price, qty }); total += p.price * qty; if (p.kind === 'print') needShip = true;
  }
  if (!items.length) return json({ ok: false, error: 'empty' }, 400);
  const name = clean(f.name, 80), email = String(f.email || '').trim().toLowerCase().slice(0, 160), phone = clean(f.phone, 20), address = clean(f.address, 240), note = clean(f.note, 500);
  if (name.length < 2) return json({ ok: false, error: 'name' }, 400);
  if (!/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/.test(email)) return json({ ok: false, error: 'email' }, 400);
  if (needShip && (address.length < 10 || phone.replace(/\D/g, '').length < 9)) return json({ ok: false, error: 'ship' }, 400);
  const me = await who(request, 'order'), now = Date.now();
  // Mỗi người 5 đơn / giờ, cả trang 100 đơn / giờ.
  const lim = await env.DB.prepare('SELECT SUM(who = ?1) AS mine, COUNT(*) AS n FROM orders WHERE ts > ?2').bind(me, now - 3600000).first().catch(() => null);
  if (lim && (lim.mine >= 5 || lim.n >= 100)) return json({ ok: false, error: 'rate' }, 429);
  let code = '';
  for (let tries = 0; tries < 5; tries++) {
    const r = crypto.getRandomValues(new Uint8Array(6)); code = 'BN' + [...r].map((x) => ABC[x % ABC.length]).join('');
    const ok = await env.DB.prepare('INSERT OR IGNORE INTO orders (code, ts, items, total, name, email, phone, address, note, status, country, who) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(code, now, JSON.stringify(items), total, name, email, phone, address, note, 'pending', (request.cf && request.cf.country) || '', me).run().catch(() => null);
    if (ok && ok.meta && ok.meta.changes === 1) break; code = '';
  }
  if (!code) return json({ ok: false }, 500);
  // Trình duyệt người mua chuyển thông báo đơn tới hộp thư Bienac qua FormSubmit (như trang /email).
  const payload = { _subject: `Đơn hàng ${code} · ${total.toLocaleString('vi-VN')} đ`, _template: 'box', _captcha: 'false', 'Mã đơn': code, 'Tổng tiền': total.toLocaleString('vi-VN') + ' đ', 'Món': items.map((i) => `${i.qty} × ${i.name}`).join('; '), 'Tên': name, 'Email': email, 'Điện thoại': phone, 'Địa chỉ': address, 'Ghi chú': note };
  return json({ ok: true, code, total, items, payload });
}
