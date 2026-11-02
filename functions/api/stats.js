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
  return Response.json({ rows: results, sources: src.results, at: now }, { headers: { 'Cache-Control': 'no-store' } });
}
