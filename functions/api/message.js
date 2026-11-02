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
  const forward = fetch(`https://formsubmit.co/ajax/${TO}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://bienac.com', Referer: 'https://bienac.com/email/' },
    body: JSON.stringify({ _subject: `Tin nhắn từ bienac.com${name ? ' · ' + name : ''}`, _template: 'box', _captcha: 'false', 'Tên': name, 'Liên hệ lại': contact, 'Nội dung': body, 'Quốc gia': country }),
  }).then(async (res) => {
    if (res.ok && env.DB && id) await env.DB.prepare('UPDATE messages SET forwarded = 1 WHERE id = ?').bind(id).run();
  }).catch(() => {});
  context.waitUntil(forward);
  return Response.json({ ok: true });
}
