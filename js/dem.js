/* Đếm lượt mở trang (/, /v/…, /support, /email, các ứng dụng). Không cookie, không lưu IP. */
(() => { try { navigator.sendBeacon('/api/hit', JSON.stringify({ p: location.pathname, r: document.referrer })); } catch {} })();
