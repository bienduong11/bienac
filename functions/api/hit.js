import { record } from '../../lib/count.js';
// Trang gửi về khi được mở: navigator.sendBeacon('/api/hit', JSON {p, r}).
const OK = /^\/(v\/[a-z0-9-]+\/?|support\/?|email\/?)$/;
export async function onRequestPost(context) {
  try {
    const { p, r } = JSON.parse(await context.request.text());
    if (typeof p === 'string' && OK.test(p)) record(context, p.replace(/\/$/, ''), 'page', r || '');
  } catch {}
  return new Response(null, { status: 204 });
}
