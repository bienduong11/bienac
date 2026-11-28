# bienac.com

Website của kênh YouTube **Bienac** (khoa học, lịch sử, tiếng Việt). Trang tĩnh HTML/CSS/JS thuần,
chạy trên **Cloudflare Pages** kèm vài Pages Functions và một cơ sở dữ liệu D1 để đếm lượt.

> Quy tắc vàng: mọi đường dẫn đã ghi vào mô tả YouTube (`/v/<slug>`, `/support`, `/dk`, link mạng xã hội…)
> **không bao giờ được đổi hoặc xóa**. Đường dẫn và tên file mới đặt bằng tiếng Anh.

## Dựng và triển khai

- Đẩy lên nhánh `master` là Cloudflare Pages tự dựng và đưa lên bienac.com (khoảng 1 phút).
- Lệnh dựng: `npm run build` = `fetch-videos` → `build-posts` → `dong-dau`.
  - `scripts/fetch-videos.mjs`: lấy danh sách video của kênh (RSS) vào `data/videos.json`, `data/tat-ca-video.json`.
  - `scripts/build-posts.mjs`: dựng trang video `/v/<slug>/` từ `content/videos/*.json` (và bài cũ trong `posts/`),
    sinh `_redirects`, `sitemap.xml`, mục lục, mô tả YouTube. Chạy `--strict` để dừng khi dữ liệu sai.
  - `scripts/dong-dau.mjs`: gắn `?v=<mã commit>` cho CSS/JS lúc dựng. **Không** commit các dấu `?v=` vào mã nguồn.
- `_headers`: bảo mật (HSTS, chặn nhúng trang, CSP cơ bản) và thời gian lưu đệm. Cloudflare để
  Browser Cache TTL = "Respect Existing Headers".

## Cấu trúc chính

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang chủ: 30 ô ứng dụng, tìm kiếm, nền mưa nhị phân + WebGL, Đề xuất (giscus), Ủng hộ |
| `v/<slug>/` (sinh ra) | Trang tài liệu cho từng video: tóm tắt, chương, nguồn, đính chính. Dữ liệu ở `content/videos/` |
| `support/` | Trang ủng hộ: mã QR + số tài khoản BIDV, MoMo, PayPal, Hội viên YouTube. Trang quan trọng nhất |
| `email/` | Gửi thư cho Bienac |
| `stats/` | Thống kê lượt (nội bộ, không lên Google) |
| `functions/` | Link ngắn mạng xã hội có đếm lượt; `api/hit`, `api/message`, `api/stats` |
| `lib/` | Danh sách link (`links.js`), đếm lượt, chuyển hướng |
| 30 thư mục ứng dụng | `thang-vu-tru/`, `chiet-tu/`, `am-lich/`, `ngon-lua/`… mỗi ứng dụng một thư mục, nền riêng qua `data-nen` |
| `elements.html`, `phenomena.html`, `thegioi/` | Bảng tuần hoàn, hiện tượng vật lý, quả địa cầu lịch sử |
| `js/` | `effects.js` (WebGL), `nen-logo.js` (mưa nhị phân), `nen-ung-dung.js` (nền ứng dụng), `nhac-nen.js` (nhạc ambient), `tim-kiem.js` |
| `css/` | `style.css` → `theme.css` → `ung-dung.css` |

## Tự động hóa (GitHub Actions)

| Workflow | Việc |
|---|---|
| `cap-nhat-video.yml` | 6 tiếng một lần cập nhật danh sách video |
| `kiem-tra.yml` | Mỗi lần đẩy code: dựng nghiêm ngặt, kiểm cú pháp Functions; lỗi thì mở issue |
| `theo-doi.yml` | Ngay sau mỗi lần Cloudflare Pages dựng xong và theo lịch 30 phút (GitHub thực tế chỉ chạy 3–4 lần/ngày): kiểm mọi link trong mô tả YouTube, trang ủng hộ, tên miền; lỗi thì mở issue |
| `support-check.yml` | Kiểm sâu trang `/support` mỗi ngày và sau mỗi lần sửa |

## Hiệu năng

- Máy yếu / điện thoại / tiết kiệm dữ liệu: WebGL và mưa nhị phân tự giảm khung hình, độ phân giải.
- Máy không có tăng tốc đồ họa: nền WebGL chỉ vẽ một khung tĩnh. Máy không theo kịp thì tự hạ độ phân giải, cuối cùng đứng hình.
- Shader biên dịch sau khi trang hiện xong.
- Font tự lưu trong `fonts/` (`css/fonts.css`): Be Vietnam Pro cho chữ, JetBrains Mono cho số; không gọi Google Fonts (trừ Noto Serif TC ở vài trang chữ Hán).
- Trên Cloudflare Pages, `scripts/dong-dau.mjs` thu gọn CSS/JS, gắn `?v=<mã băm nội dung>`, chèn speculation rules tải trước trang.

## Thêm từ 28/11/2026

- **Ứng dụng mới (slug tiếng Anh):** `pendulum-wave`, `orbits`, `fourier`, `mandelbrot`, `ripple`, `turing`, `gas`, `pi`, `light-speed`, `cipher`. Dùng khuôn chung `css/sim.css` + `js/sim.js` (hàm `Sim.stage`, `Sim.loop`, `Sim.pos`, `Sim.vi`).
- **Thư viện:** `/glossary/` (dữ liệu `data/glossary.json`), `/today/` (dữ liệu `data/today.json`, mỗi dòng `[tháng, ngày, năm, nội dung]`).
- **Cộng đồng `/community/`:** bình chọn chủ đề video, đề xuất chủ đề (chờ duyệt), hỏi Bienac (dùng `/api/message`), đăng ký nhận tin.
- **Cửa hàng `/shop/`:** đang ở trạng thái "sắp ra mắt": bình chọn món muốn có + đăng ký nhận tin.
- **API mới** (Pages Functions, D1 `bienac-stats`, mã dùng chung `lib/guard.js`):
  - `/api/vote`: bảng `topics` (grp `video` | `shop`, status 1 = hiện, 0 = chờ duyệt) và `votes`.
    Duyệt đề xuất: `UPDATE topics SET status = 1 WHERE id = …`. Xem đề xuất chờ: `SELECT * FROM topics WHERE status = 0`.
  - `/api/subscribe`: bảng `subscribers` (email, ts, src). Chỉ lưu, chưa gửi thư tự động.
  - `/api/score`: bảng `scores` (điểm đố vui, không tên) để báo "bạn hơn X% người chơi".
- Thêm trang mới thì nhớ: ô trên `index.html`, danh sách `APPS` trong `functions/api/hit.js`, `js/tim-kiem.js`, sitemap trong `scripts/build-posts.mjs`, ảnh `assets/og/<slug>.jpg` (`node scripts/og-card.mjs`).
