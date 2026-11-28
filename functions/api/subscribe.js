// Đăng ký nhận tin: POST {email, src}. Chỉ lưu địa chỉ vào D1 (bảng subscribers); chưa gửi thư tự động.
// Bien xuất danh sách khi cần báo tin (mở cửa hàng, video mới).
import { sameSite, human, who, json, clean } from '../../lib/guard.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB || !sameSite(request) || !human(request)) return json({ ok: false }, 403);
  let f; try { f = await request.json(); } catch { return json({ ok: false }, 400); }
  if (f.website) return json({ ok: true });                       // ô bẫy
  const email = String(f.email || '').trim().toLowerCase().slice(0, 160);
  if (!/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/.test(email)) return json({ ok: false, error: 'email' }, 400);
  const me = await who(request, 'sub'), now = Date.now();
  const lim = await env.DB.prepare('SELECT SUM(who = ?1 AND ts > ?2) AS mine, SUM(ts > ?3) AS all1h FROM subscribers').bind(me, now - 86400000, now - 3600000).first().catch(() => null);
  if (lim && (lim.mine >= 5 || lim.all1h >= 200)) return json({ ok: false, error: 'rate' }, 429);
  await env.DB.prepare('INSERT OR IGNORE INTO subscribers (email, ts, src, country, who) VALUES (?, ?, ?, ?, ?)')
    .bind(email, now, clean(f.src, 30), (request.cf && request.cf.country) || '', me).run();
  return json({ ok: true });
}
