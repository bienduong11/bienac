// Tin nhắn từ trang /email: lưu vào D1 rồi chuyển tới hộp thư qua FormSubmit.
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
  // Chuyển thư qua FormSubmit, chờ tối đa 6 giây. Không được thì báo trình duyệt tự gửi.
  let forwarded = false;
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${TO}`, {
      method: 'POST',
      signal: AbortSignal.timeout(6000),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://bienac.com', Referer: 'https://bienac.com/email/' },
      body: JSON.stringify(payload(name, contact, body, country)),
    });
    const j = await res.json().catch(() => ({}));
    forwarded = String(j.success) === 'true';
  } catch {}
  if (forwarded && env.DB && id) context.waitUntil(env.DB.prepare('UPDATE messages SET forwarded = 1 WHERE id = ?').bind(id).run().catch(() => {}));
  return Response.json({ ok: true, forwarded, payload: forwarded ? null : payload(name, contact, body, country), id });
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
