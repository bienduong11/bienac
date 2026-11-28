// Điểm đố vui, không có tên người chơi: POST {game:'do-vui', score} → lưu điểm, trả về bảng phân bố
// để trang báo "bạn hơn X% người chơi". GET ?game=do-vui → bảng phân bố.
import { sameSite, human, who, json } from '../../lib/guard.js';
const GAMES = { 'do-vui': 10 };

async function dist(env, game) {
  const rows = await env.DB.prepare('SELECT score, COUNT(*) AS n FROM scores WHERE game = ? GROUP BY score').bind(game).all().catch(() => null);
  const d = new Array(GAMES[game] + 1).fill(0);
  if (rows) for (const r of rows.results) if (d[r.score] !== undefined) d[r.score] = r.n;
  return d;
}
export async function onRequestGet({ request, env }) {
  const game = new URL(request.url).searchParams.get('game') || 'do-vui';
  if (!env.DB || !(game in GAMES)) return json({ ok: false }, 400);
  return json({ ok: true, dist: await dist(env, game) }, 200, 'public, max-age=60');
}
export async function onRequestPost({ request, env }) {
  if (!env.DB || !sameSite(request)) return json({ ok: false }, 403);
  let f; try { f = await request.json(); } catch { return json({ ok: false }, 400); }
  const game = String(f.game || ''), score = Number(f.score);
  if (!(game in GAMES) || !Number.isInteger(score) || score < 0 || score > GAMES[game]) return json({ ok: false }, 400);
  if (human(request)) {
    const me = await who(request, 'score'), now = Date.now();
    // Mỗi người tối đa 20 lượt / giờ, để không ai bơm điểm.
    const lim = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE who = ? AND ts > ?').bind(me, now - 3600000).first().catch(() => null);
    if (!lim || lim.n < 20) await env.DB.prepare('INSERT INTO scores (game, score, ts, who) VALUES (?, ?, ?, ?)').bind(game, score, now, me).run().catch(() => {});
  }
  return json({ ok: true, dist: await dist(env, game) });
}
