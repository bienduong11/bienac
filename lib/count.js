// Ghi một lượt vào D1 (binding DB). Không lưu IP; chỉ đường dẫn, nguồn, quốc gia, loại máy.
export function device(ua = '') {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return /Mobi/i.test(ua) ? 'mobile' : 'desktop';
}
export function refHost(r = '') {
  try { return new URL(r).hostname.replace(/^www\./, '').slice(0, 80); } catch { return r ? 'app' : ''; }
}
export function record(context, path, kind, ref) {
  const { request, env } = context;
  if (!env.DB) return;
  const stmt = env.DB.prepare('INSERT INTO clicks (ts, path, kind, ref, country, device) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(Date.now(), String(path).slice(0, 120), kind, refHost(ref), (request.cf && request.cf.country) || '', device(request.headers.get('user-agent') || ''));
  context.waitUntil(stmt.run().catch(() => {}));
}
