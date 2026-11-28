import { record } from '../../lib/count.js';
// Trang gửi về khi được mở: navigator.sendBeacon('/api/hit', JSON {p, r}).
// Từ 28/11/2026 thêm 14 trang mới và lượt chạm trên /community, /shop.
// Từ 21/11/2026 đếm thêm trang chủ (/), lượt chạm ô trên trang chủ (/home/tap/<ô>) và từng ứng dụng, để biết ô nào có người dùng.
const APPS = 'do-vui|mang-tri-thuc|thang-vu-tru|lich-vu-tru|he-mat-troi|hanh-tinh|bau-troi|moi-giay|elements|phenomena|pho-anh-sang|ngon-lua|tron-mau|hai-khe|phong-xa|su-song|dan-chim|canh-buom|con-lac|galton|chiet-tu|am-lich|kinh-dich|he-dem|dong-thoi-gian|thegioi|bat-dau|pendulum-wave|orbits|fourier|mandelbrot|ripple|turing|gas|pi|light-speed|cipher|glossary|today|community|shop|bai-viet';
const OK = new RegExp(`^/(v/[a-z0-9-]+/?|support/?|support/tap/[a-z0-9-]{1,30}|email/?|home/tap/[a-z0-9-]{1,30}|(community|shop)/tap/[a-z0-9-]{1,30}|(${APPS})/?)?$`);
export async function onRequestPost(context) {
  try {
    const { p, r } = JSON.parse(await context.request.text());
    if (typeof p === 'string' && OK.test(p)) record(context, p === '/' ? '/' : p.replace(/\/$/, ''), 'page', r || '');
  } catch {}
  return new Response(null, { status: 204 });
}
