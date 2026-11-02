// Tin nhắn từ trang /email: lưu vào D1, trả nội dung để trình duyệt chuyển tới hộp thư qua FormSubmit.
const TO = 'bienacvn@gmail.com';
export async function onRequestPost(context) {
  const { request, env } = context;
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
    const r = await env.DB.prepare('INSERT INTO messages (ts, name, contact, body, country) VALUES (?, ?, ?, ?, ?)')
      .bind(Date.now(), name, contact, body, country).run().catch(() => null);
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
