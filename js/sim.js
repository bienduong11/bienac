/* Hàm dùng chung cho các trang mô phỏng mới (từ 28/11/2026). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // Gắn canvas vào khung .sim-stage: tự co theo khung, vẽ nét trên màn hình điểm ảnh dày.
  function stage(cv, onResize, maxDpr) {
    const box = cv.parentElement, S = { W: 0, H: 0, dpr: 1, g: cv.getContext('2d'), cv };
    const rs = () => {
      const r = box.getBoundingClientRect(); if (!r.width) return;
      S.dpr = Math.min(maxDpr || 2, window.devicePixelRatio || 1); S.W = r.width; S.H = r.height;
      cv.width = Math.round(r.width * S.dpr); cv.height = Math.round(r.height * S.dpr);
      S.g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); if (onResize) onResize(S);
    };
    new ResizeObserver(rs).observe(box); rs(); return S;
  }
  // Vòng lặp vẽ: tự dừng khi tab ẩn; dt tính bằng giây, chặn trên 0,05.
  function loop(fn) {
    let last = performance.now();
    const tick = (t) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; if (!document.hidden) fn(dt, t / 1000); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  // Tọa độ con trỏ trong canvas (đơn vị CSS).
  function pos(cv, e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  const vi = (n, d) => Number(n).toLocaleString('vi-VN', { maximumFractionDigits: d === undefined ? 0 : d, minimumFractionDigits: d === undefined ? 0 : d });
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.Sim = { $, stage, loop, pos, vi, still };
})();
