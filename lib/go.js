import { LINKS } from './links.js';
import { record } from './count.js';
// Chuyển hướng 302 ngay, ghi lượt bấm chạy nền (không làm chậm việc chuyển).
export const go = (name) => async (context) => {
  const to = LINKS[name];
  record(context, '/' + name, 'link', context.request.headers.get('referer') || '');
  return new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store' } });
};
