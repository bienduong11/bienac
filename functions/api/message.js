// Tin nhắn từ trang /email: lưu vào D1, trả nội dung để trình duyệt chuyển tới hộp thư qua FormSubmit.
const TO = 'bienacvn@gmail.com';
export async function onRequestPost(context) {
  const { request, env } = context;
  // Chỉ nhận từ chính trang bienac.com (chặn web khác gửi hộ).
  const origin = request.headers.get('origin') || '';
  if (origin && !/^https:\/\/(www\.)?bienac\.com$|^https:\/\/[\w-]+\.bienac\.pages\.dev$|^http:\/\/localhost(:\d+)?$/.test(origin)) return Response.json({ ok: false }, { status: 403 });
  let f;
  try { f = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  if (f.website) return Response.json({ ok: true });               // ô bẫy: máy spam điền vào
  const name = String(f.name || '').trim().slice(0, 120);
  const contact = String(f.contact || '').trim().slice(0, 200);
  const body = String(f.body || '').trim().slice(0, 5000);
  if (body.length < 2) return Response.json({ ok: false, error: 'empty' }, { status: 400 });
  const country = (request.cf && request.cf.country) || '';
  let id = null;
  if (env.DB) {
    // Giới hạn: mỗi người 3 tin / 10 phút, cả trang 40 tin / giờ. "who" là mã băm IP theo ngày, không lưu IP thật.
    const who = await hash((request.headers.get('cf-connecting-ip') || '') + new Date().toISOString().slice(0, 10));
    const now = Date.now();
    const lim = await env.DB.prepare('SELECT SUM(who = ?1 AND ts > ?2) AS mine, COUNT(*) AS all1h FROM messages WHERE ts > ?3')
      .bind(who, now - 600000, now - 3600000).first().catch(() => null);
    if (lim && (lim.mine >= 3 || lim.all1h >= 40)) return Response.json({ ok: false, error: 'rate' }, { status: 429 });
    const r = await env.DB.prepare('INSERT INTO messages (ts, name, contact, body, country, who) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(now, name, contact, body, country, who).run().catch(() => null);
    id = r && r.meta ? r.meta.last_row_id : null;
  }
  // FormSubmit chặn yêu cầu gửi từ máy chủ Cloudflare, nên trình duyệt người gửi chuyển thư (xem email/index.html).
  return Response.json({ ok: true, forwarded: false, payload: payload(name, contact, body, country), id });
}

export const payload = (name, contact, body, country) => ({
  _subject: `Tin nhắn từ bienac.com${name ? ' · ' + name : ''}`, _template: 'box', _captcha: 'false',
  'Tên': name, 'Liên hệ lại': contact, 'Nội dung': body, 'Quốc gia': country,
});

// Trình duyệt báo đã tự gửi được.
export async function onRequestPut({ request, env }) {
  try { const { id } = await request.json(); if (env.DB && id) await env.DB.prepare('UPDATE messages SET forwarded = 2 WHERE id = ?').bind(Number(id)).run(); } catch {}
  return new Response(null, { status: 204 });
}

async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bienac:' + s));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}
