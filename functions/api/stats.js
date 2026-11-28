// Số lượt theo đường dẫn: 1 ngày, 7 ngày, 30 ngày, tất cả. Không chứa thông tin cá nhân.
export async function onRequestGet({ env }) {
  if (!env.DB) return Response.json({ error: 'no db' }, { status: 500 });
  const now = Date.now(), d = 86400000;
  const { results } = await env.DB.prepare(
    `SELECT path, kind,
       SUM(ts > ?1) AS d1, SUM(ts > ?2) AS d7, SUM(ts > ?3) AS d30, COUNT(*) AS total,
       SUM(device IN ('ios','android','mobile')) AS mobile
     FROM clicks GROUP BY path, kind ORDER BY d30 DESC, total DESC`
  ).bind(now - d, now - 7 * d, now - 30 * d).all();
  const src = await env.DB.prepare(
    `SELECT ref, COUNT(*) AS n FROM clicks WHERE ts > ?1 GROUP BY ref ORDER BY n DESC LIMIT 12`
  ).bind(now - 30 * d).all();
  // Cộng đồng và cửa hàng: chỉ con số, không có email hay tên.
  const one = (sql) => env.DB.prepare(sql).first().then((r) => (r ? r.n : 0)).catch(() => 0);
  const [subs, votes, pending, ordersPending, ordersAll, plays] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM subscribers'), one('SELECT COUNT(*) AS n FROM votes'), one('SELECT COUNT(*) AS n FROM topics WHERE status = 0'),
    one("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'"), one('SELECT COUNT(*) AS n FROM orders'), one('SELECT COUNT(*) AS n FROM scores'),
  ]);
  const top = await env.DB.prepare(`SELECT t.grp, t.title, COUNT(v.who) AS n FROM topics t LEFT JOIN votes v ON v.topic_id = t.id WHERE t.status = 1 GROUP BY t.id ORDER BY t.grp DESC, n DESC`).all().catch(() => ({ results: [] }));
  return Response.json({ rows: results, sources: src.results, community: { subs, votes, pending, ordersPending, ordersAll, plays, top: top.results }, at: now }, { headers: { 'Cache-Control': 'no-store' } });
}
