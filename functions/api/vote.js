// Bình chọn: GET /api/vote?g=video|shop  → danh sách mục đã duyệt kèm số phiếu và phiếu của người xem.
//            POST {id}                   → bỏ (hoặc rút) một phiếu. Mỗi người một phiếu cho mỗi mục.
//            POST {g:'video', title}     → đề xuất mục mới; chờ Bien duyệt (status 0) rồi mới hiện.
// Bảng D1: topics (id, grp, title, note, status, ts, who), votes (topic_id, who, ts).
import { sameSite, human, who, json, clean } from '../../lib/guard.js';
const GROUPS = new Set(['video', 'shop']);

export async function onRequestGet({ request, env }) {
  const g = new URL(request.url).searchParams.get('g') || 'video';
  if (!env.DB || !GROUPS.has(g)) return json({ ok: false, items: [] }, 400);
  const me = await who(request, 'vote');
  const rows = await env.DB.prepare(
    `SELECT t.id, t.title, t.note, COUNT(v.who) AS n, SUM(v.who = ?2) AS mine
       FROM topics t LEFT JOIN votes v ON v.topic_id = t.id
      WHERE t.grp = ?1 AND t.status = 1 GROUP BY t.id ORDER BY n DESC, t.id ASC LIMIT 60`).bind(g, me).all().catch(() => null);
  return json({ ok: !!rows, items: rows ? rows.results.map((r) => ({ id: r.id, title: r.title, note: r.note, n: r.n, mine: !!r.mine })) : [] });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !sameSite(request) || !human(request)) return json({ ok: false }, 403);
  let f; try { f = await request.json(); } catch { return json({ ok: false }, 400); }
  const me = await who(request, 'vote'), now = Date.now();
  if (f.id) {
    const id = Number(f.id);
    const t = await env.DB.prepare('SELECT id FROM topics WHERE id = ? AND status = 1').bind(id).first().catch(() => null);
    if (!t) return json({ ok: false }, 404);
    const had = await env.DB.prepare('SELECT 1 AS x FROM votes WHERE topic_id = ? AND who = ?').bind(id, me).first().catch(() => null);
    if (had) await env.DB.prepare('DELETE FROM votes WHERE topic_id = ? AND who = ?').bind(id, me).run();
    else await env.DB.prepare('INSERT OR IGNORE INTO votes (topic_id, who, ts) VALUES (?, ?, ?)').bind(id, me, now).run();
    const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM votes WHERE topic_id = ?').bind(id).first();
    return json({ ok: true, id, n: c.n, mine: !had });
  }
  // Đề xuất mới: mỗi người 3 đề xuất / ngày, cả trang 60 / ngày.
  if (f.website) return json({ ok: true, pending: true });
  const g = String(f.g || ''), title = clean(f.title, 80);
  if (!GROUPS.has(g) || title.length < 2) return json({ ok: false, error: 'empty' }, 400);
  const lim = await env.DB.prepare('SELECT SUM(who = ?1) AS mine, COUNT(*) AS allday FROM topics WHERE status = 0 AND ts > ?2').bind(me, now - 86400000).first().catch(() => null);
  if (lim && (lim.mine >= 3 || lim.allday >= 60)) return json({ ok: false, error: 'rate' }, 429);
  await env.DB.prepare('INSERT INTO topics (grp, title, note, status, ts, who) VALUES (?, ?, ?, 0, ?, ?)').bind(g, title, clean(f.note, 160), now, me).run();
  // Trình duyệt người gửi chuyển thông báo tới hộp thư Bienac (FormSubmit), để Bien biết có đề xuất chờ duyệt.
  return json({ ok: true, pending: true, payload: { _subject: `Đề xuất mới (${g === 'shop' ? 'cửa hàng' : 'video'}): ${title}`, _template: 'box', _captcha: 'false', 'Đề xuất': title, 'Nhóm': g } });
}
