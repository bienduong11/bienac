/* =====================================================================
 * Nền động riêng cho từng ứng dụng. Mỗi trang đặt <body data-nen="…">:
 *   sao    trời sao lấp lánh, tinh vân trôi        (vũ trụ)
 *   muc    vệt mực loang chậm trên giấy tối        (chữ Hán, lịch sử)
 *   trang  vầng trăng tỏa sáng giữa trời sao       (âm lịch)
 *   hao    vạch âm dương rơi chậm                  (Kinh Dịch)
 *   so     chữ số của nhiều nền văn minh bay lên   (hệ đếm)
 *   pho    dải màu quang phổ uốn lượn              (ánh sáng)
 *   song   gợn sóng lan từ hai điểm                (giao thoa)
 *   hat    hạt sáng lóe lên rồi tắt                (phóng xạ, đố vui)
 *   luoi   lưới ô sáng tắt                         (sự sống, xác suất)
 *   gio    vệt bay như đàn chim                    (tự tổ chức)
 *   luong  dòng chảy cuộn xoáy                     (hỗn loạn)
 * Nền nằm dưới mọi nội dung, tự dừng khi tab ẩn, đứng yên nếu người dùng
 * bật giảm chuyển động.
 * ===================================================================== */
(function () {
  'use strict';
  const mode = document.body.dataset.nen;
  if (!mode) return;
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
  document.body.prepend(cv);
  const g = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LITE = (matchMedia('(max-width: 760px)').matches || (navigator.connection && navigator.connection.saveData) || (navigator.hardwareConcurrency || 8) <= 4);
  let skip = 0;
  let W, H, DPR, t = 0, items = [];
  const R = Math.random;
  const C = { cyan: '55,240,207', brass: '201,166,80', red: '232,69,46', ivory: '236,230,214', blue: '120,150,255' };

  function size() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    init();
  }
  const area = () => (W * H) / (1280 * 800);

  function init() {
    items = [];
    const n = (k) => Math.round(k * Math.max(0.35, area()));
    if (mode === 'sao' || mode === 'trang') for (let i = 0; i < n(260); i++) items.push({ x: R() * W, y: R() * H, r: R() * 1.3 + 0.2, p: R() * 6.28, s: 0.5 + R() * 2 });
    if (mode === 'muc') for (let i = 0; i < 7; i++) items.push({ x: R() * W, y: R() * H, r: 160 + R() * 280, vx: (R() - 0.5) * 0.12, vy: (R() - 0.5) * 0.08, c: i % 3 === 0 ? C.brass : i % 3 === 1 ? C.cyan : C.red, a: 0.12 + R() * 0.1 });
    if (mode === 'hao') for (let i = 0; i < n(46); i++) items.push(hao(true));
    if (mode === 'so') for (let i = 0; i < n(70); i++) items.push(so(true));
    if (mode === 'hat') for (let i = 0; i < n(140); i++) items.push({ x: R() * W, y: R() * H, life: R(), v: 0.002 + R() * 0.006, r: 1 + R() * 2.2 });
    if (mode === 'luoi') { const s = 26; for (let y = 0; y < H / s + 1; y++) for (let x = 0; x < W / s + 1; x++) items.push({ x: x * s, y: y * s, on: R() < 0.06 ? R() : 0 }); }
    if (mode === 'gio') for (let i = 0; i < n(90); i++) items.push({ x: R() * W, y: R() * H, v: 0.6 + R() * 1.4, l: 10 + R() * 26, ph: R() * 6.28 });
    if (mode === 'luong') for (let i = 0; i < n(420); i++) items.push({ x: R() * W, y: R() * H, age: R() * 200 });
  }
  const HAO = (x, y, yin, a) => {
    g.fillStyle = `rgba(${C.brass},${a})`;
    if (yin) { g.fillRect(x, y, 26, 4); g.fillRect(x + 34, y, 26, 4); } else g.fillRect(x, y, 60, 4);
  };
  function hao(scatter) { return { x: R() * W, y: scatter ? R() * H : -10, yin: R() < 0.5, v: 0.15 + R() * 0.35, a: 0.1 + R() * 0.2, flip: 200 + R() * 600 }; }
  const DIGITS = ['0', '1', '7', '9', 'X', 'IV', 'M', '一', '二', '三', '萬', '百', '∞', 'π', '60', '20', '𒐕', '•••', '—'];
  function so(scatter) { return { x: R() * W, y: scatter ? R() * H : H + 30, ch: DIGITS[(R() * DIGITS.length) | 0], v: 0.15 + R() * 0.4, sz: 14 + R() * 30, a: 0.1 + R() * 0.2 }; }

  function frame() {
    if (document.hidden) { requestAnimationFrame(frame); return; }
    if (LITE && (skip ^= 1)) { requestAnimationFrame(frame); return; }   // máy yếu: vẽ cách khung
    t += LITE ? 2 : 1;
    g.clearRect(0, 0, W, H);
    draw[mode] && draw[mode]();
    if (!reduce) requestAnimationFrame(frame);
  }

  const draw = {
    sao() {
      const neb = g.createRadialGradient(W * (0.7 + 0.05 * Math.sin(t / 900)), H * 0.25, 0, W * 0.7, H * 0.25, Math.max(W, H) * 0.7);
      neb.addColorStop(0, 'rgba(55,240,207,0.14)'); neb.addColorStop(0.4, 'rgba(120,150,255,0.08)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb; g.fillRect(0, 0, W, H);
      const neb2 = g.createRadialGradient(W * 0.15, H * 0.85, 0, W * 0.15, H * 0.85, Math.max(W, H) * 0.5);
      neb2.addColorStop(0, 'rgba(232,69,46,0.1)'); neb2.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb2; g.fillRect(0, 0, W, H);
      for (const s of items) {
        const a = 0.35 + 0.55 * Math.abs(Math.sin(s.p + t * 0.01 * s.s));
        g.fillStyle = `rgba(${C.ivory},${a.toFixed(3)})`;
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
      }
    },
    trang() {
      draw.sao();
      const mx = W * 0.82, my = H * 0.2, mr = Math.min(W, H) * 0.09;
      const glow = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 5);
      glow.addColorStop(0, 'rgba(255,240,200,0.18)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(250,240,215,0.85)'; g.beginPath(); g.arc(mx, my, mr, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(6,7,11,0.88)'; g.beginPath(); g.arc(mx + mr * 0.45, my - mr * 0.1, mr * 0.95, 0, 6.283); g.fill();   // trăng khuyết
    },
    muc() {
      for (const b of items) {
        b.x += b.vx; b.y += b.vy;
        if (b.x < -b.r) b.x = W + b.r; if (b.x > W + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = H + b.r; if (b.y > H + b.r) b.y = -b.r;
        const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        gr.addColorStop(0, `rgba(${b.c},${b.a})`); gr.addColorStop(0.6, `rgba(${b.c},${b.a * 0.4})`); gr.addColorStop(1, `rgba(${b.c},0)`);
        g.fillStyle = gr; g.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      g.strokeStyle = 'rgba(201,166,80,0.08)'; g.lineWidth = 1;
      for (let x = 40; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }   // kẻ dọc như giấy viết chữ
    },
    hao() {
      for (const h of items) {
        h.y += h.v; if (--h.flip < 0) { h.yin = !h.yin; h.flip = 200 + R() * 600; }
        if (h.y > H + 10) Object.assign(h, hao(false));
        HAO(h.x, h.y, h.yin, h.a);
      }
    },
    so() {
      g.textAlign = 'center';
      for (const d of items) {
        d.y -= d.v; if (d.y < -40) Object.assign(d, so(false));
        g.font = `600 ${d.sz}px "JetBrains Mono", "Noto Serif TC", serif`;
        g.fillStyle = `rgba(${C.cyan},${d.a})`;
        g.fillText(d.ch, d.x, d.y);
      }
    },
    pho() {
      const hues = 7;
      for (let i = 0; i < hues; i++) {
        const y0 = H * (0.15 + i * 0.11) + Math.sin(t / 140 + i) * 30;
        g.beginPath(); g.moveTo(0, y0);
        for (let x = 0; x <= W; x += 24) g.lineTo(x, y0 + Math.sin(x / 180 + t / 90 + i * 0.7) * 40);
        g.lineTo(W, y0 + 70); g.lineTo(0, y0 + 70); g.closePath();
        g.fillStyle = `hsla(${(i / hues) * 280},90%,60%,0.09)`; g.fill();
      }
    },
    song() {
      const src = [[W * 0.18, H * 0.45], [W * 0.18, H * 0.6]];
      g.lineWidth = 1.2;
      for (const [sx, sy] of src) {
        for (let k = 0; k < 18; k++) {
          const r = ((t * 0.8 + k * 60) % 1100);
          g.strokeStyle = `rgba(${C.cyan},${(0.18 * (1 - r / 1100)).toFixed(3)})`;
          g.beginPath(); g.arc(sx, sy, r, -1.2, 1.2); g.stroke();
        }
      }
    },
    hat() {
      for (const p of items) {
        p.life += p.v; if (p.life > 1) { p.life = 0; p.x = R() * W; p.y = R() * H; }
        const a = Math.sin(p.life * Math.PI) * 0.6;
        g.fillStyle = `rgba(${C.cyan},${(a * 0.25).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r * 4, 0, 6.283); g.fill();
        g.fillStyle = `rgba(${C.mint || '179,255,236'},${a.toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      }
    },
    luoi() {
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
      for (let x = 0; x < W; x += 26) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
      for (let y = 0; y < H; y += 26) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      for (const c of items) {
        if (c.on > 0) { c.on -= 0.004; g.fillStyle = `rgba(${C.cyan},${(c.on * 0.4).toFixed(3)})`; g.fillRect(c.x + 3, c.y + 3, 20, 20); }
        else if (R() < 0.0006) c.on = 1;
      }
    },
    gio() {
      g.lineCap = 'round';
      for (const b of items) {
        b.x += b.v; b.y += Math.sin(t / 60 + b.ph) * 0.4;
        if (b.x > W + 40) { b.x = -40; b.y = R() * H; }
        g.strokeStyle = `rgba(${C.cyan},0.22)`; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(b.x - b.l, b.y); g.lineTo(b.x, b.y); g.stroke();
        g.fillStyle = `rgba(${C.ivory},0.3)`; g.beginPath(); g.arc(b.x, b.y, 1.4, 0, 6.283); g.fill();
      }
    },
    luong() {
      g.fillStyle = 'rgba(6,7,11,0.08)';
      for (const p of items) {
        const ang = Math.sin(p.x / 160 + t / 400) * 2 + Math.cos(p.y / 140 - t / 500) * 2;
        const nx = p.x + Math.cos(ang) * 1.2, ny = p.y + Math.sin(ang) * 1.2;
        g.strokeStyle = `rgba(${p.age % 3 < 1 ? C.red : C.cyan},0.3)`; g.lineWidth = 1;
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(nx, ny); g.stroke();
        p.x = nx; p.y = ny; p.age++;
        if (p.age > 260 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) { p.x = R() * W; p.y = R() * H; p.age = 0; }
      }
    },
  };

  // 'luong' vẽ vệt dài nên không xóa toàn màn mỗi khung
  if (mode === 'luong') {
    const orig = g.clearRect.bind(g);
    g.clearRect = (x, y, w, h) => { g.fillStyle = 'rgba(6,7,11,0.06)'; g.fillRect(x, y, w, h); };
    g.clearRect.orig = orig;
  }
  addEventListener('resize', size);
  size();
  requestAnimationFrame(frame);
})();
