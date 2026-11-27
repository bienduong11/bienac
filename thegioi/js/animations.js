// Mỗi hoạt ảnh là một hàm (ctx, t, w, h): vẽ một khung hình tại thời điểm
// t giây (kể từ lúc mở modal) lên canvas kích thước logic w×h.
// Tất cả đều tất định theo t (random có seed) để chạy mượt và lặp ổn định.

const TAU = Math.PI * 2;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const lerp = (a, b, x) => a + (b - a) * x;
const easeOut = x => 1 - (1 - x) ** 3;
const easeIn = x => x * x * x;

function rnd(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function bgGrad(ctx, w, h, top, bottom, splitY = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, h * splitY);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawStars(ctx, w, h, t, n = 40, seed = 0, maxY = 0.65) {
  ctx.fillStyle = '#cfe3ff';
  for (let i = 0; i < n; i++) {
    const x = rnd(i + seed) * w;
    const y = rnd(i + 50 + seed) * h * maxY;
    ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(t * 1.5 + i * 2.7));
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function circle(ctx, x, y, r, fill, stroke, lw = 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function rrect(ctx, x, y, w, h, r, fill, stroke, lw = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function line(ctx, x1, y1, x2, y2, color, lw = 2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export const ANIMATIONS = {

  // ---------- Công cụ đá ----------
  stonetool(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#1c1510', '#0b0805');
    const cx = w / 2, groundY = h * 0.72;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(cx, groundY + 24, 120, 16, 0, 0, TAU); ctx.fill();
    // hòn đá lõi
    ctx.fillStyle = '#6d675e';
    ctx.beginPath();
    ctx.moveTo(cx - 55, groundY + 20); ctx.lineTo(cx - 40, groundY - 28);
    ctx.lineTo(cx + 10, groundY - 42); ctx.lineTo(cx + 52, groundY - 10);
    ctx.lineTo(cx + 40, groundY + 22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a453e'; ctx.lineWidth = 2; ctx.stroke();
    // các mảnh tước tích lại
    const chips = Math.min(9, Math.floor(t / 1.2));
    ctx.fillStyle = '#857e72';
    for (let i = 0; i < chips; i++) {
      const px = cx + (rnd(i) - 0.5) * 190, py = groundY + 14 + rnd(i + 4) * 14;
      ctx.beginPath();
      ctx.moveTo(px, py); ctx.lineTo(px + 9, py + 5); ctx.lineTo(px + 2, py + 8);
      ctx.closePath(); ctx.fill();
    }
    // hòn đá ghè: chu kỳ đập
    const p = (t % 1.2) / 1.2;
    const s = p < 0.3 ? easeIn(p / 0.3) : p < 0.5 ? 1 : 1 - easeOut((p - 0.5) / 0.5);
    const hx = cx + 60 - 45 * s, hy = h * 0.18 + (groundY - 60 - h * 0.18) * s;
    ctx.fillStyle = '#8a8378';
    ctx.beginPath(); ctx.ellipse(hx, hy, 26, 20, -0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5c574f'; ctx.stroke();
    // tia lửa / mảnh vỡ khi va chạm
    if (p > 0.3 && p < 0.55) {
      const k = (p - 0.3) / 0.25;
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
      ctx.globalAlpha = 1 - k;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (rnd(i + 20) - 0.5) * 2.4;
        const d = 8 + k * (18 + rnd(i) * 30);
        const sx = cx + 12, sy = groundY - 40;
        line(ctx, sx + Math.cos(a) * 6, sy + Math.sin(a) * 6,
          sx + Math.cos(a) * d, sy + Math.sin(a) * d + k * k * 18, '#ffd166', 2);
      }
      ctx.globalAlpha = 1;
    }
  },

  // ---------- Lửa ----------
  fire(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#120a06', '#060302');
    const cx = w / 2, base = h * 0.78;
    glow(ctx, cx, base - 40, 190, 'rgba(255,140,40,.5)', 0.5 + 0.1 * Math.sin(t * 7));
    // củi
    ctx.strokeStyle = '#4a2f1a'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    line(ctx, cx - 60, base + 8, cx + 45, base - 14, '#4a2f1a', 13);
    line(ctx, cx - 45, base - 14, cx + 60, base + 8, '#432a16', 13);
    ctx.lineCap = 'butt';
    // ba lớp lửa
    const layers = [
      { c: 'rgba(226,88,34,.85)', s: 1.0, f: 5.1 },
      { c: 'rgba(255,159,28,.9)', s: 0.66, f: 6.3 },
      { c: 'rgba(255,209,102,.95)', s: 0.36, f: 7.7 }
    ];
    for (const L of layers) {
      const fw = 62 * L.s, fh = (120 + 14 * Math.sin(t * L.f)) * L.s;
      ctx.fillStyle = L.c;
      ctx.beginPath();
      ctx.moveTo(cx - fw, base);
      ctx.quadraticCurveTo(cx - fw * 0.9 + Math.sin(t * L.f) * 8, base - fh * 0.5,
        cx + Math.sin(t * L.f * 1.4) * 10 * L.s, base - fh);
      ctx.quadraticCurveTo(cx + fw * 0.9 + Math.sin(t * L.f + 2) * 8, base - fh * 0.5,
        cx + fw, base);
      ctx.closePath(); ctx.fill();
    }
    // tàn lửa bay lên
    ctx.fillStyle = '#ffca7a';
    for (let i = 0; i < 9; i++) {
      const cyc = (t * 34 + i * 41) % 150;
      const ex = cx + Math.sin(t * 2.4 + i * 2) * (12 + i * 2);
      ctx.globalAlpha = clamp01(1 - cyc / 150) * 0.9;
      ctx.fillRect(ex, base - 46 - cyc, 2.6, 2.6);
    }
    ctx.globalAlpha = 1;
  },

  // ---------- Homo sapiens ----------
  human(ctx, t, w, h) {
    const horizon = h * 0.66;
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, '#231437');
    g.addColorStop(0.72, '#a3405c');
    g.addColorStop(1, '#f2994a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon);
    const sunY = horizon - 8 - 46 * clamp01(t / 7);
    glow(ctx, w * 0.62, sunY, 110, 'rgba(255,190,90,.8)', 0.8);
    circle(ctx, w * 0.62, sunY, 25, '#ffd98a');
    ctx.fillStyle = '#12090a'; ctx.fillRect(0, horizon, w, h - horizon);
    // đàn người đi về phía mặt trời
    ctx.strokeStyle = '#0d0607'; ctx.fillStyle = '#0d0607';
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const xi = ((t * 26 + i * 95) % (w + 90)) - 45;
      const yi = horizon + 16 + i * 7;
      const ph = t * 5.2 + i * 1.9;
      ctx.save(); ctx.translate(xi, yi); ctx.scale(1.5, 1.5);
      circle(ctx, 0, -47, 7.5, '#0d0607');
      ctx.lineWidth = 9;
      line(ctx, 0, -41, 0, -17, '#0d0607', 9);
      ctx.lineWidth = 4.5;
      line(ctx, 0, -17, Math.sin(ph) * 9, 0, '#0d0607', 4.5);
      line(ctx, 0, -17, -Math.sin(ph) * 9, 0, '#0d0607', 4.5);
      line(ctx, 0, -34, Math.sin(ph + Math.PI) * 8, -22, '#0d0607', 4.5);
      line(ctx, 0, -34, Math.sin(ph) * 8, -22, '#0d0607', 4.5);
      ctx.restore();
    }
    ctx.lineCap = 'butt';
  },

  // ---------- Nghệ thuật hang động ----------
  cave(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#170e08', '#080403');
    // ánh đuốc chập chờn
    const fl = 0.2 + 0.05 * Math.sin(t * 9) + 0.03 * Math.sin(t * 23);
    glow(ctx, w * 0.72, h * 0.4, 230, 'rgba(214,124,60,.9)', fl);
    // vết loang trên vách
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.12 + rnd(i) * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(rnd(i + 3) * w, rnd(i + 8) * h, 60 + rnd(i) * 70, 34, rnd(i) * 3, 0, TAU);
      ctx.fill();
    }
    // dấu tay in màu thổ hoàng
    const handA = clamp01((t - 0.6) / 1.6);
    if (handA > 0) {
      const hx = w * 0.3, hy = h * 0.42;
      ctx.globalAlpha = handA * 0.9;
      glow(ctx, hx, hy, 62, 'rgba(177,80,46,1)', handA);
      ctx.fillStyle = '#120905';
      circle(ctx, hx, hy + 8, 17, '#120905');
      ctx.lineCap = 'round'; ctx.strokeStyle = '#120905'; ctx.lineWidth = 9;
      for (let f = 0; f < 5; f++) {
        const a = -Math.PI / 2 + (f - 2) * 0.34;
        line(ctx, hx, hy + 4, hx + Math.cos(a) * 34, hy + 4 + Math.sin(a) * 34, '#120905', 9);
      }
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 1;
    }
    // hình hươu vẽ dần bằng nét
    const deer = clamp01((t - 2.2) / 3);
    if (deer > 0) {
      ctx.save();
      ctx.translate(w * 0.56, h * 0.56);
      ctx.strokeStyle = '#d8956b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      const pts = [
        [0, 0], [14, -16], [46, -22], [78, -18], [96, -26], [104, -40],
        [98, -24], [110, -34], [104, -18], [112, -10], [100, -6], [88, 6],
        [84, 34], [78, 6], [52, 8], [46, 36], [40, 6], [12, 8], [6, 34], [2, 4], [0, 0]
      ];
      ctx.beginPath();
      const total = Math.floor(pts.length * deer);
      for (let i = 0; i <= total && i < pts.length; i++) {
        const [px, py] = pts[i];
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      ctx.lineCap = 'butt';
    }
  },

  // ---------- Nông nghiệp ----------
  farm(ctx, t, w, h) {
    const horizon = h * 0.68;
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, '#2a3d66'); g.addColorStop(1, '#f9c74f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon);
    glow(ctx, w * 0.78, horizon - 30, 90, 'rgba(255,220,130,.9)', 0.75);
    circle(ctx, w * 0.78, horizon - 30, 22, '#ffe29a');
    ctx.fillStyle = '#4d3120'; ctx.fillRect(0, horizon, w, h - horizon);
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3;
    for (let r = 0; r < 4; r++) {
      line(ctx, 0, horizon + 16 + r * 18, w, horizon + 10 + r * 18, 'rgba(0,0,0,.22)', 3);
    }
    // lúa mì mọc dần và đung đưa
    for (let i = 0; i < 15; i++) {
      const x = w * 0.06 + i * (w * 0.062);
      const gy = horizon + 8 + (i % 3) * 9;
      const gi = clamp01((t - i * 0.14) / 2.6);
      if (gi <= 0) continue;
      const len = (42 + rnd(i) * 26) * gi;
      const sway = Math.sin(t * 1.8 + i) * 5 * gi;
      const cr = Math.round(lerp(124, 233, gi));
      const cg = Math.round(lerp(179, 196, gi));
      const cb = Math.round(lerp(66, 106, gi));
      ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.quadraticCurveTo(x + sway * 0.4, gy - len * 0.6, x + sway, gy - len);
      ctx.stroke();
      if (gi > 0.78) {
        ctx.fillStyle = '#e9c46a';
        for (let s = 0; s < 5; s++) {
          ctx.beginPath();
          ctx.ellipse(x + sway + (s % 2 ? 4 : -4), gy - len - s * 4, 3.4, 5.5, s % 2 ? 0.5 : -0.5, 0, TAU);
          ctx.fill();
        }
      }
    }
  },

  // ---------- Bánh xe ----------
  wheel(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#c98d5a', '#8a5a33', 0.72);
    const groundY = h * 0.74;
    ctx.fillStyle = '#5f3d21'; ctx.fillRect(0, groundY, w, h - groundY);
    line(ctx, 0, groundY, w, groundY, '#3f2a17', 3);
    const r = 46;
    const cx = ((t * 72) % (w + 180)) - 90;
    const cy = groundY - r;
    const rot = cx / r;
    // bụi sau bánh
    for (let k = 0; k < 6; k++) {
      const age = (t * 1.6 + k * 0.31) % 1;
      ctx.globalAlpha = (1 - age) * 0.3;
      circle(ctx, cx - 40 - age * 46, groundY - 4 - age * 12, 4 + age * 12, '#cbb08a');
    }
    ctx.globalAlpha = 1;
    // đĩa gỗ đặc kiểu Lưỡng Hà
    circle(ctx, cx, cy, r, '#a9743f', '#5c3a1d', 6);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.fillStyle = '#5c3a1d';
    ctx.fillRect(-r + 6, -6, r * 2 - 12, 12);
    ctx.fillRect(-6, -r + 6, 12, r * 2 - 12);
    circle(ctx, 0, 0, 8, '#3d2712');
    ctx.restore();
    // vệt chuyển động
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      line(ctx, cx - 70 - i * 20, cy - 20 + i * 18, cx - 96 - i * 20, cy - 20 + i * 18,
        'rgba(255,235,200,.3)', 2);
    }
  },

  // ---------- Chữ viết ----------
  writing(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#1c140c', '#0e0906');
    const cx = w / 2, cy = h / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-0.02);
    rrect(ctx, -155, -100, 310, 200, 14, '#b08d57', '#7c5f38', 3);
    rrect(ctx, -143, -88, 286, 176, 10, '#a17e4b');
    // các hàng chữ hình nêm hiện dần
    const total = 24;
    const cycle = t % 16;
    const count = Math.min(total, Math.floor(cycle * 2.2));
    ctx.fillStyle = '#4a3418'; ctx.strokeStyle = '#4a3418';
    for (let i = 0; i < count; i++) {
      const col = i % 6, row = Math.floor(i / 6);
      const mx = -118 + col * 47 + rnd(i) * 8;
      const my = -62 + row * 44 + rnd(i + 9) * 6;
      for (let k = 0; k < 3; k++) {
        const a = rnd(i * 3 + k) * 1.2 - 0.6;
        ctx.save();
        ctx.translate(mx + k * 9, my + (k % 2) * 10); ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(7, 3); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
        line(ctx, 5, 3, 16, 3, '#4a3418', 2.4);
        ctx.restore();
      }
    }
    // bút trâm
    if (count < total) {
      const col = count % 6, row = Math.floor(count / 6);
      const sx = -118 + col * 47, sy = -62 + row * 44;
      const bob = Math.sin(t * 9) * 3;
      ctx.strokeStyle = '#d9c9a3'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      line(ctx, sx + 6, sy + bob, sx + 40, sy - 46 + bob, '#d9c9a3', 5);
      ctx.lineCap = 'butt';
    }
    ctx.restore();
  },

  // ---------- Kim tự tháp ----------
  pyramid(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#f7b267', '#f4845f', 0.75);
    const sandY = h * 0.76;
    // mặt trời và tia
    const sx = w * 0.8, sy = h * 0.2;
    glow(ctx, sx, sy, 100, 'rgba(255,220,120,.9)', 0.8);
    circle(ctx, sx, sy, 24, '#ffe08a');
    ctx.strokeStyle = 'rgba(255,224,138,.5)';
    for (let i = 0; i < 10; i++) {
      const a = t * 0.25 + i * TAU / 10;
      line(ctx, sx + Math.cos(a) * 32, sy + Math.sin(a) * 32,
        sx + Math.cos(a) * 44, sy + Math.sin(a) * 44, 'rgba(255,224,138,.5)', 2.5);
    }
    ctx.fillStyle = '#e0b97b'; ctx.fillRect(0, sandY, w, h - sandY);
    // kim tự tháp xây từng lớp từ dưới lên
    const apexY = h * 0.24, baseHW = 165, cx2 = w * 0.42;
    const rows = 10;
    const progress = clamp01((t % 12) / 7.5);
    for (let rIdx = 0; rIdx < rows; rIdx++) {
      const rowProg = clamp01(progress * rows - rIdx);
      if (rowProg <= 0) break;
      const y1 = sandY - (rIdx + 1) * (sandY - apexY) / rows;
      const y0 = sandY - rIdx * (sandY - apexY) / rows;
      const hw1 = baseHW * (1 - (rIdx + 1) / rows);
      const hw0 = baseHW * (1 - rIdx / rows);
      const reveal = lerp(-hw0, hw0, rowProg);
      ctx.beginPath();
      ctx.moveTo(cx2 - hw0, y0);
      ctx.lineTo(Math.min(cx2 + hw0, cx2 + reveal), y0);
      ctx.lineTo(Math.min(cx2 + hw1, cx2 + reveal), y1);
      ctx.lineTo(cx2 - hw1, y1);
      ctx.closePath();
      ctx.fillStyle = rIdx % 2 ? '#d8b578' : '#cfa969';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,84,40,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(120,84,40,.28)';
      for (let bx = -hw0 + 20; bx < Math.min(hw0, reveal); bx += 24) {
        line(ctx, cx2 + bx, y0, cx2 + bx, y1, 'rgba(120,84,40,.28)', 1);
      }
    }
    // ánh chớp trên đỉnh khi hoàn tất
    if (progress >= 1) {
      const gl = 0.5 + 0.5 * Math.sin(t * 5);
      glow(ctx, cx2, apexY, 42, 'rgba(255,255,220,1)', gl * 0.8);
    }
  },

  // ---------- Luyện sắt ----------
  iron(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#171009', '#0b0705');
    glow(ctx, w * 0.13, h * 0.5, 190, 'rgba(255,110,30,.8)',
      0.3 + 0.06 * Math.sin(t * 8));
    const cx = w / 2, topY = h * 0.6;
    // đe
    ctx.fillStyle = '#2b2b32';
    ctx.fillRect(cx - 58, topY, 116, 17);
    ctx.beginPath();
    ctx.moveTo(cx + 58, topY); ctx.lineTo(cx + 96, topY + 5);
    ctx.lineTo(cx + 58, topY + 17); ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - 30, topY + 17, 60, 26);
    ctx.fillRect(cx - 46, topY + 43, 92, 12);
    // phôi sắt nóng đỏ
    const heat = 150 + 70 * (0.5 + 0.5 * Math.sin(t * 2.2));
    rrect(ctx, cx - 40, topY - 12, 80, 12, 5, `rgb(255,${Math.round(heat)},40)`);
    glow(ctx, cx, topY - 6, 46, 'rgba(255,140,40,.9)', 0.5);
    // búa
    const p = (t % 1.15) / 1.15;
    const sw = p < 0.24 ? easeIn(p / 0.24) : p < 0.42 ? 1 : 1 - easeOut((p - 0.42) / 0.58);
    const ang = lerp(-1.75, -0.32, sw);
    ctx.save();
    ctx.translate(cx + 98, h * 0.3); ctx.rotate(ang);
    ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    line(ctx, 0, 0, 84, 0, '#6b4a2c', 8);
    ctx.fillStyle = '#3a3a42';
    ctx.fillRect(76, -17, 30, 34);
    ctx.restore();
    ctx.lineCap = 'butt';
    // tia lửa khi búa chạm
    if (p > 0.24 && p < 0.52) {
      const k = (p - 0.24) / 0.28;
      ctx.lineWidth = 2.2;
      ctx.globalAlpha = 1 - k;
      for (let i = 0; i < 11; i++) {
        const a = -Math.PI / 2 + (rnd(i + 31) - 0.5) * 2.3;
        const d = 10 + k * (16 + rnd(i + 7) * 52);
        line(ctx, cx + Math.cos(a) * 8, topY - 10 + Math.sin(a) * 8,
          cx + Math.cos(a) * d, topY - 10 + Math.sin(a) * d + k * k * 26, '#ffcf6e', 2.2);
      }
      ctx.globalAlpha = 1;
    }
  },

  // ---------- Dân chủ Athens ----------
  democracy(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#1e2f4d', '#0c1526');
    drawStars(ctx, w, h, t, 26, 5, 0.4);
    // đền thờ
    const tx = w / 2, ty = h * 0.2;
    ctx.fillStyle = '#e8d5a2';
    ctx.beginPath();
    ctx.moveTo(tx - 150, ty + 34); ctx.lineTo(tx, ty); ctx.lineTo(tx + 150, ty + 34);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(tx - 150, ty + 38, 300, 12);
    for (let i = 0; i < 6; i++) {
      const colX = tx - 125 + i * 50;
      ctx.fillRect(colX - 7, ty + 54, 14, 88);
      ctx.fillRect(colX - 11, ty + 50, 22, 7);
      ctx.fillRect(colX - 11, ty + 140, 22, 7);
    }
    ctx.fillRect(tx - 160, ty + 148, 320, 10);
    ctx.fillRect(tx - 172, ty + 158, 344, 10);
    ctx.fillStyle = 'rgba(12,21,38,.35)';
    ctx.fillRect(tx - 150, ty + 38, 300, 130);
    // bình gốm bỏ phiếu
    const vx = w / 2, vy = h * 0.82;
    ctx.fillStyle = '#7a4a2b';
    ctx.beginPath();
    ctx.moveTo(vx - 16, vy - 52);
    ctx.bezierCurveTo(vx - 44, vy - 34, vx - 38, vy + 6, vx - 14, vy + 14);
    ctx.lineTo(vx + 14, vy + 14);
    ctx.bezierCurveTo(vx + 38, vy + 6, vx + 44, vy - 34, vx + 16, vy - 52);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a8703f'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#5c3a1f';
    ctx.fillRect(vx - 22, vy - 58, 44, 8);
    // viên sỏi phiếu bầu rơi vào bình
    const p = (t % 1.7) / 1.7;
    if (p < 0.55) {
      const q = easeIn(p / 0.55);
      circle(ctx, vx + Math.sin(p * 9) * 3, lerp(h * 0.3, vy - 58, q), 5, '#f0ece2');
    }
    // vạch đếm phiếu
    const votes = Math.min(18, Math.floor(t / 1.7));
    ctx.strokeStyle = '#f0ece2'; ctx.lineWidth = 2.4;
    for (let i = 0; i < votes; i++) {
      const gx = vx + 78 + Math.floor(i / 5) * 26, gy = vy - 40 + (i % 5) * 9;
      if (i % 5 === 4) line(ctx, gx - 4, gy - 34, gx + 18, gy - 4, '#f0ece2', 2.4);
      else line(ctx, gx + (i % 5) * 4, gy - 36, gx + (i % 5) * 4, gy - 6, '#f0ece2', 2.4);
    }
  },

  // ---------- Giấy ----------
  paper(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#182531', '#0d151d');
    const vx = w / 2, vy = h * 0.62;
    // dây phơi giấy
    line(ctx, w * 0.6, h * 0.14, w * 0.97, h * 0.18, '#5a6b7d', 2);
    const sheets = Math.min(4, Math.floor(t / 4.2));
    for (let i = 0; i < sheets; i++) {
      const px = w * 0.65 + i * 44;
      ctx.fillStyle = 'rgba(240,236,226,.92)';
      ctx.fillRect(px, h * 0.155 + i * 1.2, 34, 46);
      circle(ctx, px + 17, h * 0.155 + i * 1.2, 2.5, '#8a6b45');
    }
    // bể bột giấy
    rrect(ctx, vx - 140, vy, 280, 74, 8, '#23445a', '#39617c', 3);
    ctx.strokeStyle = '#3f7ca0'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = -132; x <= 132; x += 6) {
      const yy = vy + 14 + Math.sin(x * 0.09 + t * 3) * 3;
      x === -132 ? ctx.moveTo(vx + x, yy) : ctx.lineTo(vx + x, yy);
    }
    ctx.stroke();
    // khuôn seo giấy nhúng xuống — nhấc lên
    const p = (t % 4.2) / 4.2;
    let fy, sheetA = 0;
    if (p < 0.25) fy = lerp(h * 0.18, vy + 10, easeIn(p / 0.25));
    else if (p < 0.42) fy = vy + 10 + Math.sin((p - 0.25) * 40) * 2;
    else if (p < 0.75) { const q = easeOut((p - 0.42) / 0.33); fy = lerp(vy + 10, h * 0.18, q); sheetA = q; }
    else { fy = h * 0.18; sheetA = 1; }
    ctx.save();
    ctx.translate(vx, fy);
    if (sheetA > 0) {
      ctx.fillStyle = `rgba(240,236,226,${sheetA * 0.95})`;
      ctx.fillRect(-72, -44, 144, 88);
      // nước nhỏ giọt
      if (p > 0.42 && p < 0.8) {
        ctx.strokeStyle = 'rgba(120,180,215,.7)';
        for (let d = 0; d < 4; d++) {
          const dy = ((t * 3 + d * 0.7) % 1) * 40;
          line(ctx, -50 + d * 34, 46 + dy, -50 + d * 34, 54 + dy, 'rgba(120,180,215,.7)', 2);
        }
      }
    }
    rrect(ctx, -78, -50, 156, 100, 4, null, '#caa96a', 5);
    line(ctx, -78, 0, 78, 0, 'rgba(202,169,106,.5)', 2);
    line(ctx, 0, -50, 0, 50, 'rgba(202,169,106,.5)', 2);
    ctx.restore();
  },

  // ---------- Thuốc súng / pháo hoa ----------
  fireworks(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0a0f22', '#05070f');
    drawStars(ctx, w, h, t, 30, 11, 0.55);
    // chùa cổ phía xa
    ctx.fillStyle = '#0a0c13';
    const px = w * 0.5, py = h;
    for (let lv = 0; lv < 3; lv++) {
      const lw2 = 90 - lv * 22, ly = py - 40 - lv * 42;
      ctx.fillRect(px - lw2 / 2, ly, lw2, 40);
      ctx.beginPath();
      ctx.moveTo(px - lw2 / 2 - 16, ly); ctx.lineTo(px, ly - 22); ctx.lineTo(px + lw2 / 2 + 16, ly);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillRect(0, h - 26, w, 26);
    const colors = ['#ffd166', '#ef476f', '#06d6a0'];
    for (let j = 0; j < 3; j++) {
      const cyc = 2.6, p = ((t + j * 0.9) % cyc) / cyc;
      const bx = w * (0.24 + 0.26 * j), apexY = h * (0.3 - j * 0.04);
      if (p < 0.32) {
        const q = easeOut(p / 0.32);
        const ry = lerp(h * 0.92, apexY, q);
        line(ctx, bx, ry + 14, bx, ry + 30, 'rgba(255,220,150,.5)', 2);
        circle(ctx, bx, ry, 3, '#fff1c9');
      } else {
        const k = (p - 0.32) / 0.68;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = colors[j];
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * TAU + j;
          const r = easeOut(k) * (58 + rnd(i + j * 40) * 26);
          circle(ctx, bx + Math.cos(a) * r, apexY + Math.sin(a) * r + k * k * 34,
            2.4, colors[j]);
        }
        ctx.globalAlpha = 1;
      }
    }
  },

  // ---------- La bàn ----------
  compass(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#131c2c', '#090e18');
    const cx = w / 2, cy = h / 2, R = Math.min(h * 0.4, 118);
    circle(ctx, cx, cy, R + 10, '#1b2436', '#caa96a', 4);
    circle(ctx, cx, cy, R, null, 'rgba(202,169,106,.55)', 1.5);
    // vạch chia độ
    for (let i = 0; i < 32; i++) {
      const a = i * TAU / 32;
      const len = i % 8 === 0 ? 16 : i % 4 === 0 ? 10 : 5;
      line(ctx, cx + Math.cos(a) * (R - len), cy + Math.sin(a) * (R - len),
        cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2),
        'rgba(232,238,247,.6)', i % 8 === 0 ? 2.5 : 1.2);
    }
    ctx.fillStyle = '#e8eef7';
    ctx.font = 'bold 17px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('B', cx, cy - R + 30);
    ctx.fillText('N', cx, cy + R - 30);
    ctx.fillText('Đ', cx + R - 30, cy);
    ctx.fillText('T', cx - R + 30, cy);
    // kim dao động rồi ổn định về hướng Bắc
    const cyc = 7, el = t % cyc;
    const th0 = (rnd(Math.floor(t / cyc) + 2) * 2 - 1) * 2.1;
    const th = th0 * Math.exp(-el * 1.05) * Math.cos(el * 5.5);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(th);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(0, -R + 34); ctx.lineTo(-9, 0); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d5dce8';
    ctx.beginPath();
    ctx.moveTo(0, R - 34); ctx.lineTo(-9, 0); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
    circle(ctx, 0, 0, 7, '#caa96a');
    ctx.restore();
    // vệt sáng mặt kính
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(cx, cy, R - 26, -2.4, -1.4); ctx.stroke();
  },

  // ---------- Máy in ----------
  press(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#1c1610', '#0f0b07');
    const cx = w * 0.44, bedY = h * 0.68;
    // khung máy
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(cx - 95, h * 0.14, 20, h * 0.62);
    ctx.fillRect(cx + 75, h * 0.14, 20, h * 0.62);
    ctx.fillRect(cx - 105, h * 0.1, 210, 22);
    ctx.fillRect(cx - 120, bedY + 26, 240, 16);
    // bàn để khuôn chữ
    ctx.fillStyle = '#2b2018';
    ctx.fillRect(cx - 80, bedY, 160, 26);
    const p = (t % 3.4) / 3.4;
    // giấy vào — ép — lấy ra
    let paperX = cx, printed = false, paperA = 1;
    if (p < 0.2) paperX = lerp(-80, cx, easeOut(p / 0.2));
    else if (p < 0.68) paperX = cx;
    else paperX = lerp(cx, w + 90, easeIn((p - 0.68) / 0.32));
    if (p > 0.5) printed = true;
    // trục vít + bàn ép
    let platenY = h * 0.3;
    if (p >= 0.2 && p < 0.42) platenY = lerp(h * 0.3, bedY - 26, easeIn((p - 0.2) / 0.22));
    else if (p >= 0.42 && p < 0.52) platenY = bedY - 26 + Math.sin((p - 0.42) * 90) * 1.5;
    else if (p >= 0.52 && p < 0.68) platenY = lerp(bedY - 26, h * 0.3, easeOut((p - 0.52) / 0.16));
    ctx.fillStyle = '#5c4127';
    ctx.fillRect(cx - 9, h * 0.13, 18, platenY - h * 0.13);
    ctx.fillRect(cx - 60, platenY, 120, 16);
    line(ctx, cx - 46, h * 0.2, cx + 46, h * 0.24, '#8a6b45', 7);
    // tờ giấy
    ctx.globalAlpha = paperA;
    ctx.fillStyle = '#f0ece2';
    ctx.fillRect(paperX - 55, bedY - 11, 110, 11);
    if (printed) {
      ctx.strokeStyle = '#2b2018'; ctx.lineWidth = 1.6;
      for (let l = 0; l < 3; l++) {
        line(ctx, paperX - 44, bedY - 8 + l * 3, paperX - 44 + 86 - l * 14, bedY - 8 + l * 3, '#2b2018', 1.2);
      }
    }
    ctx.globalAlpha = 1;
    // chồng sách in xong
    const stack = Math.min(6, Math.floor(t / 3.4));
    for (let i = 0; i < stack; i++) {
      ctx.fillStyle = '#f0ece2';
      ctx.fillRect(w * 0.8 - i * 3, h * 0.8 - i * 9, 74, 8);
      ctx.strokeStyle = 'rgba(43,32,24,.6)';
      ctx.strokeRect(w * 0.8 - i * 3, h * 0.8 - i * 9, 74, 8);
    }
  },

  // ---------- Thuyền buồm Columbus ----------
  sail(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#1b2a4a', '#3f6489', 0.62);
    drawStars(ctx, w, h, t, 24, 21, 0.4);
    // trăng khuyết
    circle(ctx, w * 0.16, h * 0.18, 20, '#e8e4d8');
    circle(ctx, w * 0.185, h * 0.165, 17, '#22355c');
    // biển
    ctx.fillStyle = '#16304a';
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(120,180,220,${0.28 - k * 0.07})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = h * (0.66 + k * 0.09) + Math.sin(x * 0.03 + t * (1 + k * 0.4)) * (4 + k * 2);
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // tàu caravel
    const sx = ((t * 20) % (w + 260)) - 130;
    const sy = h * 0.63 + Math.sin(t * 1.15) * 4;
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(Math.sin(t * 0.85) * 0.05);
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath();
    ctx.moveTo(-62, 0);
    ctx.quadraticCurveTo(-56, 24, -30, 26);
    ctx.lineTo(38, 26);
    ctx.quadraticCurveTo(66, 22, 72, -6);
    ctx.lineTo(52, 0);
    ctx.closePath(); ctx.fill();
    line(ctx, -60, 2, 66, 2, '#8a6242', 3);
    line(ctx, -18, 0, -18, -74, '#3d2b18', 4);
    line(ctx, 26, 0, 26, -56, '#3d2b18', 3.5);
    // buồm no gió
    ctx.fillStyle = '#efe6d2';
    ctx.beginPath();
    ctx.moveTo(-44, -68);
    ctx.quadraticCurveTo(-16 + Math.sin(t * 2) * 2, -44, -44, -16);
    ctx.lineTo(8, -16);
    ctx.quadraticCurveTo(20 + Math.sin(t * 2) * 2, -44, 8, -68);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -52);
    ctx.quadraticCurveTo(28 + Math.sin(t * 2.2) * 2, -36, 6, -12);
    ctx.lineTo(44, -12);
    ctx.quadraticCurveTo(52 + Math.sin(t * 2.2) * 2, -34, 44, -52);
    ctx.closePath(); ctx.fill();
    // cờ đuôi nheo
    ctx.fillStyle = '#c8402f';
    ctx.beginPath();
    ctx.moveTo(-18, -74);
    ctx.lineTo(-18 + 20, -70 + Math.sin(t * 6) * 3);
    ctx.lineTo(-18, -66);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // vệt sóng sau đuôi tàu
    ctx.strokeStyle = 'rgba(220,240,255,.35)';
    for (let i = 0; i < 4; i++) {
      const wx = sx - 76 - i * 26;
      line(ctx, wx, sy + 22 + (i % 2) * 4, wx - 16, sy + 22 + (i % 2) * 4, 'rgba(220,240,255,.3)', 2);
    }
  },

  // ---------- Kính viễn vọng ----------
  telescope(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0b1226', '#04070f');
    drawStars(ctx, w, h, t, 60, 31, 0.85);
    // mặt trăng và miệng hố
    const mx = w * 0.78, my = h * 0.24, mr = 44;
    glow(ctx, mx, my, 90, 'rgba(232,228,216,.8)', 0.5);
    circle(ctx, mx, my, mr, '#e8e4d8');
    ctx.fillStyle = 'rgba(140,135,120,.4)';
    for (let i = 0; i < 6; i++) {
      circle(ctx, mx + (rnd(i + 3) - 0.5) * mr * 1.4, my + (rnd(i + 9) - 0.5) * mr * 1.4,
        3 + rnd(i) * 7, 'rgba(140,135,120,.4)');
    }
    // nền đất và kính
    ctx.fillStyle = '#0a0d15'; ctx.fillRect(0, h * 0.82, w, h * 0.18);
    const bx = w * 0.26, by = h * 0.82;
    const aim = Math.atan2(my - (by - 46), mx - bx);
    ctx.lineCap = 'round';
    line(ctx, bx, by, bx - 34, by + 26, '#3d3428', 5);
    line(ctx, bx, by, bx + 34, by + 26, '#3d3428', 5);
    line(ctx, bx, by, bx, by + 28, '#3d3428', 5);
    ctx.save();
    ctx.translate(bx, by - 46); ctx.rotate(aim);
    rrect(ctx, -20, -10, 96, 20, 8, '#caa96a', '#8a6b45', 2.5);
    rrect(ctx, 70, -7, 22, 14, 5, '#8a6b45');
    ctx.restore();
    ctx.lineCap = 'butt';
    // chùm quan sát
    ctx.globalAlpha = 0.06 + 0.03 * Math.sin(t * 2);
    ctx.fillStyle = '#9dc4ff';
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(aim) * 90, by - 46 + Math.sin(aim) * 90);
    ctx.lineTo(mx - 30, my + 34); ctx.lineTo(mx + 34, my - 26);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // ống ngắm phóng đại hiện dần
    const zoomA = clamp01((t - 2) / 1.5);
    if (zoomA > 0) {
      const zx = w * 0.15, zy = h * 0.3, zr = 52;
      ctx.globalAlpha = zoomA;
      circle(ctx, zx, zy, zr, '#10141f', '#caa96a', 3);
      ctx.save();
      ctx.beginPath(); ctx.arc(zx, zy, zr - 4, 0, TAU); ctx.clip();
      ctx.fillStyle = '#d9d5c8'; ctx.fillRect(zx - zr, zy - zr, zr * 2, zr * 2);
      ctx.fillStyle = 'rgba(120,115,100,.55)';
      circle(ctx, zx - 12, zy + 6, 15, 'rgba(120,115,100,.55)');
      circle(ctx, zx + 20, zy - 14, 9, 'rgba(120,115,100,.45)');
      circle(ctx, zx + 8, zy + 26, 6, 'rgba(120,115,100,.45)');
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  },

  // ---------- Newton / vạn vật hấp dẫn ----------
  gravity(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#101a2e', '#0a1120');
    const groundY = h * 0.82;
    line(ctx, 0, groundY, w, groundY, 'rgba(160,190,230,.25)', 2);
    // cây táo
    const tx = w * 0.26;
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(tx - 9, h * 0.44, 18, groundY - h * 0.44);
    ctx.fillStyle = '#2e5d3a';
    circle(ctx, tx, h * 0.36, 52, '#2e5d3a');
    circle(ctx, tx - 46, h * 0.43, 36, '#2a5434');
    circle(ctx, tx + 46, h * 0.43, 36, '#33663f');
    // quả táo rơi
    const p = (t % 3.6) / 3.6;
    let ax = tx + 34, ay = h * 0.47;
    if (p < 0.42) ax += Math.sin(t * 2.4) * 2;
    else if (p < 0.66) ay = lerp(h * 0.47, groundY - 7, ((p - 0.42) / 0.24) ** 2);
    else if (p < 0.8) {
      const q = (p - 0.66) / 0.14;
      ay = groundY - 7 - Math.sin(q * Math.PI) * 13;
    } else ay = groundY - 7;
    circle(ctx, ax, ay, 7.5, '#d64541');
    line(ctx, ax, ay - 7, ax + 3, ay - 12, '#4a3220', 2);
    // quỹ đạo mặt trăng quanh Trái Đất
    const ox = w * 0.71, oy = h * 0.42;
    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = 'rgba(160,190,230,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(ox, oy, 92, 58, -0.2, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, ox, oy, 21, '#3a86c8');
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    circle(ctx, ox - 6, oy - 6, 7, 'rgba(255,255,255,.22)');
    const ma = -t * 1.15;
    const mmx = ox + Math.cos(ma) * 92 * Math.cos(-0.2) - Math.sin(ma) * 58 * Math.sin(-0.2);
    const mmy = oy + Math.cos(ma) * 92 * Math.sin(-0.2) + Math.sin(ma) * 58 * Math.cos(-0.2);
    ctx.setLineDash([3, 5]);
    line(ctx, ox, oy, mmx, mmy, 'rgba(255,200,87,.4)', 1.4);
    ctx.setLineDash([]);
    circle(ctx, mmx, mmy, 7, '#c9cdd4');
    ctx.restore();
    // công thức
    ctx.font = 'italic 17px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,200,87,${0.55 + 0.25 * Math.sin(t * 2)})`;
    ctx.fillText('F = G·m₁·m₂ / r²', w / 2, h * 0.94);
  },

  // ---------- Máy hơi nước ----------
  steam(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#161311', '#0c0a08');
    const floorY = h * 0.8;
    line(ctx, 0, floorY, w, floorY, '#2b241d', 4);
    // nồi hơi
    rrect(ctx, w * 0.1, h * 0.4, 150, 96, 20, '#7a3b2e', '#57281f', 3);
    ctx.fillStyle = '#57281f';
    for (let i = 0; i < 5; i++) circle(ctx, w * 0.1 + 22 + i * 27, h * 0.4 + 12, 2.4, '#3f1d16');
    ctx.fillRect(w * 0.1 + 58, h * 0.33, 18, h * 0.08);
    // đồng hồ áp suất
    circle(ctx, w * 0.1 + 118, h * 0.44, 15, '#e8e4d8', '#3f2a1f', 3);
    const na = -2.2 + 0.5 * Math.sin(t * 2.6) + 1.1;
    line(ctx, w * 0.1 + 118, h * 0.44, w * 0.1 + 118 + Math.cos(na) * 10,
      h * 0.44 + Math.sin(na) * 10, '#c0392b', 2);
    // bánh đà + tay biên + piston
    const fx = w * 0.72, fy = h * 0.55, fr = 62;
    const th = t * 2.6;
    circle(ctx, fx, fy, fr, null, '#39414d', 11);
    ctx.save();
    ctx.translate(fx, fy); ctx.rotate(th);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      line(ctx, 0, 0, fr - 7, 0, '#39414d', 5);
    }
    ctx.restore();
    circle(ctx, fx, fy, 9, '#4d5765');
    const pinX = fx + Math.cos(th) * fr * 0.7, pinY = fy + Math.sin(th) * fr * 0.7;
    // xi-lanh
    rrect(ctx, w * 0.33, fy - 19, 104, 38, 6, '#4a5563', '#333c47', 3);
    const L = 100;
    const xh = pinX - Math.sqrt(Math.max(L * L - (pinY - fy) ** 2, 100));
    line(ctx, pinX, pinY, xh, fy, '#8a94a3', 6);
    circle(ctx, pinX, pinY, 5, '#aab4c3');
    rrect(ctx, xh - 30, fy - 13, 34, 26, 4, '#6b7684');
    // hơi nước phụt theo nhịp
    for (let k = 0; k < 6; k++) {
      const age = (t * 0.85 + k * 0.29) % 1;
      ctx.globalAlpha = (1 - age) * 0.4;
      circle(ctx, w * 0.1 + 67 + age * 26 + Math.sin(k * 3 + t) * 5,
        h * 0.31 - age * 60, 5 + age * 15, '#cfd5dd');
    }
    ctx.globalAlpha = 1;
  },

  // ---------- Vắc-xin ----------
  vaccine(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0d1c2a', '#081019');
    const fx = w * 0.4, fy = h * 0.52;
    // người được bảo vệ
    circle(ctx, fx, fy - 34, 19, '#22384a', '#7fb3d5', 2.5);
    ctx.beginPath();
    ctx.moveTo(fx - 32, fy + 44);
    ctx.quadraticCurveTo(fx - 32, fy - 10, fx, fy - 10);
    ctx.quadraticCurveTo(fx + 32, fy - 10, fx + 32, fy + 44);
    ctx.closePath();
    ctx.fillStyle = '#22384a'; ctx.fill();
    ctx.strokeStyle = '#7fb3d5'; ctx.lineWidth = 2.5; ctx.stroke();
    // lá chắn vẽ dần quanh người
    const shieldR = 74;
    const sp = clamp01((t - 1.6) / 1.6);
    if (sp > 0) {
      ctx.save();
      ctx.strokeStyle = '#6ee7ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#6ee7ff';
      ctx.shadowBlur = sp === 1 ? 8 + 4 * Math.sin(t * 3) : 0;
      ctx.beginPath();
      ctx.arc(fx, fy, shieldR, -Math.PI / 2, -Math.PI / 2 + TAU * sp);
      ctx.stroke();
      ctx.restore();
    }
    // vòng miễn dịch lan toả
    if (t > 3.4) {
      for (let k = 0; k < 3; k++) {
        const age = ((t - 3.4) * 0.5 + k / 3) % 1;
        ctx.globalAlpha = (1 - age) * 0.35;
        circle(ctx, fx, fy, shieldR + age * 60, null, '#6ee7ff', 2);
      }
      ctx.globalAlpha = 1;
    }
    // ống tiêm đi vào rồi rút ra
    const sx = lerp(w * 0.97, fx + shieldR + 40, clamp01(t / 1.4));
    const plunge = clamp01((t - 1.5) / 0.7) * 14;
    const sy = fy - 6;
    line(ctx, sx - 26, sy, sx, sy, '#cfd5dd', 2.4);
    rrect(ctx, sx, sy - 9, 72, 18, 4, '#e8f1f8', '#9db4c8', 2);
    ctx.fillStyle = '#6ee7ff';
    ctx.fillRect(sx + 4 + plunge, sy - 5, 46 - plunge, 10);
    line(ctx, sx + 72 + plunge - 14, sy, sx + 96 + plunge - 14, sy, '#9db4c8', 4);
    ctx.strokeStyle = '#9db4c8'; ctx.lineWidth = 1;
    for (let m = 0; m < 4; m++) line(ctx, sx + 14 + m * 13, sy - 8, sx + 14 + m * 13, sy - 2, '#9db4c8', 1);
    // virus bị chặn ngoài lá chắn
    for (let v = 0; v < 5; v++) {
      const va = t * (0.3 + rnd(v) * 0.25) + v * 2.1;
      const vr = shieldR + 34 + Math.sin(t * 2 + v * 1.7) * 10;
      const vx2 = fx + Math.cos(va) * vr, vy2 = fy + Math.sin(va) * vr;
      if (vx2 < -20 || vx2 > w + 20 || vy2 < -20 || vy2 > h + 20) continue;
      circle(ctx, vx2, vy2, 7, '#571f2e', '#ef476f', 2);
      for (let s = 0; s < 6; s++) {
        const sa = s * TAU / 6 + va;
        line(ctx, vx2 + Math.cos(sa) * 7, vy2 + Math.sin(sa) * 7,
          vx2 + Math.cos(sa) * 12, vy2 + Math.sin(sa) * 12, '#ef476f', 2);
      }
    }
  },

  // ---------- Tàu hoả ----------
  train(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#d9c9a3', '#b58e5f', 0.72);
    // đồi phía xa trôi chậm
    ctx.fillStyle = 'rgba(138,107,69,.5)';
    for (let k = 0; k < 2; k++) {
      const off = (-t * (10 + k * 6)) % (w + 300);
      ctx.beginPath();
      ctx.ellipse(off + w * 0.3 + k * 340 + 150, h * 0.72, 210, 60 + k * 18, 0, Math.PI, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#6e4f33'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
    // đường ray + tà vẹt chạy về sau
    const off = -((t * 110) % 34);
    ctx.fillStyle = '#4a3625';
    for (let x = off; x < w + 34; x += 34) ctx.fillRect(x, h * 0.795, 20, 7);
    line(ctx, 0, h * 0.79, w, h * 0.79, '#2f2318', 4);
    line(ctx, 0, h * 0.825, w, h * 0.825, '#2f2318', 4);
    // đầu máy
    const lx = w * 0.3, base = h * 0.79;
    ctx.save();
    ctx.translate(0, Math.sin(t * 22) * 0.7);
    ctx.fillStyle = '#23292e';
    rrect(ctx, lx, base - 74, 118, 44, [20, 4, 0, 0], '#23292e');
    ctx.fillRect(lx + 118, base - 96, 46, 66);
    ctx.fillRect(lx + 112, base - 100, 58, 8);
    ctx.fillRect(lx + 14, base - 96, 14, 24);
    ctx.beginPath();
    ctx.moveTo(lx + 7, base - 96); ctx.lineTo(lx + 35, base - 96);
    ctx.lineTo(lx + 28, base - 108); ctx.lineTo(lx + 14, base - 108);
    ctx.closePath(); ctx.fill();
    circle(ctx, lx + 68, base - 88, 9, '#2e3841');
    ctx.fillStyle = '#c8402f';
    ctx.fillRect(lx - 10, base - 40, 12, 10);
    // bánh xe + tay biên
    const th = -t * 6.2;
    const pins = [];
    for (let i = 0; i < 3; i++) {
      const wx = lx + 28 + i * 46, wy = base - 15;
      circle(ctx, wx, wy, 16, '#15181c', '#3a4550', 3);
      ctx.save();
      ctx.translate(wx, wy); ctx.rotate(th);
      for (let s = 0; s < 3; s++) { ctx.rotate(Math.PI / 3); line(ctx, -13, 0, 13, 0, '#3a4550', 2.4); }
      ctx.restore();
      pins.push([wx + Math.cos(th) * 9, wy + Math.sin(th) * 9]);
    }
    ctx.strokeStyle = '#8a94a3'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pins[0][0], pins[0][1]);
    ctx.lineTo(pins[1][0], pins[1][1]);
    ctx.lineTo(pins[2][0], pins[2][1]);
    ctx.stroke();
    ctx.restore();
    // khói
    for (let k = 0; k < 7; k++) {
      const age = (t * 0.75 + k * 0.27) % 1;
      ctx.globalAlpha = (1 - age) * 0.5;
      circle(ctx, lx + 21 + age * -70, base - 112 - age * 62,
        5 + age * 17, k % 2 ? '#d5d0c8' : '#b9b3aa');
    }
    ctx.globalAlpha = 1;
  },

  // ---------- Tiến hoá ----------
  evolution(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#1a2233', '#0d1420');
    const groundY = h * 0.78;
    line(ctx, w * 0.06, groundY, w * 0.94, groundY, 'rgba(160,190,230,.3)', 2);
    const spineAngles = [1.25, 0.85, 0.35, 0.04];
    const legLens = [17, 20, 24, 28];
    const spineLens = [30, 34, 40, 44];
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = clamp01((t % 11 - i * 1.15) / 0.8);
      if (a <= 0) continue;
      const x = w * (0.16 + 0.22 * i), bob = Math.sin(t * 3 + i) * 1.5;
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#e8eef7'; ctx.fillStyle = '#e8eef7';
      ctx.save();
      ctx.translate(x, groundY + bob * 0.4);
      const hipY = -legLens[i];
      // chân
      ctx.lineWidth = 4.6;
      const ph = t * 4 + i;
      line(ctx, 0, hipY, Math.sin(ph) * 6, 0, '#e8eef7', 4.6);
      line(ctx, 0, hipY, -Math.sin(ph) * 6, 0, '#e8eef7', 4.6);
      // cột sống
      const na = -Math.PI / 2 + spineAngles[i] * (i === 0 ? 1.15 : 1);
      const nx = Math.cos(na) * spineLens[i], ny = hipY + Math.sin(na) * spineLens[i];
      ctx.lineWidth = 6;
      line(ctx, 0, hipY, nx, ny, '#e8eef7', 6);
      // tay (con đầu chống đất)
      ctx.lineWidth = 4.2;
      const armX = nx * 0.72, armY = hipY + (ny - hipY) * 0.72;
      if (i === 0) line(ctx, armX, armY, armX + 12, 0, '#e8eef7', 4.2);
      else {
        line(ctx, armX, armY, armX + Math.sin(ph + Math.PI) * 7,
          armY + legLens[i] * 0.8, '#e8eef7', 4.2);
      }
      // gậy/đuốc cho người hiện đại
      if (i === 3 && a === 1) {
        line(ctx, armX + Math.sin(ph + Math.PI) * 7, armY + legLens[i] * 0.8,
          armX + 14, armY - 26, '#8a6b45', 3);
        const fx2 = armX + 14, fy2 = armY - 30;
        glow(ctx, fx2, fy2, 16, 'rgba(255,160,60,.9)', 0.8);
        circle(ctx, fx2, fy2 + Math.sin(t * 8) * 1.2, 4, '#ffb703');
      }
      circle(ctx, nx, ny - 7, 7 + i * 0.7, '#e8eef7');
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    ctx.lineCap = 'butt';
    // mũi tên chuyển tiếp
    ctx.strokeStyle = 'rgba(255,200,87,.5)';
    for (let i = 0; i < 3; i++) {
      const a = clamp01((t % 11 - (i + 1) * 1.15) / 0.8) * 0.7;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      const x = w * (0.27 + 0.22 * i);
      line(ctx, x, h * 0.5, x + 12, h * 0.53, 'rgba(255,200,87,.6)', 2.6);
      line(ctx, x + 12, h * 0.53, x, h * 0.56, 'rgba(255,200,87,.6)', 2.6);
    }
    ctx.globalAlpha = 1;
  },

  // ---------- Điện thoại ----------
  phone(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#141d2c', '#0b111c');
    const y = h * 0.56;
    const lx = w * 0.18, rx = w * 0.82;
    // dây nối võng xuống
    ctx.strokeStyle = '#6b7f99'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lx + 24, y - 44);
    ctx.quadraticCurveTo(w / 2, h * 0.88, rx - 24, y - 44);
    ctx.stroke();
    // hai máy điện thoại kiểu chân nến
    for (const [px, flip] of [[lx, 1], [rx, -1]]) {
      ctx.save();
      ctx.translate(px, y); ctx.scale(flip, 1);
      // rung khi có tín hiệu đến
      const p = (t * 0.55) % 2;
      const incoming = flip === 1 ? (p > 1.82) : (p > 0.82 && p < 1);
      if (incoming) ctx.rotate(Math.sin(t * 45) * 0.03);
      ctx.fillStyle = '#1f2a3a';
      ctx.beginPath();
      ctx.moveTo(-30, 44); ctx.lineTo(30, 44); ctx.lineTo(18, 28); ctx.lineTo(-18, 28);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3d5068'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillRect(-6, -30, 12, 58);
      circle(ctx, 0, -38, 15, '#1f2a3a', '#3d5068', 2);
      circle(ctx, 0, -38, 6, '#0b111c');
      // ống nghe treo bên hông
      line(ctx, 14, -20, 30, -20, '#3d5068', 3);
      rrect(ctx, 26, -34, 12, 30, 5, '#1f2a3a', '#3d5068', 2);
      ctx.restore();
    }
    // xung tín hiệu chạy trên dây
    const p = (t * 0.55) % 2;
    const dir = p < 1;
    const q = dir ? p : p - 1;
    const bez = (a, b, c, s) => (1 - s) * (1 - s) * a + 2 * (1 - s) * s * b + s * s * c;
    const s = dir ? q : 1 - q;
    const sx2 = bez(lx + 24, w / 2, rx - 24, s);
    const sy2 = bez(y - 44, h * 0.88, y - 44, s);
    glow(ctx, sx2, sy2, 22, 'rgba(255,200,87,1)', 0.9);
    circle(ctx, sx2, sy2, 4, '#ffd166');
    // sóng âm ở máy đang nói
    const talkX = dir ? lx : rx, dirSign = dir ? 1 : -1;
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = (0.7 - k * 0.2) * (0.5 + 0.5 * Math.sin(t * 7 - k));
      ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(talkX + dirSign * 26, y - 38, 12 + k * 9,
        dirSign === 1 ? -0.7 : Math.PI - 0.7, dirSign === 1 ? 0.7 : Math.PI + 0.7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  // ---------- Bóng đèn ----------
  bulb(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#070a12', '#04060b');
    const cx = w / 2, cy = h * 0.44, r = 56;
    // độ sáng: nhấp nháy rồi ổn định
    let b;
    if (t < 0.8) b = 0;
    else if (t < 2) b = rnd(Math.floor(t * 13)) > 0.4 ? 0.65 : 0.12;
    else b = 0.92 + 0.08 * Math.sin(t * 1.6);
    if (b > 0.05) {
      glow(ctx, cx, cy, 70 + 150 * b, 'rgba(255,190,90,.85)', 0.6 * b);
      ctx.strokeStyle = `rgba(255,209,102,${0.55 * b})`;
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 + 0.13;
        const inner = r + 16, len = 17 + 8 * Math.sin(t * 3.2 + i * 1.8);
        line(ctx, cx + Math.cos(a) * inner, cy + Math.sin(a) * inner,
          cx + Math.cos(a) * (inner + len), cy + Math.sin(a) * (inner + len),
          `rgba(255,209,102,${0.5 * b})`, 2.4);
      }
    }
    // bóng thuỷ tinh
    circle(ctx, cx, cy, r, `rgba(255,220,150,${0.06 + 0.1 * b})`, 'rgba(220,230,245,.4)', 2.5);
    // cổ + đui xoáy
    ctx.strokeStyle = 'rgba(220,230,245,.4)'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + r - 8);
    ctx.lineTo(cx - 14, cy + r + 18);
    ctx.moveTo(cx + 20, cy + r - 8);
    ctx.lineTo(cx + 14, cy + r + 18);
    ctx.stroke();
    ctx.fillStyle = '#5a6473';
    ctx.fillRect(cx - 15, cy + r + 18, 30, 26);
    ctx.strokeStyle = '#39414d';
    for (let i = 1; i < 4; i++) {
      line(ctx, cx - 15, cy + r + 18 + i * 6, cx + 15, cy + r + 16 + i * 6, '#39414d', 2);
    }
    ctx.fillStyle = '#39414d';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy + r + 44); ctx.lineTo(cx + 15, cy + r + 44);
    ctx.lineTo(cx + 5, cy + r + 52); ctx.lineTo(cx - 5, cy + r + 52);
    ctx.closePath(); ctx.fill();
    // trụ đỡ + sợi đốt
    line(ctx, cx - 10, cy + r - 4, cx - 10, cy + 8, 'rgba(200,210,225,.5)', 1.6);
    line(ctx, cx + 10, cy + r - 4, cx + 10, cy + 8, 'rgba(200,210,225,.5)', 1.6);
    ctx.strokeStyle = b > 0.1 ? `rgba(255,183,3,${0.5 + 0.5 * b})` : 'rgba(150,150,150,.6)';
    ctx.lineWidth = 2.2;
    if (b > 0.4) { ctx.shadowColor = '#ffb703'; ctx.shadowBlur = 14 * b; }
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 8);
    for (let i = 0; i <= 8; i++) {
      const px = cx - 10 + (20 / 8) * i;
      ctx.arc(px, cy + 4, 2.6, Math.PI, 0, i % 2 === 1);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  },

  // ---------- Ô tô ----------
  car(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#cdbfa3', '#a8927a', 0.72);
    // dãy nhà phố cổ trôi chậm
    ctx.fillStyle = 'rgba(90,74,58,.4)';
    const boff = -(t * 26) % 160;
    for (let x = boff - 160; x < w + 160; x += 160) {
      const bh = 60 + rnd(Math.floor((x - boff) / 160) + 3) * 50;
      ctx.fillRect(x, h * 0.72 - bh, 120, bh);
    }
    ctx.fillStyle = '#57493a'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
    // vạch đường trôi
    const doff = -(t * 120) % 70;
    ctx.fillStyle = 'rgba(230,220,200,.35)';
    for (let x = doff; x < w + 70; x += 70) ctx.fillRect(x, h * 0.86, 34, 4);
    // Benz Patent-Motorwagen
    const cx = w * 0.46, base = h * 0.82;
    const jit = Math.sin(t * 26) * 0.9;
    ctx.save();
    ctx.translate(0, jit);
    const rear = [cx + 52, base - 34, 34], front = [cx - 66, base - 22, 22];
    for (const [wx, wy, wr] of [rear, front]) {
      circle(ctx, wx, wy, wr, null, '#2f2a24', 5);
      ctx.save();
      ctx.translate(wx, wy); ctx.rotate(-t * 4.2);
      for (let s = 0; s < 6; s++) {
        ctx.rotate(Math.PI / 3);
        line(ctx, 0, 0, wr - 3, 0, '#2f2a24', 1.8);
      }
      ctx.restore();
    }
    // khung xe + ghế + động cơ
    line(ctx, cx - 66, base - 22, cx - 10, base - 40, '#2f2a24', 5);
    line(ctx, cx - 10, base - 40, cx + 52, base - 40, '#2f2a24', 5);
    rrect(ctx, cx - 4, base - 56, 52, 16, 4, '#5a3a22');
    ctx.beginPath();
    ctx.moveTo(cx - 4, base - 56);
    ctx.quadraticCurveTo(cx - 14, base - 78, cx - 2, base - 82);
    ctx.lineTo(cx + 2, base - 60);
    ctx.closePath();
    ctx.fillStyle = '#5a3a22'; ctx.fill();
    rrect(ctx, cx + 8, base - 40, 40, 18, 3, '#3a332b');
    // người lái + cần lái
    circle(ctx, cx + 20, base - 96, 9, '#2f2a24');
    ctx.fillStyle = '#2f2a24';
    ctx.fillRect(cx + 11, base - 100, 18, 5);
    line(ctx, cx + 20, base - 87, cx + 16, base - 58, '#2f2a24', 7);
    line(ctx, cx + 16, base - 72, cx - 30, base - 60, '#2f2a24', 3.4);
    line(ctx, cx - 30, base - 60, cx - 62, base - 24, '#2f2a24', 3);
    ctx.restore();
    // khói pặc pặc phía sau
    for (let k = 0; k < 4; k++) {
      const age = (t * 1.3 + k * 0.26) % 1;
      ctx.globalAlpha = (1 - age) * 0.35;
      circle(ctx, cx + 96 + age * 40, base - 26 - age * 18, 3 + age * 9, '#9a938a');
    }
    ctx.globalAlpha = 1;
  },

  // ---------- Tia X ----------
  xray(ctx, t, w, h) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    rrect(ctx, 18, 14, w - 36, h - 28, 10, null, 'rgba(110,231,255,.3)', 2);
    const cx = w / 2, cy = h * 0.54;
    // quét: vệt sáng chạy ngang, để lại vùng "nhìn thấy xương"
    const scanX = ((t * 130) % (w + 200)) - 100;
    // bàn tay (phần mô mềm)
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-0.06);
    const flesh = 'rgba(190,205,225,.14)';
    rrect(ctx, -46, -20, 92, 96, 30, flesh);
    const fingers = [[-38, -0.42, 62], [-19, -0.2, 78], [0, -0.04, 86], [19, 0.14, 78], [40, 0.42, 48]];
    for (const [fx, fa, flen] of fingers) {
      ctx.save();
      ctx.translate(fx, -12); ctx.rotate(fa);
      rrect(ctx, -9, -flen, 18, flen + 6, 9, flesh);
      ctx.restore();
    }
    // xương — hiện rõ quanh vệt quét
    ctx.restore();
    const boneA = 0.25 + 0.75 * Math.exp(-((scanX - cx) ** 2) / (2 * 90 ** 2));
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-0.06);
    ctx.strokeStyle = `rgba(223,233,255,${boneA})`;
    ctx.lineCap = 'round';
    for (const [fx, fa, flen] of fingers) {
      ctx.save();
      ctx.translate(fx, -12); ctx.rotate(fa);
      ctx.lineWidth = 6;
      const seg = flen / 3;
      for (let s2 = 0; s2 < 3; s2++) {
        line(ctx, 0, -s2 * seg - 3, 0, -(s2 + 1) * seg + 4, `rgba(223,233,255,${boneA})`, 6 - s2);
      }
      ctx.restore();
      ctx.lineWidth = 7;
      line(ctx, fx * 0.75, 62, fx, -8, `rgba(223,233,255,${boneA * 0.85})`, 7);
    }
    ctx.lineCap = 'butt';
    // chiếc nhẫn nổi tiếng trên phim X-quang đầu tiên
    circle(ctx, 19, 16, 9, null, `rgba(255,255,255,${boneA})`, 4);
    ctx.restore();
    // vệt quét
    const grad = ctx.createLinearGradient(scanX - 50, 0, scanX + 50, 0);
    grad.addColorStop(0, 'rgba(110,231,255,0)');
    grad.addColorStop(0.5, 'rgba(110,231,255,.16)');
    grad.addColorStop(1, 'rgba(110,231,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(scanX - 50, 16, 100, h - 32);
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(110,231,255,.5)';
    ctx.textAlign = 'left';
    ctx.fillText('RÖNTGEN · 1895', 30, h - 26);
  },

  // ---------- Máy bay ----------
  plane(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#8ec9e8', '#e8d5b5', 0.75);
    // cồn cát Kitty Hawk
    ctx.fillStyle = '#d9b98a';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.3, h * 0.68, w * 0.55, h * 0.78);
    ctx.quadraticCurveTo(w * 0.8, h * 0.86, w, h * 0.78);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(180,140,90,.35)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.44, h * 0.84, w, h * 0.9);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    // đường ray phóng
    line(ctx, w * 0.08, h * 0.76, w * 0.4, h * 0.76, '#6b5232', 4);
    const cyc = 7, p = (t % cyc) / cyc;
    let px, py, pitch;
    if (p < 0.3) {
      px = lerp(w * 0.08, w * 0.38, easeIn(p / 0.3));
      py = h * 0.72; pitch = 0;
    } else {
      const q = (p - 0.3) / 0.7;
      px = lerp(w * 0.38, w * 1.15, q);
      py = h * 0.72 - easeOut(q) * h * 0.4 + Math.sin(q * 9) * 3;
      pitch = -0.08;
    }
    // bóng trên cát
    const shScale = clamp01(1 - (h * 0.72 - py) / (h * 0.42));
    ctx.globalAlpha = 0.25 * shScale;
    ctx.beginPath();
    ctx.ellipse(px, h * 0.77, 46 * shScale + 8, 5, 0, 0, TAU);
    ctx.fillStyle = '#5a4025'; ctx.fill();
    ctx.globalAlpha = 1;
    // máy bay hai tầng cánh Wright Flyer
    ctx.save();
    ctx.translate(px, py); ctx.rotate(pitch);
    ctx.strokeStyle = '#e3d5b8'; ctx.fillStyle = '#e3d5b8';
    rrect(ctx, -56, -26, 112, 5, 2.5, '#e3d5b8');
    rrect(ctx, -56, 0, 112, 5, 2.5, '#e3d5b8');
    ctx.strokeStyle = '#8a7a5c'; ctx.lineWidth = 2;
    for (let s = 0; s < 5; s++) {
      line(ctx, -52 + s * 26, -21, -52 + s * 26, 0, '#8a7a5c', 2);
    }
    // cánh lái độ cao phía trước
    line(ctx, 56, 2, 84, -4, '#8a7a5c', 2.4);
    rrect(ctx, 78, -12, 26, 4, 2, '#e3d5b8');
    // đuôi
    line(ctx, -56, 2, -88, -2, '#8a7a5c', 2.4);
    rrect(ctx, -94, -14, 5, 22, 2, '#e3d5b8');
    // phi công nằm sấp trên cánh dưới
    ctx.fillStyle = '#4a3b28';
    rrect(ctx, -14, -7, 30, 7, 3.5, '#4a3b28');
    circle(ctx, 19, -4, 4.5, '#4a3b28');
    // cánh quạt quay
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 40);
    ctx.beginPath(); ctx.ellipse(-44, -10, 3, 15, 0, 0, TAU);
    ctx.fillStyle = '#9a8a6a'; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    // vệt gió khi bay
    if (p > 0.34) {
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      for (let i = 0; i < 3; i++) {
        line(ctx, px - 80 - i * 24, py + i * 10 - 8, px - 108 - i * 24, py + i * 10 - 8,
          'rgba(255,255,255,.35)', 2);
      }
    }
  },

  // ---------- Thuyết tương đối ----------
  relativity(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#080c18', '#04060d');
    const cx = w / 2, cy = h * 0.48;
    // lưới không-thời gian bị khối lượng bẻ cong
    ctx.strokeStyle = 'rgba(110,160,255,.22)'; ctx.lineWidth = 1.2;
    const warp = (x, y) => {
      const dx = cx - x, dy = cy - y;
      const r = Math.hypot(dx, dy) + 1;
      const pull = Math.min(30, 1500 / (r + 26));
      return [x + (dx / r) * pull, y + (dy / r) * pull];
    };
    for (let gx = 0; gx <= w; gx += 36) {
      ctx.beginPath();
      for (let gy = 0; gy <= h; gy += 10) {
        const [px, py] = warp(gx, gy);
        gy === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    for (let gy = 0; gy <= h; gy += 36) {
      ctx.beginPath();
      for (let gx = 0; gx <= w; gx += 10) {
        const [px, py] = warp(gx, gy);
        gx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // khối lượng trung tâm
    const pr = 24 + Math.sin(t * 2) * 2;
    glow(ctx, cx, cy, 80, 'rgba(255,200,87,.9)', 0.7);
    circle(ctx, cx, cy, pr, '#ffd98a');
    circle(ctx, cx, cy, pr * 0.55, '#fff3d6');
    // tia sáng bị bẻ cong khi đi qua
    const lp = (t % 4) / 4;
    const lx = lerp(-30, w + 30, lp);
    const bend = (x) => h * 0.26 + 60 * Math.exp(-((x - cx) ** 2) / (2 * 95 ** 2));
    ctx.strokeStyle = 'rgba(110,231,255,.35)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const yy = bend(x);
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const tx = lx - i * 13;
      if (tx < -10 || tx > w + 10) continue;
      ctx.globalAlpha = 1 - i / 10;
      circle(ctx, tx, bend(tx), i === 0 ? 5 : 3.2 - i * 0.2, '#6ee7ff');
    }
    ctx.globalAlpha = 1;
    // E = mc²
    ctx.font = 'italic bold 22px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(255,200,87,${0.6 + 0.3 * Math.sin(t * 2.2)})`;
    ctx.fillText('E = mc²', w - 28, h - 24);
  },

  // ---------- Penicillin ----------
  penicillin(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0e141d', '#090d14');
    const cx = w / 2, cy = h / 2, R = Math.min(h * 0.42, 125);
    // đĩa petri
    circle(ctx, cx, cy, R + 8, 'rgba(159,176,200,.06)', 'rgba(159,176,200,.4)', 2.5);
    circle(ctx, cx, cy, R, '#18232f', 'rgba(159,176,200,.25)', 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(cx, cy, R - 14, -2.6, -1.7); ctx.stroke();
    // đám mốc penicillium lớn dần
    const mgx = cx - 52, mgy = cy - 26;
    const g1 = clamp01((t - 0.8) / 2.2);
    // vòng vô khuẩn lan rộng
    const CR = 18 + clamp01((t - 1.6) / 3.4) * 74;
    // vi khuẩn — mờ dần khi vòng vô khuẩn quét qua
    for (let i = 0; i < 48; i++) {
      const a = rnd(i) * TAU, rr2 = Math.sqrt(rnd(i + 60)) * (R - 12);
      const bx = cx + Math.cos(a) * rr2, by = cy + Math.sin(a) * rr2;
      const dm = Math.hypot(bx - mgx, by - mgy);
      const alive = clamp01((dm - CR + 14) / 14);
      if (alive <= 0.02) continue;
      ctx.globalAlpha = alive * (0.65 + 0.3 * Math.sin(t * 2 + i));
      ctx.beginPath();
      ctx.ellipse(bx, by, 4, 2.2, rnd(i + 5) * 3, 0, TAU);
      ctx.fillStyle = '#e3c15a'; ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (g1 > 0) {
      // ranh giới vùng vô khuẩn
      if (t > 1.6) {
        ctx.setLineDash([6, 7]);
        circle(ctx, mgx, mgy, CR, null, 'rgba(158,201,184,.4)', 1.6);
        ctx.setLineDash([]);
      }
      for (let m = 0; m < 7; m++) {
        const ma = rnd(m + 30) * TAU;
        const md = rnd(m + 40) * 14 * g1;
        circle(ctx, mgx + Math.cos(ma) * md, mgy + Math.sin(ma) * md,
          (7 + rnd(m) * 9) * g1, m % 2 ? '#8fbcab' : '#a8cfc0');
      }
      circle(ctx, mgx, mgy, 8 * g1, '#c4e0d5');
    }
    // chú thích
    const noteA = clamp01((t - 4.2) / 1.2);
    if (noteA > 0) {
      ctx.globalAlpha = noteA;
      ctx.font = 'italic 13px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9fb0c8';
      const lx2 = mgx + CR * 0.72, ly2 = mgy + CR * 0.72;
      line(ctx, lx2, ly2, lx2 + 34, ly2 + 26, 'rgba(159,176,200,.5)', 1.4);
      ctx.fillText('vùng vô khuẩn', lx2 + 40, ly2 + 32);
      ctx.globalAlpha = 1;
    }
  },

  // ---------- Máy tính ENIAC ----------
  computer(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#12161f', '#0a0d13');
    const top = h * 0.14, bot = h * 0.74;
    ctx.fillStyle = '#1d2530';
    ctx.fillRect(w * 0.05, top, w * 0.9, bot - top);
    ctx.strokeStyle = '#10141b'; ctx.lineWidth = 3;
    for (let u = 0; u < 6; u++) {
      const ux = w * 0.05 + u * w * 0.15;
      ctx.strokeRect(ux, top, w * 0.15, bot - top);
    }
    // dàn đèn nhấp nháy
    const frame = Math.floor(t * 5);
    for (let gx = 0; gx < 34; gx++) {
      for (let gy = 0; gy < 7; gy++) {
        const on = rnd(gx * 31 + gy * 7 + frame * 977) > 0.55;
        if (!on) continue;
        ctx.fillStyle = (gx + gy) % 2 ? '#ffd166' : '#6ee7ff';
        ctx.globalAlpha = 0.75 + 0.25 * rnd(gx + gy + frame);
        ctx.fillRect(w * 0.07 + gx * (w * 0.86 / 34), top + 14 + gy * 15, 7, 3.4);
      }
    }
    ctx.globalAlpha = 1;
    // hai cuộn băng quay
    for (const [rx, dir] of [[w * 0.24, 1], [w * 0.36, -1]]) {
      circle(ctx, rx, top + 40, 21, '#141a22', '#39414d', 4);
      ctx.save();
      ctx.translate(rx, top + 40); ctx.rotate(t * 2.2 * dir);
      for (let s = 0; s < 3; s++) { ctx.rotate(TAU / 3); line(ctx, 0, 0, 16, 0, '#39414d', 3); }
      ctx.restore();
    }
    // băng đục lỗ chạy ngang
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath();
    ctx.moveTo(0, bot + 14);
    ctx.quadraticCurveTo(w * 0.5, bot + 34 + Math.sin(t * 1.4) * 5, w, bot + 10);
    ctx.quadraticCurveTo(w * 0.5, bot + 50 + Math.sin(t * 1.4) * 5, 0, bot + 30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a0d13';
    const hoff = (t * 60) % 16;
    for (let x = -hoff; x < w; x += 16) {
      const yy = bot + 22 + Math.sin((x / w) * Math.PI) * 12 + Math.sin(t * 1.4) * 4;
      circle(ctx, x + 8, yy, 2.1, '#0a0d13');
    }
    // màn dao động ký nhỏ
    circle(ctx, w * 0.82, top + 44, 24, '#0d1a14', '#39414d', 3);
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.6;
    ctx.save();
    ctx.beginPath(); ctx.arc(w * 0.82, top + 44, 21, 0, TAU); ctx.clip();
    ctx.beginPath();
    for (let x = -21; x <= 21; x += 2) {
      const yy = top + 44 + Math.sin(x * 0.4 - t * 7) * 9;
      x === -21 ? ctx.moveTo(w * 0.82 + x, yy) : ctx.lineTo(w * 0.82 + x, yy);
    }
    ctx.stroke();
    ctx.restore();
  },

  // ---------- DNA ----------
  dna(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0a0f1c', '#060a13');
    const cx = w / 2, top = h * 0.08, span = h * 0.84, N = 40;
    const pairColors = [['#ef476f', '#06d6a0'], ['#ffd166', '#4cc9f0']];
    // vẽ 2 lượt: mặt sau trước, mặt trước sau
    for (const front of [false, true]) {
      for (let i = 0; i <= N; i++) {
        const y = top + (i / N) * span;
        const ph = i * 0.36 + t * 1.5;
        const x1 = cx + Math.sin(ph) * 74;
        const x2 = cx + Math.sin(ph + Math.PI) * 74;
        const d1 = Math.cos(ph) > 0, d2 = Math.cos(ph + Math.PI) > 0;
        // thanh ngang cặp bazơ
        if (i % 4 === 2 && front === d1) {
          const [ca, cb] = pairColors[Math.floor(rnd(i) * 2)];
          const mid = (x1 + x2) / 2;
          ctx.globalAlpha = d1 ? 0.95 : 0.4;
          line(ctx, x1, y, mid, y, ca, 3.6);
          line(ctx, mid, y, x2, y, cb, 3.6);
        }
        if (front === d1) {
          ctx.globalAlpha = d1 ? 1 : 0.38;
          circle(ctx, x1, y, 5, '#6ee7ff');
        }
        if (front === d2) {
          ctx.globalAlpha = d2 ? 1 : 0.38;
          circle(ctx, x2, y, 5, '#9db4ff');
        }
      }
    }
    ctx.globalAlpha = 1;
  },

  // ---------- Sputnik ----------
  sputnik(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#060a18', '#04060f');
    drawStars(ctx, w, h, t, 55, 41, 1);
    // Trái Đất góc dưới
    const ex = w * 0.2, ey = h * 0.95, er = 135;
    glow(ctx, ex, ey, er + 40, 'rgba(80,150,255,.5)', 0.5);
    circle(ctx, ex, ey, er, '#1b4a7a');
    ctx.save();
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.clip();
    ctx.fillStyle = '#2a6db5';
    circle(ctx, ex - 30, ey - 40, 90, 'rgba(42,109,181,.6)');
    ctx.fillStyle = '#3f8f5f';
    ctx.beginPath(); ctx.ellipse(ex - 60, ey - 80, 42, 24, 0.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + 40, ey - 110, 30, 18, -0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + 80, ey - 40, 36, 22, 0.2, 0, TAU); ctx.fill();
    ctx.restore();
    // quỹ đạo
    const oa = 195, ob = 148, rot = -0.32;
    ctx.save();
    ctx.translate(ex, ey); ctx.rotate(rot);
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(160,190,230,.3)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(0, 0, oa, ob, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    // vệ tinh trên quỹ đạo
    const sa = t * 0.72;
    const sx = Math.cos(sa) * oa, sy = Math.sin(sa) * ob;
    // ăng-ten
    ctx.strokeStyle = '#9aa3ad';
    for (const da of [2.4, 2.8, -2.4, -2.8]) {
      line(ctx, sx, sy, sx + Math.cos(sa + da) * 30, sy + Math.sin(sa + da) * 30, '#9aa3ad', 1.6);
    }
    const grad = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, 10);
    grad.addColorStop(0, '#f4f7fa');
    grad.addColorStop(1, '#8b95a1');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(sx, sy, 10, 0, TAU); ctx.fill();
    // sóng "bíp bíp"
    for (let k = 0; k < 2; k++) {
      const age = ((t * 1.1) + k * 0.5) % 1;
      ctx.globalAlpha = (1 - age) * 0.55;
      circle(ctx, sx, sy, 13 + age * 30, null, '#6ee7ff', 2);
    }
    ctx.globalAlpha = 1;
    ctx.rotate(-rot);
    ctx.restore();
    // tín hiệu chữ
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(110,231,255,${0.4 + 0.35 * Math.sin(t * 6)})`;
    ctx.fillText('bíp… bíp… bíp…', w - 26, h * 0.14);
  },

  // ---------- Mặt Trăng ----------
  moon(ctx, t, w, h) {
    const cyc = 11, e = t % cyc;
    const phaseB = clamp01((e - 4.2) / 0.6);
    // ---- cảnh phóng ----
    if (phaseB < 1) {
      ctx.globalAlpha = 1 - phaseB;
      bgGrad(ctx, w, h, '#0a1024', '#050810');
      drawStars(ctx, w, h, t, 40, 51, 0.8);
      ctx.fillStyle = '#101620'; ctx.fillRect(0, h * 0.88, w, h * 0.12);
      // tháp phóng
      ctx.strokeStyle = '#39414d'; ctx.lineWidth = 3;
      line(ctx, w * 0.52, h * 0.88, w * 0.52, h * 0.42, '#39414d', 4);
      for (let i = 0; i < 6; i++) {
        line(ctx, w * 0.52, h * 0.46 + i * h * 0.07, w * 0.49, h * 0.5 + i * h * 0.07, '#39414d', 2);
      }
      const q = easeIn(clamp01(e / 4.2));
      const ry = h * 0.74 - q * h * 1.2;
      const rx = w * 0.44;
      // tên lửa Saturn V
      ctx.fillStyle = '#e8e4d8';
      rrect(ctx, rx - 10, ry - 62, 20, 62, 3, '#e8e4d8');
      ctx.fillStyle = '#c8402f';
      ctx.beginPath();
      ctx.moveTo(rx - 10, ry - 62); ctx.lineTo(rx, ry - 84); ctx.lineTo(rx + 10, ry - 62);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#23292e';
      ctx.fillRect(rx - 10, ry - 34, 20, 5);
      ctx.beginPath();
      ctx.moveTo(rx - 10, ry); ctx.lineTo(rx - 18, ry + 12); ctx.lineTo(rx - 10, ry + 6);
      ctx.moveTo(rx + 10, ry); ctx.lineTo(rx + 18, ry + 12); ctx.lineTo(rx + 10, ry + 6);
      ctx.fill();
      // lửa đuôi
      if (e > 0.25) {
        const fl = 26 + rnd(Math.floor(t * 20)) * 16 + q * 26;
        const gf = ctx.createLinearGradient(rx, ry + 4, rx, ry + 4 + fl);
        gf.addColorStop(0, '#fff3c9');
        gf.addColorStop(0.4, '#ffb703');
        gf.addColorStop(1, 'rgba(230,80,30,0)');
        ctx.fillStyle = gf;
        ctx.beginPath();
        ctx.moveTo(rx - 9, ry + 4);
        ctx.quadraticCurveTo(rx, ry + 4 + fl * 1.25, rx + 9, ry + 4);
        ctx.closePath(); ctx.fill();
      }
      // khói dưới bệ
      if (e < 2.2) {
        for (let k = 0; k < 8; k++) {
          const age = clamp01((e - 0.2) / 1.6) * (0.4 + rnd(k) * 0.6);
          ctx.globalAlpha = (1 - phaseB) * (1 - age) * 0.4;
          circle(ctx, rx + (rnd(k) - 0.5) * 110 * age * 2, h * 0.88 - age * 14,
            6 + age * 22, '#b9b3aa');
        }
      }
      ctx.globalAlpha = 1;
    }
    // ---- cảnh Mặt Trăng ----
    if (phaseB > 0) {
      ctx.globalAlpha = phaseB;
      ctx.fillStyle = '#020307'; ctx.fillRect(0, 0, w, h);
      drawStars(ctx, w, h, t, 40, 61, 0.7);
      // Trái Đất xa xăm
      const ex = w * 0.16, ey = h * 0.2;
      glow(ctx, ex, ey, 40, 'rgba(90,160,255,.7)', 0.6 * phaseB);
      circle(ctx, ex, ey, 19, '#2a6db5');
      ctx.save();
      ctx.beginPath(); ctx.arc(ex, ey, 19, 0, TAU); ctx.clip();
      ctx.fillStyle = '#3f8f5f';
      ctx.beginPath(); ctx.ellipse(ex - 6, ey - 4, 9, 6, 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.ellipse(ex + 5, ey + 6, 8, 4, -0.4, 0, TAU); ctx.fill();
      ctx.restore();
      // bề mặt trăng
      const my = h * 0.7;
      ctx.fillStyle = '#a8a8ab';
      ctx.beginPath();
      ctx.moveTo(0, my + 20);
      ctx.quadraticCurveTo(w * 0.5, my - 26, w, my + 14);
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(70,70,76,.5)';
      for (let c = 0; c < 6; c++) {
        ctx.beginPath();
        ctx.ellipse(rnd(c + 3) * w, my + 16 + rnd(c + 9) * (h - my - 20),
          8 + rnd(c) * 20, 4 + rnd(c) * 7, 0, 0, TAU);
        ctx.fill();
      }
      // mô-đun đổ bộ
      const lx = w * 0.68, ly = my + 6;
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.moveTo(lx - 24, ly); ctx.lineTo(lx - 18, ly - 26); ctx.lineTo(lx + 18, ly - 26);
      ctx.lineTo(lx + 24, ly); ctx.closePath(); ctx.fill();
      rrect(ctx, lx - 14, ly - 48, 28, 24, 5, '#d5d0c8', '#8b95a1', 2);
      line(ctx, lx - 22, ly, lx - 34, ly + 16, '#8b95a1', 3);
      line(ctx, lx + 22, ly, lx + 34, ly + 16, '#8b95a1', 3);
      ctx.fillStyle = '#8b95a1';
      ctx.fillRect(lx - 38, ly + 15, 9, 3);
      ctx.fillRect(lx + 29, ly + 15, 9, 3);
      // phi hành gia nhún nhảy bước đi
      const ax = w * 0.44 - Math.min((e - 4.8) * 6, 40);
      const hop = -Math.abs(Math.sin((e - 4.2) * 2.4)) * 7;
      const ay = my + 16 + hop;
      ctx.fillStyle = '#e8e4d8';
      rrect(ctx, ax - 9, ay - 34, 18, 24, 7, '#e8e4d8');
      circle(ctx, ax, ay - 41, 9, '#e8e4d8');
      circle(ctx, ax + 2, ay - 41, 5.5, '#3a2c14');
      rrect(ctx, ax - 13, ay - 32, 5, 14, 2, '#d5d0c8');
      line(ctx, ax - 4, ay - 10, ax - 8, ay + 2, '#e8e4d8', 5);
      line(ctx, ax + 4, ay - 10, ax + 8, ay + 2, '#e8e4d8', 5);
      // dấu chân
      ctx.fillStyle = 'rgba(70,70,76,.6)';
      for (let f = 0; f < 5; f++) {
        const fx2 = w * 0.44 + 14 + f * 13;
        if (fx2 < w * 0.44 - Math.min((e - 4.8) * 6, 40) + 16) continue;
        ctx.beginPath(); ctx.ellipse(fx2, my + 20 + (f % 2) * 4, 4, 2, 0, 0, TAU); ctx.fill();
      }
      // lá cờ tung "bay" (không có gió nhưng có thanh ngang!)
      const gx2 = w * 0.34;
      line(ctx, gx2, my + 18, gx2, my - 34, '#d5d0c8', 3);
      ctx.fillStyle = '#c8402f';
      ctx.beginPath();
      ctx.moveTo(gx2, my - 34);
      for (let s = 0; s <= 8; s++) {
        const fx3 = gx2 + s * 4.5;
        ctx.lineTo(fx3, my - 34 + Math.sin(s * 0.9 + t * 3) * 1.6);
      }
      for (let s = 8; s >= 0; s--) {
        const fx3 = gx2 + s * 4.5;
        ctx.lineTo(fx3, my - 12 + Math.sin(s * 0.9 + t * 3) * 1.6);
      }
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  // ---------- Internet ----------
  internet(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0a0f1a', '#060a12');
    ctx.fillStyle = 'rgba(110,160,255,.08)';
    for (let gx = 20; gx < w; gx += 40) {
      for (let gy = 20; gy < h; gy += 40) ctx.fillRect(gx, gy, 2, 2);
    }
    // các nút mạng
    const nodes = [[0.5, 0.5]];
    for (let i = 1; i < 12; i++) {
      nodes.push([0.12 + rnd(i * 3) * 0.76, 0.14 + rnd(i * 7 + 2) * 0.7]);
    }
    const pts = nodes.map(([nx, ny]) => [nx * w, ny * h]);
    const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6], [3, 7], [4, 8],
      [5, 9], [6, 10], [7, 11], [1, 6], [2, 8], [5, 11]];
    ctx.strokeStyle = 'rgba(76,201,240,.22)'; ctx.lineWidth = 1.4;
    for (const [a, b] of edges) {
      line(ctx, pts[a][0], pts[a][1], pts[b][0], pts[b][1], 'rgba(76,201,240,.2)', 1.4);
    }
    // gói tin chạy trên cạnh
    for (let e = 0; e < edges.length; e++) {
      const [a, b] = edges[e];
      const sp = 0.35 + rnd(e) * 0.35;
      const p = (t * sp + rnd(e + 20)) % 1;
      const px = lerp(pts[a][0], pts[b][0], p);
      const py = lerp(pts[a][1], pts[b][1], p);
      glow(ctx, px, py, 14, 'rgba(255,209,102,1)', 0.5);
      circle(ctx, px, py, 3, '#ffd166');
      // nút sáng lên khi gói tin đến
      if (p > 0.93) {
        const k = (p - 0.93) / 0.07;
        ctx.globalAlpha = 1 - k;
        circle(ctx, pts[b][0], pts[b][1], 9 + k * 12, null, '#ffd166', 2);
        ctx.globalAlpha = 1;
      }
    }
    // vẽ nút sau cùng để nổi trên cạnh
    pts.forEach(([px, py], i) => {
      const r = i === 0 ? 11 : 6.5;
      glow(ctx, px, py, r * 2.4, 'rgba(76,201,240,.8)', i === 0 ? 0.5 : 0.3);
      circle(ctx, px, py, r, '#0f1b2e', '#4cc9f0', 2.2);
      if (i === 0) circle(ctx, px, py, 4, '#4cc9f0');
    });
  },

  // ---------- World Wide Web ----------
  www(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0d1320', '#080d17');
    const bx = w * 0.15, by = h * 0.1, bw = w * 0.7, bh = h * 0.78;
    rrect(ctx, bx, by, bw, bh, 12, '#10192a', '#2c3e57', 2);
    // thanh tiêu đề trình duyệt
    rrect(ctx, bx, by, bw, 36, [12, 12, 0, 0], '#182338');
    circle(ctx, bx + 20, by + 18, 5, '#ef476f');
    circle(ctx, bx + 38, by + 18, 5, '#ffd166');
    circle(ctx, bx + 56, by + 18, 5, '#06d6a0');
    rrect(ctx, bx + 76, by + 9, bw - 100, 18, 9, '#0b1322', '#2c3e57', 1.4);
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9fb0c8';
    ctx.fillText('http://info.cern.ch', bx + 88, by + 22);
    // nội dung trang: 3 trang luân phiên
    const e = t % 9, page = Math.floor(e / 3), pe = e % 3;
    const slide = (1 - easeOut(clamp01(pe / 0.4))) * 46;
    if (pe < 0.3) {
      rrect(ctx, bx + 76, by + 25, (bw - 100) * (pe / 0.3), 2, 1, '#4cc9f0');
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx + 2, by + 38, bw - 4, bh - 40);
    ctx.clip();
    ctx.translate(slide, 0);
    ctx.globalAlpha = clamp01(pe / 0.4);
    const cy0 = by + 58;
    rrect(ctx, bx + 26, cy0, 130 + rnd(page) * 110, 13, 4, '#d5dce8');
    for (let l = 0; l < 5; l++) {
      const lw2 = (0.45 + rnd(page * 9 + l) * 0.45) * (bw - 60);
      rrect(ctx, bx + 26, cy0 + 30 + l * 21, lw2, 8, 3, 'rgba(159,176,200,.4)');
    }
    // hai đường link xanh
    const links = [];
    for (let l = 0; l < 2; l++) {
      const ly = cy0 + 148 + l * 26;
      const lw3 = 90 + rnd(page * 5 + l) * 70;
      rrect(ctx, bx + 26, ly, lw3, 9, 3, '#4cc9f0');
      line(ctx, bx + 26, ly + 13, bx + 26 + lw3, ly + 13, 'rgba(76,201,240,.7)', 1.6);
      links.push([bx + 26 + lw3 / 2, ly + 5]);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // con trỏ chuột di chuyển và bấm link
    const target = links[page % 2] || [w / 2, h / 2];
    let mx2 = w * 0.62, my2 = h * 0.72;
    if (pe > 1.6) {
      const q = easeOut(clamp01((pe - 1.6) / 0.7));
      mx2 = lerp(w * 0.62, target[0] + slide, q);
      my2 = lerp(h * 0.72, target[1], q);
    }
    if (pe > 2.5) {
      const k = (pe - 2.5) / 0.5;
      ctx.globalAlpha = 1 - k;
      circle(ctx, mx2, my2, 6 + k * 16, null, '#ffd166', 2);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#f0f4fa';
    ctx.strokeStyle = '#0d1320'; ctx.lineWidth = 1.5;
    ctx.save();
    ctx.translate(mx2, my2);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(3.6, 11.6); ctx.lineTo(6.4, 17.4);
    ctx.lineTo(8.8, 16.2); ctx.lineTo(6, 10.4); ctx.lineTo(10.8, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  },

  // ---------- Điện thoại thông minh ----------
  smartphone(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0c111c', '#080b13');
    glow(ctx, w / 2, h / 2, 220, 'rgba(60,90,160,.35)', 0.5);
    const pw = 152, ph2 = h * 0.86, px = w / 2 - pw / 2, py = h * 0.07;
    rrect(ctx, px - 5, py - 5, pw + 10, ph2 + 10, 26, '#0a0d14', '#3a4a5f', 3);
    // màn hình
    const sg = ctx.createLinearGradient(px, py, px + pw, py + ph2);
    sg.addColorStop(0, '#152647'); sg.addColorStop(1, '#251739');
    ctx.save();
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph2, 20); ctx.clip();
    ctx.fillStyle = sg; ctx.fillRect(px, py, pw, ph2);
    // thanh trạng thái
    ctx.font = 'bold 10px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#e8eef7';
    ctx.textAlign = 'left';
    ctx.fillText('9:41', px + 12, py + 16);
    rrect(ctx, px + pw - 26, py + 8, 16, 8, 2, null, '#e8eef7', 1.2);
    ctx.fillRect(px + pw - 24, py + 10, 10, 4);
    // lưới icon bung ra lần lượt
    const iconColors = ['#4cc9f0', '#ef476f', '#06d6a0', '#ffd166', '#b388eb',
      '#f4845f', '#43aa8b', '#577590', '#f9c74f', '#90be6d',
      '#f94144', '#277da1', '#f8961e', '#4d908e', '#9b5de5', '#00bbf9'];
    const cell = pw / 4;
    const e = t % 6.5;
    for (let i = 0; i < 16; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const start = 0.35 + i * 0.07;
      const q = clamp01((e - start) / 0.3);
      if (q <= 0) continue;
      const s = q < 1 ? 0.6 + 0.4 * q + 0.18 * Math.sin(q * Math.PI) : 1;
      const ix = px + col * cell + cell / 2, iy = py + 44 + row * cell + cell / 2;
      // icon bị bấm co nhẹ lại
      const isTapped = i === 9 && e > 3.4 && e < 3.8;
      ctx.save();
      ctx.translate(ix, iy);
      ctx.scale(s * (isTapped ? 0.85 : 1), s * (isTapped ? 0.85 : 1));
      rrect(ctx, -15, -15, 30, 30, 8, iconColors[i]);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      circle(ctx, -5, -5, 5, 'rgba(255,255,255,.3)');
      ctx.restore();
    }
    // ngón tay chạm
    if (e > 2.6 && e < 4) {
      const q = easeOut(clamp01((e - 2.6) / 0.7));
      const tx2 = lerp(px + pw + 30, px + cell * 1.5, q);
      const ty2 = lerp(py + ph2, py + 44 + cell * 2.5, q);
      if (e > 3.4) {
        const k = clamp01((e - 3.4) / 0.6);
        ctx.globalAlpha = 1 - k;
        circle(ctx, px + cell * 1.5, py + 44 + cell * 2.5, 10 + k * 26, null, '#fff', 2);
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = 0.5;
      circle(ctx, tx2, ty2, 13, 'rgba(255,255,255,.5)');
      ctx.globalAlpha = 1;
    }
    // banner thông báo rơi xuống
    if (e > 4.4) {
      const q = e < 5 ? easeOut((e - 4.4) / 0.6) : e > 6 ? 1 - easeIn((e - 6) / 0.5) : 1;
      const byy = py + lerp(-44, 8, q);
      rrect(ctx, px + 7, byy, pw - 14, 36, 10, 'rgba(20,30,52,.96)', '#3a4a5f', 1.4);
      circle(ctx, px + 25, byy + 18, 9, '#4cc9f0');
      rrect(ctx, px + 40, byy + 10, 66, 6, 2, 'rgba(232,238,247,.85)');
      rrect(ctx, px + 40, byy + 21, 88, 5, 2, 'rgba(159,176,200,.5)');
    }
    ctx.restore();
    // tai thỏ loa
    rrect(ctx, w / 2 - 22, py + 2, 44, 5, 3, '#0a0d14');
  },

  // ---------- Trí tuệ nhân tạo ----------
  ai(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#080c16', '#05070d');
    const layersX = [0.16, 0.39, 0.62, 0.85].map(v => v * w);
    const counts = [3, 5, 5, 3];
    const nodePos = [];
    counts.forEach((n, li) => {
      const col = [];
      for (let i = 0; i < n; i++) {
        col.push([layersX[li], h / 2 + (i - (n - 1) / 2) * (h * 0.7 / Math.max(n - 1, 1))]);
      }
      nodePos.push(col);
    });
    const cyc = 2.8, f = (t % cyc) / cyc;
    // sóng kích hoạt truyền qua từng lớp
    const act = li => Math.exp(-((f * 4.4 - li - 0.5) ** 2) * 2.2);
    // cạnh + tín hiệu
    for (let li = 0; li < 3; li++) {
      for (const [x1, y1] of nodePos[li]) {
        for (const [x2, y2] of nodePos[li + 1]) {
          ctx.strokeStyle = `rgba(110,160,255,${0.09 + act(li) * 0.2})`;
          ctx.lineWidth = 1.2;
          line(ctx, x1, y1, x2, y2, ctx.strokeStyle, 1.2);
          const q = f * 4.4 - li - 0.5;
          if (q > 0 && q < 1) {
            circle(ctx, lerp(x1, x2, q), lerp(y1, y2, q), 2.4,
              `rgba(255,209,102,${0.85 * Math.sin(q * Math.PI)})`);
          }
        }
      }
    }
    // nút
    nodePos.forEach((col, li) => {
      const a = act(li);
      for (const [x, y] of col) {
        if (a > 0.12) glow(ctx, x, y, 26 * a + 10, 'rgba(110,231,255,.9)', a * 0.6);
        circle(ctx, x, y, 8.5, '#0f1b2e', `rgba(110,231,255,${0.4 + a * 0.6})`, 2.2);
        if (a > 0.3) circle(ctx, x, y, 3.4, `rgba(110,231,255,${a})`);
      }
    });
    // chớp sáng ở đầu ra
    const outA = act(3);
    if (outA > 0.4) {
      const [ox, oy] = nodePos[3][1];
      ctx.strokeStyle = `rgba(255,209,102,${outA * 0.8})`;
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + t;
        line(ctx, ox + Math.cos(a) * 16, oy + Math.sin(a) * 16,
          ox + Math.cos(a) * (24 + outA * 10), oy + Math.sin(a) * (24 + outA * 10),
          ctx.strokeStyle, 2);
      }
    }
    // các "tia sáng ý tưởng" trôi nổi
    ctx.font = '13px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 5; i++) {
      const sx = rnd(i + 70) * w;
      const sy = (rnd(i + 80) * h + t * 12 * (0.4 + rnd(i))) % h;
      ctx.fillStyle = `rgba(232,238,247,${0.14 + 0.14 * Math.sin(t * 2 + i * 2)})`;
      ctx.fillText('✦', sx, h - sy);
    }
  },

  // ---------- Đồ gốm ----------
  pottery(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#1c110a', '#0a0503');
    const cx = w * 0.42, wheelY = h * 0.78;
    // lò nung phía sau: vòm đất nung, ánh lửa bên trong nhấp nháy
    const kx = w * 0.8, ky = h * 0.72;
    const fl = 0.55 + 0.12 * Math.sin(t * 8) + 0.06 * Math.sin(t * 19);
    glow(ctx, kx, ky - 16, 140, 'rgba(255,110,40,.8)', fl);
    ctx.fillStyle = '#3a241a';
    ctx.beginPath();
    ctx.moveTo(kx - 60, ky + 26);
    ctx.quadraticCurveTo(kx - 60, ky - 64, kx, ky - 68);
    ctx.quadraticCurveTo(kx + 60, ky - 64, kx + 60, ky + 26);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,${125 + Math.floor(38 * Math.sin(t * 8))},50,.95)`;
    ctx.beginPath();
    ctx.moveTo(kx - 19, ky + 26);
    ctx.quadraticCurveTo(kx - 19, ky - 10, kx, ky - 12);
    ctx.quadraticCurveTo(kx + 19, ky - 10, kx + 19, ky + 26);
    ctx.closePath(); ctx.fill();
    // đốm lửa bay lên từ miệng lò rồi tàn dần
    ctx.fillStyle = '#ffca7a';
    for (let i = 0; i < 6; i++) {
      const cyc = (t * 26 + i * 37) % 110;
      const ex = kx + Math.sin(t * 2 + i * 2.4) * (8 + i * 2);
      ctx.globalAlpha = clamp01(1 - cyc / 110) * 0.85;
      ctx.fillRect(ex, ky - 72 - cyc, 2.4, 2.4);
    }
    ctx.globalAlpha = 1;
    // bàn xoay: đĩa elip + vệt sáng chạy vòng cho cảm giác quay nhanh
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(cx, wheelY + 14, 128, 15, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a3826';
    ctx.beginPath(); ctx.ellipse(cx, wheelY, 118, 20, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2e2216'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,150,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = t * 3.2 + i * TAU / 5;
      ctx.beginPath(); ctx.ellipse(cx, wheelY, 96, 15, 0, a, a + 0.7); ctx.stroke();
    }
    // bình đất sét "mọc" dáng: profile phình ra theo pha dựng cảnh
    const g2 = easeOut(clamp01(t / 4));
    const potH = lerp(26, 118, g2);
    const belly = lerp(20, 58, g2) * (1 + 0.015 * Math.sin(t * 9)); // rung nhẹ khi xoay
    const neck = lerp(16, 24, g2), mouth = lerp(18, 30, g2), baseR = lerp(24, 34, g2);
    ctx.fillStyle = '#a3623b';
    ctx.beginPath();
    ctx.moveTo(cx - baseR, wheelY - 4);
    ctx.bezierCurveTo(cx - belly * 1.25, wheelY - potH * 0.2,
      cx - belly * 1.2, wheelY - potH * 0.62, cx - neck, wheelY - potH * 0.86);
    ctx.quadraticCurveTo(cx - neck * 0.8, wheelY - potH * 0.96, cx - mouth, wheelY - potH);
    ctx.lineTo(cx + mouth, wheelY - potH);
    ctx.quadraticCurveTo(cx + neck * 0.8, wheelY - potH * 0.96, cx + neck, wheelY - potH * 0.86);
    ctx.bezierCurveTo(cx + belly * 1.2, wheelY - potH * 0.62,
      cx + belly * 1.25, wheelY - potH * 0.2, cx + baseR, wheelY - 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6e3f24'; ctx.lineWidth = 2; ctx.stroke();
    // miệng bình + các ngấn chuốt ngang do tay thợ để lại
    ctx.beginPath(); ctx.ellipse(cx, wheelY - potH, mouth, mouth * 0.22, 0, 0, TAU);
    ctx.fillStyle = '#7c4526'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5;
    const ringR = [belly * 1.12, belly * 1.02, belly * 0.7];
    for (let i = 0; i < 3; i++) {
      const yy = wheelY - potH * (0.28 + i * 0.18);
      ctx.beginPath(); ctx.ellipse(cx, yy, ringR[i], 3, 0, 0.15, Math.PI - 0.15); ctx.stroke();
    }
    // vệt sáng ướt bên hông: đất sét còn ẩm bắt ánh lửa lò
    ctx.strokeStyle = `rgba(255,209,140,${0.25 + 0.15 * Math.sin(t * 6)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - belly * 0.7, wheelY - potH * 0.3);
    ctx.quadraticCurveTo(cx - belly * 0.9, wheelY - potH * 0.55, cx - neck * 0.9, wheelY - potH * 0.8);
    ctx.stroke();
  },

  // ---------- Hình học Euclid ----------
  geometry(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#241a0e', '#0f0a05');
    // thớ giấy papyrus mờ chạy ngang
    for (let i = 0; i < 12; i++) {
      const yy = (i + 0.5) * h / 12 + (rnd(i) - 0.5) * 6;
      line(ctx, 0, yy, w, yy + (rnd(i + 7) - 0.5) * 8, 'rgba(255,220,160,.05)', 1);
    }
    const cxx = w * 0.46, cy = h * 0.55, R = h * 0.21, ink = '#ffd166';
    // compa vẽ đường tròn: cung lớn dần theo t
    const arc = clamp01(t / 3);
    const a0 = -Math.PI / 2, a1 = a0 + TAU * arc;
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cxx, cy, R, a0, a1); ctx.stroke();
    circle(ctx, cxx, cy, 2.5, ink); // tâm O
    // đầu chì phát sáng tiếp tục chạy quanh đường tròn sau khi vẽ xong
    const dotA = arc < 1 ? a1 : a0 + TAU + (t - 3) * 0.55;
    const dX = cxx + Math.cos(dotA) * R, dY = cy + Math.sin(dotA) * R;
    glow(ctx, dX, dY, 14, 'rgba(255,209,102,.9)', 0.55);
    circle(ctx, dX, dY, 2, '#ffe9b8');
    // compa mờ dần khi hoàn thành đường tròn
    const cAl = 1 - clamp01((t - 3.1) / 0.9);
    if (cAl > 0) {
      const px2 = cxx + Math.cos(a1) * R, py2 = cy + Math.sin(a1) * R;
      const hx = (cxx + px2) / 2, hy = (cy + py2) / 2 - 74; // bản lề phía trên
      ctx.globalAlpha = cAl;
      line(ctx, hx, hy, cxx, cy, '#cfd6e4', 3);
      line(ctx, hx, hy, px2, py2, '#aab6c8', 3);
      line(ctx, hx, hy - 14, hx, hy, '#cfd6e4', 4);
      circle(ctx, hx, hy, 4.5, '#e8eef7');
      ctx.globalAlpha = 1;
    }
    // tam giác vuông nội tiếp (Thales): cạnh huyền là đường kính
    const A = [cxx - R, cy], C2 = [cxx + R, cy];
    const B = [cxx + Math.cos(-1.95) * R, cy + Math.sin(-1.95) * R];
    const tp = clamp01((t - 3.4) / 2.1), V = [A, B, C2];
    for (let k = 0; k < 3; k++) {
      const ek = clamp01(tp * 3 - k); // từng cạnh hiện ra lần lượt
      if (ek <= 0) break;
      const P = V[k], Q = V[(k + 1) % 3];
      line(ctx, P[0], P[1], lerp(P[0], Q[0], ek), lerp(P[1], Q[1], ek), '#ffe9b8', 2);
    }
    // ba hình vuông Pythagoras dựng ra phía ngoài mỗi cạnh, sáng dần
    const sqT = clamp01((t - 5.8) / 2.4);
    [[A, B, C2], [B, C2, A], [C2, A, B]].forEach(([P, Q, O], k) => {
      const al = clamp01(sqT * 3 - k) * (0.75 + 0.25 * Math.sin(t * 2 + k * 2));
      if (al <= 0) return;
      const dx = Q[0] - P[0], dy = Q[1] - P[1], L = Math.hypot(dx, dy);
      let nx = -dy / L, ny = dx / L; // pháp tuyến, lật để hướng ra xa đỉnh còn lại
      if ((O[0] - P[0]) * nx + (O[1] - P[1]) * ny > 0) { nx = -nx; ny = -ny; }
      ctx.globalAlpha = al;
      ctx.beginPath();
      ctx.moveTo(P[0], P[1]); ctx.lineTo(Q[0], Q[1]);
      ctx.lineTo(Q[0] + nx * L, Q[1] + ny * L); ctx.lineTo(P[0] + nx * L, P[1] + ny * L);
      ctx.closePath();
      ctx.fillStyle = 'rgba(110,231,255,.08)'; ctx.fill();
      ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    });
    // ký hiệu góc khi tam giác vẽ xong: ô vuông tại B, cung nhỏ tại A và C
    if (tp >= 1) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
      const uL = Math.hypot(A[0] - B[0], A[1] - B[1]), vL = Math.hypot(C2[0] - B[0], C2[1] - B[1]);
      const ux = (A[0] - B[0]) / uL * 11, uy = (A[1] - B[1]) / uL * 11;
      const vx = (C2[0] - B[0]) / vL * 11, vy = (C2[1] - B[1]) / vL * 11;
      ctx.beginPath();
      ctx.moveTo(B[0] + ux, B[1] + uy);
      ctx.lineTo(B[0] + ux + vx, B[1] + uy + vy);
      ctx.lineTo(B[0] + vx, B[1] + vy);
      ctx.stroke();
      for (const [P, Q1, Q2] of [[A, B, C2], [C2, B, A]]) {
        const m1 = Math.atan2(Q1[1] - P[1], Q1[0] - P[0]);
        const m2 = Math.atan2(Q2[1] - P[1], Q2[0] - P[0]);
        let s1 = Math.min(m1, m2), s2 = Math.max(m1, m2);
        if (s2 - s1 > Math.PI) { const sw = s1 + TAU; s1 = s2; s2 = sw; } // chọn cung ngắn
        ctx.beginPath(); ctx.arc(P[0], P[1], 14, s1, s2); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  },

  // ---------- Đòn bẩy Archimedes ----------
  lever(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0e1830', '#060a14');
    drawStars(ctx, w, h, t, 46, 5, 0.5);
    const gy = h * 0.82;
    ctx.fillStyle = '#0b0f18'; ctx.fillRect(0, gy, w, h - gy);
    // điểm tựa tam giác — "hãy cho tôi một điểm tựa..."
    const px = w * 0.36, py = gy - 44;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(px, gy + 8, 60, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5c4630';
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(px - 34, gy); ctx.lineTo(px + 34, gy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 2; ctx.stroke();
    // chu kỳ nhấn: dồn sức đè xuống, giữ, rồi thả ra
    const p = (t % 3) / 3;
    const s = easeOut(clamp01((p - 0.08) / 0.3)) * (1 - easeIn(clamp01((p - 0.55) / 0.4)));
    const ang = s * 0.1, shortL = 118, longL = 215;
    ctx.save();
    ctx.translate(px, py); ctx.rotate(ang);
    rrect(ctx, -shortL, -7, shortL + longL, 13, 6, '#8a6b45', '#4f3c26', 2);
    // Trái Đất nhỏ ở đầu ngắn: nhấc hẳn lên vài pixel khi bị bẩy
    const hop = 6 * Math.sin(Math.PI * clamp01((s - 0.55) / 0.45));
    const ex = -shortL + 22, ey = -7 - 24 - hop;
    circle(ctx, ex, ey, 24, '#2f6fb2', '#9fd0ff', 1.5);
    ctx.save();
    ctx.beginPath(); ctx.arc(ex, ey, 23, 0, TAU); ctx.clip();
    ctx.fillStyle = '#4caf6e'; // vài lục địa nguệch ngoạc
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(ex + (rnd(i + 2) - 0.5) * 34, ey + (rnd(i + 9) - 0.5) * 34,
        6 + rnd(i) * 7, 3.5 + rnd(i + 5) * 4, rnd(i) * 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(ex - 7, ey - 7, 14, Math.PI * 0.9, Math.PI * 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
    // tia sáng nhỏ toả quanh Trái Đất lúc được nhấc lên
    if (s > 0.6) {
      const k = (s - 0.6) / 0.4;
      glow(ctx, ex, ey, 55, 'rgba(255,209,102,.8)', 0.45 * k);
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + 0.3;
        line(ctx, ex + Math.cos(a) * 30, ey + Math.sin(a) * 30,
          ex + Math.cos(a) * (38 + 6 * k), ey + Math.sin(a) * (38 + 6 * k),
          `rgba(255,209,102,${0.8 * k})`, 2);
      }
    }
    // người tí hon ở đầu dài: khuỵu gối, hai tay đè xuống đòn
    const fx = longL - 20, fy = -7;
    const bodyH = lerp(34, 22, s);
    const hipY = fy - bodyH * 0.55, headY = fy - bodyH - 8;
    ctx.lineCap = 'round';
    circle(ctx, fx, headY, 6, '#ffd166');
    line(ctx, fx, headY + 6, fx, hipY, '#ffd166', 4);
    line(ctx, fx, hipY, fx - 7, fy, '#ffd166', 3);
    line(ctx, fx, hipY, fx + 7, fy, '#ffd166', 3);
    line(ctx, fx, headY + 9, fx - 12, fy + lerp(-6, 0, s), '#ffd166', 3);
    line(ctx, fx, headY + 9, fx + 10, fy + lerp(-6, 0, s), '#ffd166', 3);
    ctx.lineCap = 'butt';
    ctx.restore();
  },

  // ---------- Vạn Lý Trường Thành ----------
  wall(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0b1126', '#221a33');
    drawStars(ctx, w, h, t, 42, 9, 0.5);
    // trăng
    glow(ctx, w * 0.84, h * 0.15, 70, 'rgba(255,243,214,.85)', 0.65);
    circle(ctx, w * 0.84, h * 0.15, 19, '#f2ead6');
    circle(ctx, w * 0.805, h * 0.135, 5, 'rgba(0,0,0,.1)');
    // đường sống núi chính — nơi tường bám theo
    const ridge = x => h * (0.52 - 0.1 * Math.sin(x / w * 4.2 - 1.0) - 0.05 * Math.sin(x / w * 9.7));
    // hai lớp núi xa, càng xa càng mờ
    const far = [
      { c: '#161e33', dy: -46, f: 3.4, ph: 2.2 },
      { c: '#222a42', dy: -16, f: 5.6, ph: 0.5 }
    ];
    for (const L of far) {
      ctx.fillStyle = L.c;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8)
        ctx.lineTo(x, ridge(x) + L.dy + 20 * Math.sin(x / w * L.f + L.ph));
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    // núi gần
    ctx.fillStyle = '#2d3450';
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, ridge(x) + 8);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    // tường xây dần từ trái sang phải, uốn theo sườn núi
    const seg = 26, nSeg = Math.ceil(w / seg);
    const built = clamp01(t / 7) * (nSeg + 2);
    for (let i = 0; i < nSeg; i++) {
      const k = clamp01(built - i); // 0→1: đoạn i trồi lên
      if (k <= 0) break;
      const x = i * seg, y = ridge(x + seg / 2) + 10;
      const wh = 24 * easeOut(k);
      ctx.fillStyle = '#453c57';
      ctx.fillRect(x, y - wh, seg + 1, wh + 16);
      ctx.fillStyle = '#5a5170';
      ctx.fillRect(x, y - wh, seg + 1, 5);
      if (k > 0.85) { // lỗ châu mai khi đoạn hoàn tất
        ctx.fillStyle = '#534a67';
        ctx.fillRect(x + 3, y - wh - 7, 8, 7);
        ctx.fillRect(x + 15, y - wh - 7, 8, 7);
      }
    }
    // tháp canh trên đỉnh + lửa hiệu
    const tx = w * 0.62, ty = ridge(tx) + 10;
    const kT = clamp01((built - tx / seg) / 2);
    if (kT > 0) {
      const towerH = 58 * easeOut(kT);
      rrect(ctx, tx - 19, ty - towerH, 38, towerH + 16, 3, '#544b6c', '#39324e', 2);
      ctx.fillStyle = '#544b6c';
      for (let m = 0; m < 3; m++) ctx.fillRect(tx - 19 + m * 14, ty - towerH - 8, 10, 8);
      if (kT > 0.6) { // cửa sổ sáng ấm
        ctx.fillStyle = 'rgba(255,200,87,.8)';
        ctx.fillRect(tx - 4, ty - towerH + 16, 8, 11);
      }
      if (kT >= 1) { // lửa hiệu chập chờn
        const fl = 0.45 + 0.15 * Math.sin(t * 9) + 0.08 * Math.sin(t * 17);
        glow(ctx, tx, ty - towerH - 22, 64, 'rgba(255,150,50,.9)', fl);
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.moveTo(tx - 8, ty - towerH - 8);
        ctx.quadraticCurveTo(tx - 11, ty - towerH - 22,
          tx + 3 * Math.sin(t * 8), ty - towerH - 30 - 4 * Math.sin(t * 6));
        ctx.quadraticCurveTo(tx + 11, ty - towerH - 22, tx + 8, ty - towerH - 8);
        ctx.closePath(); ctx.fill();
        circle(ctx, tx, ty - towerH - 13, 4.5, '#ffd166');
      }
    }
  },

  // ---------- Số 0 & toán học ----------
  zero(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#111a26', '#0a0d17');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // ký hiệu toán học trôi mờ ở nền
    const syms = ['+', '×', '√', 'π', '−', '='];
    ctx.font = 'bold 26px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#8fb7d8';
    for (let i = 0; i < 10; i++) {
      const x = rnd(i + 31) * w;
      const y = (rnd(i + 63) * h + h - (t * 8) % h) % h; // trôi chậm lên trên
      ctx.globalAlpha = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 2.3));
      ctx.fillText(syms[i % 6], x, y);
    }
    ctx.globalAlpha = 1;
    // số 0 lớn: vẽ dần thành vòng tròn phát sáng
    const cx = w / 2, cy = h * 0.42;
    const drawn = easeOut(clamp01(t / 2.4));
    glow(ctx, cx, cy, 135, 'rgba(255,200,87,.6)', drawn * (0.3 + 0.1 * Math.sin(t * 2)));
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 54, 72, 0, -Math.PI / 2, -Math.PI / 2 + TAU * drawn);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // các chữ số 1–9 quay quanh quỹ đạo
    ctx.font = 'bold 22px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#6ee7ff';
    for (let d = 1; d <= 9; d++) {
      const a = -Math.PI / 2 + TAU * d / 9 + t * 0.35;
      ctx.globalAlpha = drawn * (0.5 + 0.4 * Math.sin(t * 2 + d * 1.7));
      ctx.fillText(String(d), cx + Math.cos(a) * 135, cy + Math.sin(a) * 98);
    }
    ctx.globalAlpha = 1;
    // giá trị theo vị trí: "1" và "5" trượt vào, số 0 điền chỗ trống → "105"
    const p = (t % 6) / 6, by = h * 0.85, dx = 38;
    const slide = easeOut(clamp01(p / 0.22));
    const fill = easeOut(clamp01((p - 0.3) / 0.2));
    const fade = p > 0.9 ? 1 - (p - 0.9) / 0.1 : 1;
    ctx.font = 'bold 36px "Be Vietnam Pro", sans-serif';
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#e8ecf4';
    ctx.fillText('1', lerp(-30, cx - dx, slide), by);
    ctx.fillText('5', lerp(w + 30, cx + dx, slide), by);
    if (fill < 1) { // ô trống chờ số 0
      ctx.setLineDash([4, 4]);
      rrect(ctx, cx - 15, by - 22, 30, 44, 6, null, 'rgba(255,209,102,.5)', 1.5);
      ctx.setLineDash([]);
    }
    if (fill > 0) { // số 0 rơi từ vòng lớn xuống chỗ trống
      ctx.fillStyle = '#ffd166';
      ctx.fillText('0', cx, lerp(cy + 72, by, fill));
    }
    if (fill >= 1) glow(ctx, cx, by, 55, 'rgba(255,209,102,.9)', fade * (0.3 + 0.15 * Math.sin(t * 5)));
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  },

  // ---------- Đồng hồ thiên văn Praha ----------
  clock(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0d1024', '#1d1531');
    drawStars(ctx, w, h, t, 30, 13, 0.9);
    const cx = w * 0.34, cy = h * 0.52, R = h * 0.36;
    // mặt số thiên văn: 3 vòng đồng tâm
    glow(ctx, cx, cy, R * 1.6, 'rgba(255,200,87,.4)', 0.28);
    circle(ctx, cx, cy, R, '#1b2a4a', '#c9a24b', 5);
    circle(ctx, cx, cy, R * 0.72, '#25476e', '#8fb7d8', 2);
    circle(ctx, cx, cy, R * 0.42, '#123049', '#c9a24b', 2);
    // 24 vạch giờ, mỗi vạch thứ 6 đậm
    for (let i = 0; i < 24; i++) {
      const a = TAU * i / 24, big = i % 6 === 0;
      line(ctx,
        cx + Math.cos(a) * R * (big ? 0.86 : 0.92), cy + Math.sin(a) * R * (big ? 0.86 : 0.92),
        cx + Math.cos(a) * R * 0.97, cy + Math.sin(a) * R * 0.97,
        big ? '#ffd166' : 'rgba(255,209,102,.45)', big ? 3 : 1.5);
    }
    // mặt trăng nhỏ chạy vòng ngoài, ngược chiều
    const ma = -Math.PI / 2 - t * 0.12;
    const mx = cx + Math.cos(ma) * R * 0.8, my = cy + Math.sin(ma) * R * 0.8;
    circle(ctx, mx, my, 7, '#d7dfeb');
    circle(ctx, mx - 3, my - 1.5, 5.5, '#1b2a4a'); // pha trăng khuyết
    // kim mặt trời + kim giờ quay chậm
    const sa = -Math.PI / 2 + t * 0.2;
    const sx = cx + Math.cos(sa) * R * 0.62, sy = cy + Math.sin(sa) * R * 0.62;
    line(ctx, cx, cy, sx, sy, '#ffc857', 4);
    glow(ctx, sx, sy, 26, 'rgba(255,200,87,1)', 0.75);
    circle(ctx, sx, sy, 7, '#ffd166');
    const ha = -Math.PI / 2 + t * 0.07 + 2.1;
    line(ctx, cx, cy, cx + Math.cos(ha) * R * 0.4, cy + Math.sin(ha) * R * 0.4, '#e8ecf4', 3);
    circle(ctx, cx, cy, 6, '#ffd166', '#7a5c1e', 2);
    // cơ cấu bên phải: bánh răng ăn khớp quay ngược chiều nhau
    const gear = (gx0, gy0, r, n, ang, col) => {
      ctx.save(); ctx.translate(gx0, gy0); ctx.rotate(ang);
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) { // răng
        ctx.save(); ctx.rotate(TAU * i / n);
        ctx.fillRect(-r * 0.13, -r - r * 0.2, r * 0.26, r * 0.22);
        ctx.restore();
      }
      circle(ctx, 0, 0, r, col, 'rgba(0,0,0,.35)', 2);
      circle(ctx, 0, 0, r * 0.55, null, 'rgba(0,0,0,.3)', 3);
      circle(ctx, 0, 0, r * 0.14, '#0d1024');
      ctx.restore();
    };
    const gx = w * 0.78, gy = h * 0.56, spin = t * 0.8;
    line(ctx, gx, h * 0.17, gx, gy - 24, '#5d6b85', 3); // trục verge nối foliot với bánh răng
    gear(gx, gy, 30, 9, spin, '#8a7a4e');
    gear(gx, gy + 56, 20, 6, -spin * 1.5 + 0.26, '#6e7f9c');
    gear(gx - 42, gy + 56, 14, 5, spin * 15 / 7 + 0.1, '#8a7a4e');
    // thanh foliot lắc qua lại theo nhịp tick
    const rot = 0.35 * Math.sin(t * 3.2);
    ctx.save(); ctx.translate(gx, h * 0.17); ctx.rotate(rot);
    line(ctx, -36, 0, 36, 0, '#c9a24b', 5);
    circle(ctx, -32, 0, 5.5, '#ffd166');
    circle(ctx, 32, 0, 5.5, '#ffd166');
    ctx.restore();
  },

  // ---------- Thuyết nhật tâm ----------
  heliocentric(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0b1026', '#050614');
    drawStars(ctx, w, h, t, 46, 7, 1);
    const cx = w / 2, cy = h / 2;
    const tt = t % 10;
    // crossfade: địa tâm (0–4s) -> nhật tâm, cuối chu kỳ mờ về lại
    const mix = clamp01((tt - 4) / 1.6) * (1 - clamp01((tt - 9.2) / 0.8));
    if (mix < 1) {
      // hệ địa tâm rối rắm: Trái Đất giữa, hành tinh chạy epicycle
      ctx.save();
      ctx.globalAlpha = 1 - mix;
      circle(ctx, cx, cy, 11, '#4f8edb', '#9cc4ee', 1.5);
      for (let p = 0; p < 4; p++) {
        const R = 48 + p * 30, r = 12 + rnd(p) * 10;
        const w1 = 0.35 + p * 0.12, w2 = 2.1 + p * 0.65;
        ctx.strokeStyle = 'rgba(158,183,229,.3)';
        ctx.lineWidth = 1;
        ctx.beginPath(); // vệt quỹ đạo rối phía sau
        for (let k = 0; k <= 80; k++) {
          const s = t - k * 0.12;
          const x = cx + Math.cos(s * w1) * R + Math.cos(s * w2) * r;
          const y = cy + Math.sin(s * w1) * R * 0.92 + Math.sin(s * w2) * r;
          k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        const px = cx + Math.cos(t * w1) * R + Math.cos(t * w2) * r;
        const py = cy + Math.sin(t * w1) * R * 0.92 + Math.sin(t * w2) * r;
        circle(ctx, px, py, 4, '#d9c9a3');
      }
      ctx.restore();
    }
    if (mix > 0) {
      // hệ nhật tâm gọn gàng: Mặt Trời phát sáng, quỹ đạo tròn mảnh
      ctx.save();
      ctx.globalAlpha = mix;
      glow(ctx, cx, cy, 95, 'rgba(255,200,87,.9)', 0.85);
      circle(ctx, cx, cy, 16, '#ffd166', '#ffe9b0', 1.5);
      const cols = ['#c9b18c', '#e8a86b', '#5fa8dc', '#d96f4e', '#d9b06c'];
      for (let p = 0; p < 5; p++) {
        const R = 40 + p * 26, sp = 1.6 / Math.sqrt(R / 40); // xa quay chậm hơn
        ctx.strokeStyle = 'rgba(110,231,255,.22)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.94, 0, 0, TAU); ctx.stroke();
        const a = t * sp + p * 2.1;
        ctx.strokeStyle = 'rgba(255,209,102,.35)';
        ctx.beginPath(); // vệt sáng ngắn sau hành tinh
        for (let k = 0; k <= 14; k++) {
          const aa = a - k * 0.06;
          const x = cx + Math.cos(aa) * R, y = cy + Math.sin(aa) * R * 0.94;
          k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        circle(ctx, cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.94,
          3 + rnd(p + 9) * 2.5, cols[p]);
      }
      ctx.restore();
    }
  },

  // ---------- Kính hiển vi ----------
  microscope(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#101720', '#070a10');
    // silhouette kính hiển vi cổ bên trái
    ctx.save();
    ctx.translate(w * 0.19, h * 0.86);
    ctx.fillStyle = '#3a2d1c';
    ctx.beginPath(); // đế hình thang
    ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.lineTo(46, -22); ctx.lineTo(-46, -22);
    ctx.closePath(); ctx.fill();
    rrect(ctx, -12, -150, 24, 130, 8, '#4a3a22'); // trụ đứng
    rrect(ctx, -34, -96, 68, 10, 4, '#4a3a22'); // bàn để mẫu
    circle(ctx, 0, -101, 4, '#ffd166'); // giọt mẫu sáng
    ctx.save(); // ống nghiêng màu đồng
    ctx.translate(0, -150); ctx.rotate(0.42);
    rrect(ctx, -11, -78, 22, 84, 8, '#8a6a34');
    rrect(ctx, -14, -92, 28, 18, 6, '#a8823f'); // thị kính
    rrect(ctx, -8, 2, 16, 14, 4, '#6f5426'); // vật kính
    ctx.restore();
    circle(ctx, 0, -34, 10, '#233240', '#6ee7ff', 1.5); // gương lấy sáng
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3);
    circle(ctx, -3, -37, 3, '#bdefff');
    ctx.globalAlpha = 1;
    ctx.restore();
    // trường nhìn qua thị kính bên phải
    const fx = w * 0.66, fy = h * 0.5, fr = h * 0.38;
    glow(ctx, fx, fy, fr * 1.5, 'rgba(110,231,255,.4)', 0.45);
    ctx.save();
    ctx.beginPath(); ctx.arc(fx, fy, fr - 3, 0, TAU); ctx.clip();
    const gg = ctx.createRadialGradient(fx, fy, 10, fx, fy, fr);
    gg.addColorStop(0, '#16455a'); gg.addColorStop(1, '#0a2530');
    ctx.fillStyle = gg; ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
    // vi sinh vật hình que có roi, bơi theo Lissajous chậm
    for (let i = 0; i < 6; i++) {
      const sp = 0.14 + rnd(i) * 0.1, ph = rnd(i + 30) * TAU;
      const mx = fx + Math.sin(t * sp * 2 + ph) * fr * 0.62;
      const my = fy + Math.sin(t * sp * 3 + ph * 1.7) * fr * 0.55;
      const dx = Math.cos(t * sp * 2 + ph), dy = Math.cos(t * sp * 3 + ph * 1.7) * 1.5;
      ctx.save();
      ctx.translate(mx, my); ctx.rotate(Math.atan2(dy, dx)); // quay theo hướng bơi
      ctx.fillStyle = 'rgba(154,235,207,.85)';
      ctx.beginPath(); ctx.ellipse(0, 0, 9 + rnd(i + 5) * 5, 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(154,235,207,.6)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); // roi uốn sóng sin phía sau
      for (let k = 0; k <= 10; k++) {
        const x = -9 - k * 2.4, y = Math.sin(t * 9 + k * 0.9 + i) * 3 * (k / 10 + 0.2);
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    // hai trùng cỏ hình dép có lông rung quanh mép
    for (let i = 0; i < 2; i++) {
      const px = fx + Math.cos(t * 0.2 + i * 3) * fr * 0.4;
      const py = fy + Math.sin(t * 0.16 + i * 2.4) * fr * 0.45;
      ctx.save();
      ctx.translate(px, py); ctx.rotate(t * 0.3 + i * 2);
      ctx.fillStyle = 'rgba(190,222,255,.35)';
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(110,231,255,.5)'; // nhân tế bào
      ctx.beginPath(); ctx.ellipse(-5, 0, 6, 3.5, 0.4, 0, TAU); ctx.fill();
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * TAU;
        const bx = Math.cos(a) * 20, by = Math.sin(a) * 9;
        const jl = 3 + Math.sin(t * 12 + k * 2) * 1.4;
        line(ctx, bx, by, bx + Math.cos(a) * jl, by + Math.sin(a) * jl,
          'rgba(190,222,255,.5)', 1);
      }
      ctx.restore();
    }
    ctx.restore();
    circle(ctx, fx, fy, fr, null, '#6ee7ff', 3); // viền sáng thị kính
  },

  // ---------- Khí cầu Montgolfier ----------
  balloon(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#1b2547', '#4a3550');
    drawStars(ctx, w, h, t, 26, 3, 0.5);
    // mây trôi ngang
    ctx.fillStyle = 'rgba(210,220,240,.14)';
    for (let i = 0; i < 4; i++) {
      const mx = ((t * (8 + i * 3) + i * 210) % (w + 180)) - 90;
      const my = h * (0.16 + rnd(i) * 0.3);
      ctx.beginPath();
      ctx.ellipse(mx, my, 46 + rnd(i + 4) * 26, 12, 0, 0, TAU);
      ctx.ellipse(mx + 30, my + 5, 30, 9, 0, 0, TAU);
      ctx.fill();
    }
    // mặt đất và đám đông chấm nhỏ nhấp nhô vẫy chào
    const gy = h * 0.9;
    ctx.fillStyle = '#141018'; ctx.fillRect(0, gy - 8, w, h - gy + 8);
    for (let i = 0; i < 26; i++) {
      const px = 10 + rnd(i) * (w - 20);
      const hop = Math.max(0, Math.sin(t * 3 + i * 1.7)) * 4 * (rnd(i + 60) > 0.5 ? 1 : 0.3);
      circle(ctx, px, gy - 4 - hop, 2.6, '#2b2333');
    }
    // khí cầu bay lên từ từ rồi lơ lửng, lắc lư nhẹ
    const rise = easeOut(clamp01(t / 7)) * h * 0.2;
    const bx = w * 0.5 + Math.sin(t * 0.5) * 10;
    const by = h * 0.52 - rise + Math.sin(t * 0.9) * 5;
    ctx.save();
    ctx.translate(bx, by); ctx.rotate(Math.sin(t * 0.6) * 0.035);
    const R = 62;
    // hơi nóng mờ bốc lên hai bên
    for (let i = 0; i < 6; i++) {
      const cyc = (t * 30 + i * 37) % 170;
      const side = i % 2 ? 1 : -1;
      ctx.globalAlpha = 0.14 * (1 - cyc / 170);
      circle(ctx, side * (30 + cyc * 0.45) + Math.sin(t * 2 + i) * 5,
        R + 30 - cyc, 7 + cyc * 0.1, '#d8c8b2');
    }
    ctx.globalAlpha = 1;
    const envelope = () => { // vỏ bóng: tròn trên, thắt về miệng dưới
      ctx.beginPath();
      ctx.moveTo(-14, R + 16);
      ctx.bezierCurveTo(-R * 1.2, R * 0.6, -R * 1.2, -R * 1.05, 0, -R * 1.05);
      ctx.bezierCurveTo(R * 1.2, -R * 1.05, R * 1.2, R * 0.6, 14, R + 16);
      ctx.closePath();
    };
    envelope();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#27407a'; // nền xanh đậm
    ctx.fillRect(-R * 1.3, -R * 1.1, R * 2.6, R * 2.4);
    ctx.fillStyle = '#ffc857'; // sọc dọc vàng xen kẽ theo kinh tuyến
    for (let k = 0; k < 7; k += 2) {
      const u1 = -1 + k * 2 / 7, u2 = -1 + (k + 1) * 2 / 7;
      ctx.beginPath();
      ctx.moveTo(0, -R * 1.05);
      ctx.quadraticCurveTo(u1 * R * 1.45, 0, u1 * 14, R + 16);
      ctx.lineTo(u2 * 14, R + 16);
      ctx.quadraticCurveTo(u2 * R * 1.45, 0, 0, -R * 1.05);
      ctx.closePath(); ctx.fill();
    }
    circle(ctx, 0, 4, 17, '#ffd166', '#8f2d2d', 3); // hoa văn tròn giữa
    circle(ctx, 0, 4, 8, '#c94f4f');
    ctx.restore();
    envelope();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke();
    // ngọn lửa nhấp nháy dưới miệng bóng
    const fl = 0.7 + 0.3 * Math.sin(t * 13) * Math.sin(t * 7.3);
    glow(ctx, 0, R + 32, 42, 'rgba(255,140,40,.9)', 0.5 * fl);
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(-7, R + 44);
    ctx.quadraticCurveTo(-9, R + 30, 0, R + 22 - 5 * fl);
    ctx.quadraticCurveTo(9, R + 30, 7, R + 44);
    ctx.closePath(); ctx.fill();
    // dây treo và giỏ mây đan
    line(ctx, -13, R + 16, -10, R + 46, '#c9a86a', 1.5);
    line(ctx, 13, R + 16, 10, R + 46, '#c9a86a', 1.5);
    rrect(ctx, -14, R + 46, 28, 20, 4, '#6b4a26', '#4a3117', 1.5);
    line(ctx, -14, R + 53, 14, R + 53, 'rgba(0,0,0,.3)', 1);
    line(ctx, -14, R + 59, 14, R + 59, 'rgba(0,0,0,.3)', 1);
    ctx.restore();
  },

  // ---------- Pin Volta ----------
  battery(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#101624', '#070a12');
    drawStars(ctx, w, h, t, 22, 9, 0.35);
    const cx = w * 0.38, baseY = h * 0.8, dh = 15, N = 10, rw = 46;
    const pileTop = baseY - N * dh;
    // bàn gỗ đỡ cột voltaic
    rrect(ctx, cx - 95, baseY + 1, 190, 14, 5, '#3a2a1c', '#241a10', 2);
    // chồng đĩa xen kẽ đồng / dạ sẫm / kẽm, rơi xuống lần lượt theo t
    const discColors = ['#c8813a', '#2f3440', '#b9c2cc'];
    for (let i = 0; i < N; i++) {
      const ai = clamp01((t - i * 0.3) / 0.4);
      if (ai <= 0) break;
      const type = i % 3, rr = type === 1 ? rw - 8 : rw;
      const y = baseY - (i + 1) * dh - lerp(80, 0, easeOut(ai));
      ctx.globalAlpha = 0.3 + 0.7 * ai;
      rrect(ctx, cx - rr, y, rr * 2, dh - 2, 5, discColors[type], 'rgba(0,0,0,.4)', 1);
      ctx.globalAlpha = 1;
    }
    const isBuilt = t > N * 0.3 + 0.4;
    glow(ctx, cx, (pileTop + baseY) / 2, 95, 'rgba(255,200,87,.35)', isBuilt ? 0.35 : 0.12);
    // hai dây dẫn từ đỉnh và đáy vòng ra hai bên, gặp nhau ở khe hở bên phải
    const gx = w * 0.78, gy = h * 0.44;
    const wireTop = [[cx, pileTop - 2], [cx, h * 0.16], [gx, h * 0.16], [gx, gy - 9]];
    const wireBot = [[cx - rw, baseY - 7], [w * 0.1, baseY - 7], [w * 0.1, h * 0.93], [gx, h * 0.93], [gx, gy + 9]];
    const drawWire = pts => {
      ctx.beginPath();
      pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
      ctx.strokeStyle = '#8a6a3f'; ctx.lineWidth = 3; ctx.stroke();
    };
    drawWire(wireTop); drawWire(wireBot);
    circle(ctx, gx, gy - 9, 3.5, '#c8813a');
    circle(ctx, gx, gy + 9, 3.5, '#c8813a');
    if (!isBuilt) return;
    // tia lửa điện nhảy qua khe theo chu kỳ (zigzag nhấp nháy tất định)
    if (t % 2.4 < 0.5) {
      const k = Math.floor(t * 30);
      glow(ctx, gx, gy, 42, 'rgba(255,209,102,.9)', 0.5 + 0.4 * rnd(k));
      ctx.beginPath();
      for (let j = 0; j <= 5; j++) {
        const zy = lerp(gy - 9, gy + 9, j / 5);
        const zx = gx + (j === 0 || j === 5 ? 0 : (rnd(j + k * 7) - 0.5) * 11);
        j === 0 ? ctx.moveTo(zx, zy) : ctx.lineTo(zx, zy);
      }
      ctx.strokeStyle = '#fff7d6'; ctx.lineWidth = 2; ctx.stroke();
      // electron chạy dọc dây khi có tia lửa (nội suy đều theo quãng đường)
      const pathPt = (pts, u) => {
        let L = 0; const seg = [];
        for (let i = 1; i < pts.length; i++) {
          const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          seg.push(d); L += d;
        }
        let dd = u * L;
        for (let i = 0; i < seg.length; i++) {
          if (dd <= seg[i]) return [lerp(pts[i][0], pts[i + 1][0], dd / seg[i]), lerp(pts[i][1], pts[i + 1][1], dd / seg[i])];
          dd -= seg[i];
        }
        return pts[pts.length - 1];
      };
      // dòng electron khép kín: đỉnh -> khe hở -> đáy
      for (const pts of [wireTop, [...wireBot].reverse()]) {
        for (let e = 0; e < 5; e++) {
          const [ex, ey] = pathPt(pts, (t * 0.5 + e / 5) % 1);
          glow(ctx, ex, ey, 9, 'rgba(110,231,255,.9)', 0.7);
          circle(ctx, ex, ey, 2.2, '#6ee7ff');
        }
      }
    }
  },

  // ---------- Cảm ứng điện từ ----------
  induction(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0d1420', '#06090f');
    const coilX = w * 0.38, coilY = h * 0.52;
    // vị trí nam châm theo chu kỳ: trượt vào - dừng - rút ra - nghỉ
    const T = 6;
    const sAt = tt => {
      const q = ((tt % T) + T) % T;
      return q < 1.6 ? easeOut(q / 1.6) : q < 2.6 ? 1
        : q < 4.2 ? 1 - easeOut((q - 2.6) / 1.6) : 0;
    };
    const s = sAt(t);
    const v = (sAt(t + 0.04) - sAt(t - 0.04)) / 0.08; // tốc độ = đạo hàm vị trí
    const mx = lerp(coilX - 110, coilX + 42, s); // mũi cực N của nam châm
    // đường sức từ cong quanh nam châm, chảy chậm
    ctx.save();
    ctx.setLineDash([5, 7]); ctx.lineDashOffset = -t * 12;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(mx - 65, coilY, 95 + i * 30, 30 + i * 20, 0, 0, TAU);
      ctx.strokeStyle = `rgba(110,231,255,${0.24 - i * 0.06})`;
      ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
    // thanh nam châm: nửa xanh S - nửa đỏ N
    rrect(ctx, mx - 130, coilY - 16, 65, 32, 4, '#3567c9', '#22437f', 2);
    rrect(ctx, mx - 65, coilY - 16, 65, 32, 4, '#d44a4a', '#8f2f2f', 2);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('S', mx - 97, coilY + 5);
    ctx.fillText('N', mx - 33, coilY + 5);
    // cuộn dây lớn: nhiều vòng elip cạnh nhau, vẽ sau để che nam châm
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.ellipse(coilX - 45 + k * 15, coilY, 9, 46, 0, 0, TAU);
      ctx.strokeStyle = 'rgba(201,138,75,.9)'; ctx.lineWidth = 3.5; ctx.stroke();
    }
    // dây nối cuộn dây với điện kế
    const gx = w * 0.8, gy = h * 0.4, pivotY = gy + 16;
    line(ctx, coilX + 50, coilY + 40, coilX + 50, h * 0.85, '#8a6a3f', 2);
    line(ctx, coilX + 50, h * 0.85, gx, h * 0.85, '#8a6a3f', 2);
    line(ctx, gx, h * 0.85, gx, gy + 48, '#8a6a3f', 2);
    // điện kế: cung chia vạch + kim lệch tỉ lệ với TỐC ĐỘ nam châm
    circle(ctx, gx, gy, 48, '#161f2e', '#3b4a63', 3);
    for (let d = -60; d <= 60; d += 15) {
      const a = (d - 90) * Math.PI / 180;
      line(ctx, gx + Math.cos(a) * 32, pivotY + Math.sin(a) * 32,
        gx + Math.cos(a) * 38, pivotY + Math.sin(a) * 38,
        d === 0 ? '#ffd166' : '#7f93b3', d === 0 ? 2 : 1.5);
    }
    const needleDeg = Math.max(-55, Math.min(55, v * 30));
    const na = (needleDeg - 90) * Math.PI / 180;
    glow(ctx, gx, pivotY, 36, 'rgba(255,200,87,.8)', 0.5 * clamp01(Math.abs(v)));
    line(ctx, gx, pivotY, gx + Math.cos(na) * 34, pivotY + Math.sin(na) * 34, '#ffc857', 2.5);
    circle(ctx, gx, pivotY, 4, '#ffd166');
    ctx.fillStyle = '#9fb2cc'; ctx.font = '12px "Be Vietnam Pro", sans-serif';
    ctx.fillText('G', gx, gy + 40);
  },

  // ---------- Điện tín Morse ----------
  telegraph(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0b1220', '#080b13');
    drawStars(ctx, w, h, t, 26, 5, 0.3);
    ctx.fillStyle = '#0e1219'; ctx.fillRect(0, h * 0.74, w, h * 0.26); // nền đất
    // dòng thời gian mã Morse "SOS": dit = 1 đơn vị, dah = 3
    const unit = 0.22, lens = [1, 1, 1, 3, 3, 3, 1, 1, 1];
    const syms = []; let acc = 0.6;
    for (let i = 0; i < lens.length; i++) {
      syms.push({ st: acc, dur: lens[i] * unit, dah: lens[i] === 3 });
      acc += lens[i] * unit + ((i === 2 || i === 5) ? 3 : 1) * unit;
    }
    const T = acc + 6 * unit, tc = t % T;
    // hàng cột điện + dây võng nhẹ chạy ngang khung hình
    const wireY = h * 0.24, poleXs = [0.1, 0.38, 0.66, 0.94];
    for (const px of poleXs) {
      line(ctx, w * px, wireY - 8, w * px, h * 0.74, '#3a3226', 5);
      line(ctx, w * px - 14, wireY - 4, w * px + 14, wireY - 4, '#3a3226', 4);
    }
    ctx.beginPath(); ctx.moveTo(w * 0.1, wireY);
    for (let i = 1; i < poleXs.length; i++) {
      const x0 = w * poleXs[i - 1], x1 = w * poleXs[i];
      ctx.quadraticCurveTo((x0 + x1) / 2, wireY + 10, x1, wireY);
    }
    ctx.strokeStyle = '#55647a'; ctx.lineWidth = 2; ctx.stroke();
    // bàn phím Morse góc trái: cần gõ nhấn xuống theo nhịp
    let press = 0;
    for (const s of syms) {
      press = Math.max(press,
        clamp01((tc - s.st + 0.06) / 0.06) * clamp01((s.st + s.dur + 0.06 - tc) / 0.06));
    }
    const kx = w * 0.12, ky = h * 0.78;
    line(ctx, kx - 30, ky, w * 0.1, wireY, '#55647a', 1.5); // dây từ bàn gõ lên cột đầu
    rrect(ctx, kx - 34, ky, 84, 12, 4, '#4a341e', '#2c1f10', 2);
    ctx.save();
    ctx.translate(kx - 22, ky - 4); ctx.rotate(press * 0.14); // cần xoay quanh chốt
    rrect(ctx, 0, -4, 62, 7, 3, '#8f9aa8');
    circle(ctx, 58, -8, 7, '#1f2733', '#8f9aa8', 2);
    ctx.restore();
    if (press > 0.5) glow(ctx, kx + 38, ky, 14, 'rgba(255,209,102,.9)', press * 0.8);
    // xung sáng chạy dọc dây mỗi lần gõ (xét cả xung của chu kỳ trước)
    const travel = 1.15, x0 = w * 0.1, x1 = w * 0.94;
    for (const s of syms) {
      for (const dt of [tc - s.st, tc - s.st + T]) {
        const u = dt / travel;
        if (u <= 0 || u >= 1) continue;
        const px = lerp(x0, x1, u);
        const seg = ((px - x0) / (w * 0.28)) % 1;
        const py = wireY + 5 * Math.sin(seg * Math.PI);
        glow(ctx, px, py, s.dah ? 16 : 11, 'rgba(110,231,255,.95)', 0.85);
        circle(ctx, px, py, s.dah ? 3.2 : 2.4, '#eaffff');
      }
    }
    // máy nhận bên phải: băng giấy tuôn ra in chấm/vạch trượt dần
    const bx = w * 0.66, by = h * 0.6;
    line(ctx, w * 0.66 + 4, wireY, bx + 20, by, '#55647a', 1.5);
    rrect(ctx, bx, by, 74, 52, 6, '#243043', '#3b4a63', 2);
    circle(ctx, bx + 18, by + 26, 9, '#161f2e', '#8f9aa8', 2); // cuộn giấy
    const tx0 = bx + 34, tx1 = w * 0.98, ty = by + 18, feed = 34;
    rrect(ctx, tx0, ty, tx1 - tx0, 17, 2, '#e9e2cd');
    ctx.save();
    ctx.beginPath(); ctx.rect(tx0 + 4, ty, tx1 - tx0 - 4, 17); ctx.clip();
    ctx.fillStyle = '#2a2a33';
    for (const s of syms) {
      for (const dt of [tc - s.st - travel, tc - s.st - travel + T]) {
        if (dt <= 0) continue;
        const mxp = tx0 + 6 + dt * feed;
        if (mxp > tx1 + 20) continue;
        if (s.dah) { ctx.fillRect(mxp, ty + 7, 13, 4); } else { ctx.fillRect(mxp, ty + 6, 4.5, 4.5); }
        if (dt < 0.12) glow(ctx, mxp, ty + 8, 10, 'rgba(255,209,102,.9)', 0.7); // đầu in loé sáng
      }
    }
    ctx.restore();
  },

  // ---------- Nhiếp ảnh ----------
  photo(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#1a1310', '#0a0706');
    const T = 5, p = (t % T) / T;
    const floorY = h * 0.84;
    ctx.fillStyle = '#0e0907'; ctx.fillRect(0, floorY, w, h - floorY);
    // chân ba càng
    const cx = w * 0.22, cy = h * 0.46;
    ctx.lineCap = 'round';
    line(ctx, cx, cy + 24, cx - 46, floorY, '#3c2b18', 5);
    line(ctx, cx, cy + 24, cx + 42, floorY, '#3c2b18', 5);
    line(ctx, cx, cy + 24, cx + 4, floorY - 8, '#2e2012', 5);
    ctx.lineCap = 'butt';
    // thân máy gỗ + hộp xếp giấy
    rrect(ctx, cx - 52, cy - 30, 44, 58, 5, '#5b3d21', '#33220f', 2);
    ctx.fillStyle = '#452e18';
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 5 + i * 8, cy - 22, 5, 42);
    rrect(ctx, cx + 27, cy - 20, 22, 38, 4, '#5b3d21', '#33220f', 2);
    // ống kính tròn bằng đồng
    circle(ctx, cx + 58, cy - 1, 13, '#c08f3f', '#7c5a22', 3);
    circle(ctx, cx + 58, cy - 1, 6.5, '#1c1208', '#8a6a30', 1.5);
    glow(ctx, cx + 54, cy - 5, 10, 'rgba(255,230,170,.8)', 0.3);
    // khay đèn flash magiê trên que
    line(ctx, cx - 18, cy - 30, cx - 18, cy - 68, '#3c2b18', 4);
    rrect(ctx, cx - 36, cy - 76, 36, 8, 3, '#6b6b72', '#3a3a42', 1.5);
    // khung ảnh daguerreotype bên phải, viền trắng
    const px = w * 0.54, py = h * 0.17, pw = w * 0.35, ph = pw * 0.70;
    rrect(ctx, px - 11, py - 11, pw + 22, ph + 22, 4, '#e9e1cf', '#b7ab93', 2);
    ctx.fillStyle = '#f4ecd9'; ctx.fillRect(px, py, pw, ph);
    // ảnh sepia hiện dần từ trắng sau khi flash
    const dev = easeOut(clamp01((p - 0.2) / 0.55));
    if (dev > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      ctx.globalAlpha = dev;
      const g = ctx.createLinearGradient(0, py, 0, py + ph);
      g.addColorStop(0, '#dcc394'); g.addColorStop(1, '#b08d5c');
      ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
      // dãy mái nhà phố cổ (silhouette)
      const sk = [[0, .62], [.09, .44], [.19, .62], [.25, .62], [.35, .38], [.45, .62],
        [.52, .62], [.60, .47], [.68, .62], [1, .62]];
      ctx.fillStyle = '#5d422a';
      ctx.beginPath(); ctx.moveTo(px, py + ph * 0.88);
      for (const [fx, fy] of sk) ctx.lineTo(px + pw * fx, py + ph * fy);
      ctx.lineTo(px + pw, py + ph * 0.88); ctx.closePath(); ctx.fill();
      // mặt đất + cái cây
      ctx.fillStyle = '#8a6b42'; ctx.fillRect(px, py + ph * 0.86, pw, ph * 0.14);
      const tx = px + pw * 0.85, tb = py + ph * 0.88;
      line(ctx, tx, tb, tx, tb - ph * 0.34, '#4a3320', 4);
      circle(ctx, tx - 7, tb - ph * 0.38, 12, '#4a3320');
      circle(ctx, tx + 8, tb - ph * 0.34, 10, '#4a3320');
      circle(ctx, tx + 1, tb - ph * 0.46, 11, '#4a3320');
      ctx.restore();
    }
    // flash loé: khay đèn bốc sáng, cả khung trắng loé rồi tắt nhanh
    const fl = p > 0.10 ? Math.max(0, 1 - (p - 0.10) / 0.07) : 0;
    if (fl > 0) {
      glow(ctx, cx - 18, cy - 80, 90 + 70 * (1 - fl), '#ffffff', fl);
      ctx.fillStyle = `rgba(255,255,255,${0.85 * easeIn(fl)})`;
      ctx.fillRect(0, 0, w, h);
    }
  },

  // ---------- Điện ảnh ----------
  cinema(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0e0b13', '#050407');
    const T = 7, k = (t % T) / T;
    const fr = Math.floor(t * 16); // nhịp 16 hình/giây của phim câm
    const flick = 0.82 + 0.18 * rnd(fr); // nhấp nháy nhẹ
    const sx = w * 0.10, sy = h * 0.07, sw = w * 0.52, sh = h * 0.50;
    rrect(ctx, sx - 8, sy - 8, sw + 16, sh + 16, 3, '#221b14');
    // nội dung màn ảnh (cắt theo khung)
    ctx.save();
    ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
    ctx.fillStyle = `rgba(213,200,176,${0.85 * flick})`;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = flick * (1 - easeIn(clamp01((k - 0.9) / 0.1))); // hết cảnh thì mờ
    // đoàn tàu tiến về khán giả: to dần, hơi lệch góc
    const gs = lerp(0.2, 1.5, easeIn(k));
    ctx.save();
    ctx.translate(sx + sw * lerp(0.72, 0.33, k), sy + sh * lerp(0.46, 0.72, k));
    ctx.scale(gs, gs); ctx.rotate(-0.07);
    rrect(ctx, -34, -46, 68, 64, 8, '#2e2922'); // thân đầu máy
    circle(ctx, 0, -12, 26, '#39332b', '#221d17', 3); // mặt nồi hơi
    circle(ctx, 0, -12, 9, '#171310');
    ctx.fillStyle = '#2e2922';
    ctx.fillRect(-9, -80, 18, 28); // ống khói
    ctx.fillRect(-15, -85, 30, 7);
    ctx.beginPath(); // gạt chướng ngại phía trước
    ctx.moveTo(-42, 32); ctx.lineTo(0, 4); ctx.lineTo(42, 32); ctx.closePath();
    ctx.fillStyle = '#231e18'; ctx.fill();
    for (let i = 0; i < 5; i++) { // khói phụt lên
      const a = (t * 0.8 + i * 0.2) % 1;
      circle(ctx, Math.sin(i * 2.1 + t * 1.3) * 9, -88 - a * 55, 7 + a * 13,
        `rgba(95,88,76,${0.5 * (1 - a)})`);
    }
    ctx.restore();
    // hạt bụi + vạch xước dọc ngẫu nhiên của phim
    ctx.fillStyle = 'rgba(46,36,24,.55)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(sx + rnd(fr * 3 + i) * sw, sy + rnd(fr * 7 + i + 31) * sh, 2, 2);
    }
    if (rnd(fr + 9) > 0.5) {
      const vx = sx + rnd(fr + 17) * sw;
      line(ctx, vx, sy, vx, sy + sh, 'rgba(52,42,28,.4)', 1);
    }
    ctx.restore();
    // chùm sáng hình nón từ máy chiếu tới màn ảnh
    const pxr = w * 0.83, pyr = h * 0.65;
    ctx.globalAlpha = 0.10 + 0.05 * flick;
    const beam = ctx.createLinearGradient(pxr, pyr, sx + sw, sy + sh * 0.5);
    beam.addColorStop(0, 'rgba(255,236,180,.95)');
    beam.addColorStop(1, 'rgba(255,236,180,.1)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(pxr - 30, pyr + 2);
    ctx.lineTo(sx, sy); ctx.lineTo(sx, sy + sh);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    glow(ctx, pxr - 32, pyr + 2, 26, 'rgba(255,236,180,.9)', 0.5 * flick);
    // máy chiếu với hai cuộn phim quay tròn
    rrect(ctx, pxr - 26, pyr - 14, 60, 38, 5, '#241f19', '#0f0c09', 2);
    rrect(ctx, pxr - 36, pyr - 4, 12, 18, 3, '#1b1712');
    for (let i = 0; i < 2; i++) {
      const rx = pxr - 4 + i * 32, ry = pyr - 32, rr = 15;
      circle(ctx, rx, ry, rr, '#151110', '#3b332a', 2);
      for (let s = 0; s < 3; s++) {
        const a = t * (i ? -3.4 : 3.4) + s * TAU / 3;
        line(ctx, rx, ry, rx + Math.cos(a) * rr * 0.8, ry + Math.sin(a) * rr * 0.8, '#3b332a', 1.5);
      }
      circle(ctx, rx, ry, 3.5, '#3b332a');
    }
    // khán giả silhouette; vài cái đầu né sang bên khi tàu tới gần
    const dodge = easeOut(clamp01((k - 0.72) / 0.18)) * (1 - easeIn(clamp01((k - 0.93) / 0.07)));
    for (let row = 0; row < 2; row++) {
      const shade = row ? '#010102' : '#050508';
      const ry = h * (0.82 + row * 0.11);
      for (let i = 0; i < 9; i++) {
        const hx = w * (0.05 + i * 0.115) + row * 30;
        const side = rnd(i * 7 + row * 3) > 0.55 ? (rnd(i + row * 5) > 0.5 ? 1 : -1) : 0;
        circle(ctx, hx + side * dodge * 15, ry - 8 - Math.abs(side) * dodge * 4, 11 + row * 3, shade);
        ctx.fillStyle = shade;
        ctx.fillRect(hx - 16 + side * dodge * 8, ry - 2, 32 + row * 6, 26); // vai
      }
    }
  },

  // ---------- Radio ----------
  radio(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0a1026', '#0d1b33', 0.8);
    drawStars(ctx, w, h, t, 45, 7, 0.5);
    // tầng điện ly mờ phía trên
    ctx.globalAlpha = 0.10 + 0.03 * Math.sin(t * 1.2);
    ctx.fillStyle = '#6ee7ff';
    ctx.beginPath(); ctx.ellipse(w / 2, -h * 0.55, w * 0.75, h * 0.66, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    // biển gợn sóng ở giữa
    const seaY = h * 0.68;
    const sea = ctx.createLinearGradient(0, seaY, 0, h);
    sea.addColorStop(0, '#0e2440'); sea.addColorStop(1, '#050d1a');
    ctx.fillStyle = sea; ctx.fillRect(0, seaY, w, h - seaY);
    ctx.strokeStyle = 'rgba(110,231,255,.22)'; ctx.lineWidth = 1.5;
    for (let r = 0; r < 4; r++) {
      const yy = seaY + 12 + r * 16;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = yy + Math.sin(x * 0.045 + t * 1.6 + r * 2) * 3;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // vách đá hai bờ đại dương
    ctx.fillStyle = '#060a14';
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, seaY - 40);
    ctx.lineTo(w * 0.10, seaY - 26); ctx.lineTo(w * 0.17, seaY + 10); ctx.lineTo(w * 0.20, h);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, h); ctx.lineTo(w, seaY - 46);
    ctx.lineTo(w * 0.90, seaY - 30); ctx.lineTo(w * 0.84, seaY + 8); ctx.lineTo(w * 0.80, h);
    ctx.closePath(); ctx.fill();
    // hai tháp antenna dạng giàn
    const x1 = w * 0.075, y1 = h * 0.20, x2 = w * 0.925, y2 = h * 0.19;
    const tower = (bx, topY, baseY) => {
      line(ctx, bx - 16, baseY, bx, topY, '#1c2740', 3);
      line(ctx, bx + 16, baseY, bx, topY, '#1c2740', 3);
      for (let i = 1; i <= 4; i++) {
        const yy = lerp(baseY, topY, i / 5), half = lerp(15, 3, i / 5);
        line(ctx, bx - half, yy, bx + half, yy, '#1c2740', 2);
      }
      circle(ctx, bx, topY, 2.5, '#ffd166');
    };
    tower(x1, y1, seaY - 28); tower(x2, y2, seaY - 32);
    // đường truyền sóng trời (mờ, dẫn mắt)
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = 'rgba(110,231,255,.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(w * 0.5, h * 0.02, x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    // mã Morse chữ S: tạch-tạch-tạch rồi nghỉ
    const T = 3.2, tt = t % T, dots = [0.15, 0.6, 1.05];
    for (const d of dots) {
      const age = tt - d;
      if (age >= 0 && age < 0.18) glow(ctx, x1, y1, 26, 'rgba(255,209,102,1)', 0.9); // đang phát
      if (age > 0 && age < 1.3) { // cung tròn đồng tâm lan ra
        const al = (1 - age / 1.3) * 0.55;
        ctx.strokeStyle = `rgba(110,231,255,${al})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x1, y1, 14 + age * 150, -1.1, 1.1); ctx.stroke();
        ctx.beginPath(); ctx.arc(x1, y1, 10 + age * 108, -1.0, 1.0); ctx.stroke();
      }
      // xung bay theo cung lên tầng điện ly rồi phản xạ xuống tháp phải
      const s = age / 1.6;
      if (s > 0 && s < 1) {
        const u = 1 - s;
        const bx = u * u * x1 + 2 * u * s * (w * 0.5) + s * s * x2;
        const by = u * u * y1 + 2 * u * s * (h * 0.02) + s * s * y2;
        glow(ctx, bx, by, 16, 'rgba(255,209,102,1)', 0.8);
        circle(ctx, bx, by, 3, '#ffd166');
      }
      const rx = age - 1.6; // tháp phải loé khi nhận tín hiệu
      if (rx > 0 && rx < 0.3) {
        const kk = 1 - rx / 0.3;
        glow(ctx, x2, y2, 30 + 20 * (1 - kk), 'rgba(255,209,102,1)', 0.9 * kk);
        circle(ctx, x2, y2, 4, '#ffd166');
      }
    }
  },

  // ---------- Bảng tuần hoàn ----------
  periodic(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#12241d', '#0a1712');
    // khung gỗ quanh bảng đen
    rrect(ctx, w * 0.045, h * 0.055, w * 0.91, h * 0.89, 10, null, '#6b4a2a', 6);
    // vệt phấn lau mờ trên mặt bảng
    ctx.fillStyle = '#e8f0e6';
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.ellipse(rnd(i + 2) * w, rnd(i + 9) * h, 50 + rnd(i) * 60, 12, rnd(i), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e9f0e6'; ctx.font = 'italic 12px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Mendeleev — 1869', w / 2, h * 0.115);
    const rows = [
      ['H', '', '', '', '', '', '', 'He'],
      ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'],
      ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'],
      ['K', 'Ca', 'Sc', 'Ga', 'Ge', 'As', 'Se', 'Br'],
      ['Rb', 'Sr', 'Y', 'In', 'Sn', 'Sb', 'Te', 'I']
    ];
    const nums = [
      [1, 0, 0, 0, 0, 0, 0, 2], [3, 4, 5, 6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15, 16, 17, 18], [19, 20, 21, 31, 32, 33, 34, 35],
      [37, 38, 39, 49, 50, 51, 52, 53]
    ];
    const alkali = ['Li', 'Na', 'K', 'Rb'], noble = ['He', 'Ne', 'Ar'];
    const nonmetal = ['H', 'B', 'C', 'N', 'O', 'F', 'Si', 'P', 'S', 'Cl', 'As', 'Se', 'Br', 'Te', 'I'];
    const mystery = ['Sc', 'Ga', 'Ge']; // các nguyên tố Mendeleev tiên đoán
    const cw = w * 0.104, ch = h * 0.15, x0 = w * 0.084, y0 = h * 0.155;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) {
      const sym = rows[r][c];
      if (!sym) continue;
      const appear = clamp01((t - 0.3 - (r * 8 + c) * 0.09) / 0.5);
      if (appear <= 0) continue;
      const x = x0 + c * cw, y = y0 + r * ch;
      const mi = mystery.indexOf(sym);
      const revealed = mi < 0 || t > 6.5 + mi * 0.9;
      // màu ô theo nhóm — tô rất nhạt
      let fill = 'rgba(233,240,230,.04)';
      if (revealed && alkali.includes(sym)) fill = 'rgba(255,120,110,.16)';
      else if (revealed && noble.includes(sym)) fill = 'rgba(196,140,255,.16)';
      else if (revealed && nonmetal.includes(sym)) fill = 'rgba(110,231,255,.12)';
      ctx.globalAlpha = appear;
      rrect(ctx, x + 2, y + 2, cw - 4, ch - 4, 4, fill, 'rgba(233,240,230,.5)', 1.2);
      if (revealed) {
        // loé sáng lúc điền tên nguyên tố tiên đoán, sau đó giữ quầng nhẹ
        if (mi >= 0) {
          const fl = Math.max(clamp01(1 - (t - 6.5 - mi * 0.9) / 1.2),
            0.1 + 0.06 * Math.sin(t * 2 + mi));
          glow(ctx, x + cw / 2, y + ch / 2, cw, 'rgba(255,209,102,.9)', fl);
        }
        ctx.fillStyle = mi >= 0 ? '#ffd166' : '#e9f0e6';
        ctx.font = 'bold 16px "Be Vietnam Pro", sans-serif';
        ctx.fillText(sym, x + cw / 2, y + ch * 0.74);
        ctx.font = '9px "Be Vietnam Pro", sans-serif';
        ctx.fillText(nums[r][c], x + cw * 0.24, y + ch * 0.34);
      } else {
        // ô để trống: dấu "?" phấn vàng nhấp nháy
        ctx.globalAlpha = appear * (0.35 + 0.6 * Math.abs(Math.sin(t * 2.6 + mi * 2)));
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 18px "Be Vietnam Pro", sans-serif';
        ctx.fillText('?', x + cw / 2, y + ch * 0.72);
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  },

  // ---------- Năng lượng hạt nhân ----------
  atom(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0d1117', '#05070b');
    // lưới than chì mờ gợi lò phản ứng Chicago Pile-1
    for (let x = 0; x <= w; x += 44) line(ctx, x, 0, x, h, 'rgba(130,140,155,.07)', 1);
    for (let y = 0; y <= h; y += 44) line(ctx, 0, y, w, y, 'rgba(130,140,155,.07)', 1);
    const p = t % 6, cx = w * 0.5, cy = h * 0.48;
    // cụm chấm đỏ + xám tụ tròn làm hạt nhân
    const nucleus = (x, y, r, n, seed, a = 1) => {
      ctx.globalAlpha = a;
      for (let i = 0; i < n; i++) {
        const ang = rnd(i + seed) * TAU, d = Math.sqrt(rnd(i + seed + 40)) * r;
        circle(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, r * 0.36,
          i % 2 ? '#e35d5d' : '#98a2ad', 'rgba(0,0,0,.4)', 1);
      }
      ctx.globalAlpha = 1;
    };
    // vòng năng lượng giãn nở mờ dần sau mỗi lần phân hạch
    const ring = (x, y, t0, R) => {
      const age = p - t0;
      if (age < 0 || age > 1.5) return;
      ctx.globalAlpha = (1 - age / 1.5) * 0.7;
      circle(ctx, x, y, 8 + easeOut(age / 1.5) * R, null, '#ffd166', 2.5);
      ctx.globalAlpha = 1;
      if (age < 0.5) glow(ctx, x, y, R * 0.9, 'rgba(255,200,87,.8)', (1 - age / 0.5) * 0.8);
    };
    const A = { x: w * 0.18, y: h * 0.26 }, B = { x: w * 0.82, y: h * 0.72 };
    // neutron (chấm lam) bay vào hạt nhân U
    if (p < 1.6) {
      const nx = lerp(-20, cx - 12, p / 1.6), ny = lerp(cy - 60, cy, p / 1.6);
      glow(ctx, nx, ny, 26, 'rgba(110,231,255,.9)', 0.7);
      circle(ctx, nx, ny, 5, '#6ee7ff');
    }
    if (p < 2.2) {
      // hạt nhân rung lên sau va chạm
      const sh = p > 1.6 ? 5 * (1 - (p - 1.6) / 0.6) : 0;
      nucleus(cx + Math.sin(p * 57) * sh, cy + Math.cos(p * 49) * sh, 26, 22, 3,
        clamp01(0.25 + p));
    } else {
      // tách đôi thành hai mảnh văng ra
      const q = easeOut(clamp01((p - 2.2) / 1.5)), fade = 1 - clamp01((p - 4.6) / 1.3);
      nucleus(cx - 66 * q, cy - 40 * q, 17, 11, 5, fade);
      nucleus(cx + 66 * q, cy + 40 * q, 17, 11, 9, fade);
      // neutron thế hệ mới bay tiếp về hai hạt nhân nhỏ
      const q2 = clamp01((p - 2.2) / 1.5);
      const shots = [[A.x, A.y], [B.x, B.y], [w * 1.06, h * 0.08]];
      for (let i = 0; i < 3; i++) {
        if (q2 >= 1 && i < 2) continue; // đã tới đích, gây phân hạch tiếp
        const nx = lerp(cx, shots[i][0], q2), ny = lerp(cy, shots[i][1], q2);
        glow(ctx, nx, ny, 18, 'rgba(110,231,255,.8)', 0.6);
        circle(ctx, nx, ny, 4, '#6ee7ff');
      }
    }
    ring(cx, cy, 2.2, 150);
    // chuỗi phản ứng thế hệ 2 ở hai góc
    for (const [i, P] of [A, B].entries()) {
      if (p < 3.7) nucleus(P.x, P.y, 15, 10, 20 + i * 7);
      else {
        const q = easeOut(clamp01((p - 3.7) / 1.3)), fade = 1 - clamp01((p - 4.8) / 1.2);
        nucleus(P.x - 34 * q, P.y + 24 * q, 9, 6, 30 + i * 7, fade);
        nucleus(P.x + 34 * q, P.y - 24 * q, 9, 6, 36 + i * 7, fade);
      }
      ring(P.x, P.y, 3.7, 90);
    }
  },

  // ---------- Transistor ----------
  transistor(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0b1120', '#06080f');
    const cx = w * 0.5, cy = h * 0.36, R = 33;
    const born = clamp01(t / 1.2); // pha dựng cảnh
    // sóng sin cùng pha, biên độ tuỳ bên
    const wave = (x1, x2, amp, color, lw) => {
      ctx.beginPath();
      for (let x = x1; x <= x2; x += 3) {
        const y = cy + amp * Math.sin(x * 0.06 - t * 5);
        x === x1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
    };
    // tín hiệu nhỏ đi vào (lam) → tín hiệu ra khuếch đại ~4 lần (vàng)
    wave(w * 0.04, cx - R - 26, 9, '#6ee7ff', 2);
    wave(cx + R + 26, w * 0.96, 36 * born, '#ffc857', 3);
    glow(ctx, w * 0.86, cy, 60, 'rgba(255,200,87,.5)', 0.25 * born);
    // ký hiệu transistor NPN sáng nhẹ
    glow(ctx, cx, cy, 85, 'rgba(255,209,102,.7)', 0.26 + 0.1 * Math.sin(t * 2.2));
    circle(ctx, cx, cy, R, 'rgba(12,18,30,.9)', '#cfe3ff', 2.5);
    line(ctx, cx - R - 26, cy, cx - 9, cy, '#cfe3ff', 2.5); // chân B
    line(ctx, cx - 9, cy - 17, cx - 9, cy + 17, '#e9f0f6', 4); // vạch base
    line(ctx, cx - 9, cy - 7, cx + 15, cy - 21, '#cfe3ff', 2.5);
    line(ctx, cx + 15, cy - 21, cx + 15, cy - R - 16, '#cfe3ff', 2.5); // chân C
    line(ctx, cx - 9, cy + 7, cx + 15, cy + 21, '#cfe3ff', 2.5);
    line(ctx, cx + 15, cy + 21, cx + 15, cy + R + 16, '#cfe3ff', 2.5); // chân E
    // mũi tên emitter hướng ra ngoài
    ctx.save();
    ctx.translate(cx + 8, cy + 17);
    ctx.rotate(Math.atan2(14, 24));
    ctx.fillStyle = '#ffc857';
    ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-4, -4.5); ctx.lineTo(-4, 4.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#9fb4d8'; ctx.font = '12px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('B', cx - R - 14, cy - 8);
    ctx.fillText('C', cx + 28, cy - R - 8);
    ctx.fillText('E', cx + 28, cy + R + 20);
    // dải die silicon: chip hiện dần, lấp lánh — hàng tỷ transistor ngày nay
    const cell = 13, gap = 4, gx0 = w * 0.07, gy0 = h * 0.7;
    const cols = Math.floor(w * 0.86 / (cell + gap));
    for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const on = clamp01((t - rnd(i + 5) * 6) / 0.7); // thứ tự hiện ngẫu nhiên có seed
      if (on <= 0) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + rnd(i + 60) * TAU);
      ctx.globalAlpha = on * (0.25 + 0.6 * tw);
      ctx.fillStyle = rnd(i + 31) > 0.86 ? '#ffc857' : '#6ee7ff';
      ctx.fillRect(gx0 + c * (cell + gap), gy0 + r * (cell + gap), cell, cell);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  },

  // ---------- Tàu Shinkansen ----------
  shinkansen(ctx, t, w, h) {
    const horizon = h * 0.62;
    // hoàng hôn Nhật tím - cam
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#2b1a4d');
    sky.addColorStop(0.55, '#8a3d6b');
    sky.addColorStop(1, '#ff9e5e');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.24, horizon - 16, 110, 'rgba(255,180,110,.8)', 0.7);
    circle(ctx, w * 0.24, horizon - 16, 20, '#ffd98a');
    // núi Phú Sĩ trôi RẤT chậm (parallax xa)
    const spanF = w + 560;
    const fx = (w + 280) - ((t * 8) % spanF);
    ctx.fillStyle = '#453a6b';
    ctx.beginPath();
    ctx.moveTo(fx - 235, horizon); ctx.lineTo(fx - 40, horizon - 116);
    ctx.lineTo(fx + 40, horizon - 116); ctx.lineTo(fx + 235, horizon);
    ctx.closePath(); ctx.fill();
    // chỏm tuyết răng cưa
    ctx.fillStyle = '#f2f4fb';
    ctx.beginPath();
    ctx.moveTo(fx - 40, horizon - 116); ctx.lineTo(fx + 40, horizon - 116);
    ctx.lineTo(fx + 64, horizon - 82);
    for (let i = 1; i <= 4; i++) ctx.lineTo(fx + 64 - i * 25.6, horizon - 82 - (i % 2) * 13);
    ctx.lineTo(fx - 64, horizon - 82);
    ctx.closePath(); ctx.fill();
    // lớp đồi gần hơn, trôi nhanh hơn
    ctx.fillStyle = '#233042';
    const spanH = w + 340;
    for (let i = 0; i < 5; i++) {
      const hx = (((i * 215 - t * 46) % spanH) + spanH) % spanH - 170;
      ctx.beginPath();
      ctx.ellipse(hx, horizon + 6, 150, 30 + rnd(i) * 24, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = '#151a20'; ctx.fillRect(0, horizon, w, h - horizon);
    // cột điện lướt nhanh
    const spanP = w + 200;
    for (let i = 0; i < 4; i++) {
      const px = (((i * 190 - t * 160) % spanP) + spanP) % spanP - 100;
      line(ctx, px, horizon + 24, px, horizon - 66, '#0d1116', 5);
      line(ctx, px - 22, horizon - 56, px + 22, horizon - 56, '#0d1116', 4);
      line(ctx, px - 15, horizon - 44, px + 15, horizon - 44, '#0d1116', 3);
    }
    // nền đá + tà vẹt lướt rất nhanh dưới bánh
    ctx.fillStyle = '#20242b'; ctx.fillRect(0, h * 0.77, w, h * 0.12);
    const spanS = w + 40;
    ctx.fillStyle = '#3a3630';
    for (let i = 0; i < 18; i++) {
      const sx = (((i * 38 - t * 560) % spanS) + spanS) % spanS - 20;
      ctx.fillRect(sx, h * 0.785, 14, h * 0.055);
    }
    line(ctx, 0, h * 0.79, w, h * 0.79, '#9aa4ad', 3);
    line(ctx, 0, h * 0.848, w, h * 0.848, '#7d8790', 3);
    // đoàn tàu cố định giữa khung, rung nhẹ
    const shake = Math.sin(t * 27) * 0.8 + Math.sin(t * 41) * 0.5;
    ctx.save();
    ctx.translate(0, shake);
    const ty = h * 0.6, th = 46, bx = w * 0.06, nx = bx + w * 0.66;
    // vệt speed-line phía sau đuôi tàu
    for (let i = 0; i < 6; i++) {
      const ly = ty + 6 + rnd(i) * (th - 10);
      const off = (t * 640 + i * 120) % 220;
      ctx.globalAlpha = 0.28 + rnd(i + 9) * 0.25;
      line(ctx, bx - 10 - off, ly, bx - 55 - off - rnd(i + 3) * 50, ly, '#dfe9f2', 2);
    }
    ctx.globalAlpha = 1;
    // thân trắng + mũi thon dài
    ctx.beginPath();
    ctx.moveTo(bx, ty + th);
    ctx.lineTo(bx, ty + 10);
    ctx.quadraticCurveTo(bx, ty, bx + 14, ty);
    ctx.lineTo(nx, ty);
    ctx.bezierCurveTo(nx + 55, ty + 2, nx + 92, ty + 22, nx + 104, ty + th - 3);
    ctx.quadraticCurveTo(nx + 105, ty + th, nx + 98, ty + th);
    ctx.closePath();
    ctx.fillStyle = '#eef3f6'; ctx.fill();
    ctx.strokeStyle = '#b9c6cf'; ctx.lineWidth = 1.5; ctx.stroke();
    // sọc lam suốt thân, vuốt theo mũi
    ctx.beginPath();
    ctx.moveTo(bx, ty + 22);
    ctx.lineTo(nx, ty + 22);
    ctx.bezierCurveTo(nx + 46, ty + 25, nx + 78, ty + 34, nx + 96, ty + th - 5);
    ctx.strokeStyle = '#2b6fb5'; ctx.lineWidth = 7; ctx.stroke();
    // cửa sổ + kính buồng lái
    for (let i = 0; i < 9; i++) rrect(ctx, bx + 22 + i * 42, ty + 8, 24, 9, 3, '#1d2733');
    ctx.beginPath();
    ctx.moveTo(nx + 8, ty + 3); ctx.quadraticCurveTo(nx + 42, ty + 8, nx + 52, ty + 18);
    ctx.quadraticCurveTo(nx + 30, ty + 15, nx + 6, ty + 12);
    ctx.closePath(); ctx.fillStyle = '#22303e'; ctx.fill();
    // gầm tàu + đèn đầu tàu
    ctx.fillStyle = '#39424c'; ctx.fillRect(bx, ty + th, nx - bx + 96, 6);
    glow(ctx, nx + 100, ty + th - 8, 46, 'rgba(255,244,200,.95)', 0.9);
    circle(ctx, nx + 100, ty + th - 8, 4, '#fff6cf');
    ctx.restore();
  },

  // ---------- Ca ghép tim ----------
  heart(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#160d18', '#070409');
    // nhịp lub-dub: 2 xung co nhanh liên tiếp rồi nghỉ (chu kỳ 1s)
    const p = t % 1;
    const pulse = (start, dur, amp) => {
      const k = (p - start) / dur;
      return k > 0 && k < 1 ? amp * Math.sin(Math.PI * k) : 0;
    };
    const beat = pulse(0, 0.16, 0.12) + pulse(0.22, 0.16, 0.08);
    const hx = w * 0.27, hy = h * 0.52;
    glow(ctx, hx, hy, 130 + beat * 260, 'rgba(255,90,70,.75)', 0.4 + beat * 2.2);
    ctx.save();
    ctx.translate(hx, hy); ctx.scale(1 + beat, 1 + beat);
    // hai mạch lớn trên đỉnh tim
    rrect(ctx, -17, -66, 15, 32, [6, 6, 0, 0], '#b34a55');
    rrect(ctx, 3, -60, 13, 26, [5, 5, 0, 0], '#8f3a4e');
    // thân tim: 2 cung bezier
    const g = ctx.createRadialGradient(-12, -14, 6, 0, 0, 62);
    g.addColorStop(0, '#e2554f'); g.addColorStop(1, '#8e1f2c');
    ctx.beginPath();
    ctx.moveTo(2, -38);
    ctx.bezierCurveTo(-46, -54, -56, -4, -12, 44); // cung trái xuống mỏm tim
    ctx.bezierCurveTo(-8, 48, 0, 46, 4, 40);
    ctx.bezierCurveTo(44, 8, 46, -46, 2, -38); // cung phải
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(60,10,16,.6)'; ctx.lineWidth = 2; ctx.stroke();
    // vệt sáng trên tâm thất
    ctx.strokeStyle = 'rgba(255,190,170,.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-14, -6, 24, -2.4, -1.1); ctx.stroke();
    ctx.restore();
    // màn hình monitor bên phải
    const mx = w * 0.52, my = h * 0.2, mw = w * 0.42, mh = h * 0.56;
    rrect(ctx, mx - 8, my - 8, mw + 16, mh + 16, 10, '#20242c', '#3a4150', 2);
    rrect(ctx, mx, my, mw, mh, 6, '#0a1410');
    // lưới monitor mờ
    for (let i = 1; i < 8; i++) line(ctx, mx + (mw / 8) * i, my, mx + (mw / 8) * i, my + mh, 'rgba(110,231,255,.08)', 1);
    for (let i = 1; i < 5; i++) line(ctx, mx, my + (mh / 5) * i, mx + mw, my + (mh / 5) * i, 'rgba(110,231,255,.08)', 1);
    // dạng sóng ECG: phẳng + QRS nhọn, cùng chu kỳ với nhịp tim
    const baseY = my + mh * 0.55, amp = mh * 0.38;
    const ecg = ph => {
      if (ph < 0.07) return Math.sin(ph / 0.07 * Math.PI) * 0.1; // sóng P
      if (ph < 0.1) return 0;
      if (ph < 0.13) return -(ph - 0.1) / 0.03 * 0.2; // Q
      if (ph < 0.17) return -0.2 + (ph - 0.13) / 0.04 * 1.2; // R vọt lên
      if (ph < 0.21) return 1 - (ph - 0.17) / 0.04 * 1.3; // xuống S
      if (ph < 0.25) return -0.3 + (ph - 0.21) / 0.04 * 0.3;
      if (ph > 0.33 && ph < 0.48) return Math.sin((ph - 0.33) / 0.15 * Math.PI) * 0.18; // sóng T
      return 0;
    };
    ctx.save();
    ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    ctx.beginPath();
    for (let px = 0; px <= mw; px += 2) {
      const y = baseY - ecg(((px / mw) * 1.6 + t) % 1) * amp; // trượt sang trái
      px === 0 ? ctx.moveTo(mx + px, y) : ctx.lineTo(mx + px, y);
    }
    ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // chỉ số nhịp góc màn hình
    ctx.fillStyle = '#ffc857'; ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillText('72', mx + mw - 56, my + 32);
    ctx.fillStyle = 'rgba(255,200,87,.7)'; ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText('BPM', mx + mw - 56, my + 46);
  },

  // ---------- Trống đồng Đông Sơn ----------
  drum(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#12130f', '#050604');
    const cx = w / 2, cy = h / 2, R = h * 0.44;
    // hoa văn trống nhỏ mờ hai góc
    for (const [gx, gy] of [[w * 0.08, h * 0.14], [w * 0.92, h * 0.86]]) {
      ctx.globalAlpha = 0.1;
      circle(ctx, gx, gy, 34, null, '#7a9b76', 2);
      circle(ctx, gx, gy, 22, null, '#7a9b76', 1.5);
      circle(ctx, gx, gy, 8, '#7a9b76');
      ctx.globalAlpha = 1;
    }
    // chu kỳ tiếng trống 2s
    const p = (t % 2) / 2;
    const boom = Math.max(0, 1 - p * 5); // loé sáng ngay sau tiếng trống
    // mặt trống đồng xanh
    const face = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R);
    face.addColorStop(0, '#8fae88');
    face.addColorStop(0.7, '#7a9b76');
    face.addColorStop(1, '#55704f');
    circle(ctx, cx, cy, R, face, '#b08d57', 5);
    // vành vạch chéo ngoài cùng
    const rHatch = R * 0.86;
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * rHatch, cy + Math.sin(a) * rHatch);
      ctx.rotate(a + 0.7);
      line(ctx, -6, 0, 6, 0, '#5f7a58', 2);
      ctx.restore();
    }
    circle(ctx, cx, cy, R * 0.92, null, '#b08d57', 2);
    circle(ctx, cx, cy, R * 0.8, null, '#b08d57', 2);
    // vành chim lạc quay RẤT chậm quanh tâm
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.06);
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i / 8) * TAU);
      ctx.translate(R * 0.66, 0);
      ctx.rotate(Math.PI / 2); // chim bay theo chiều vòng
      ctx.strokeStyle = '#c8a86b'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-12, 3); ctx.quadraticCurveTo(-2, -7, 8, -1); // thân chữ V cong
      ctx.moveTo(8, -1); ctx.quadraticCurveTo(15, -4, 22, -8); // mỏ dài
      ctx.moveTo(-4, -4); ctx.lineTo(2, -12); // cánh
      ctx.moveTo(-12, 3); ctx.lineTo(-19, 8); // đuôi
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.lineCap = 'butt';
    circle(ctx, cx, cy, R * 0.52, null, '#b08d57', 2);
    // vành chấm tròn
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      circle(ctx, cx + Math.cos(a) * R * 0.44, cy + Math.sin(a) * R * 0.44, 3, '#b08d57');
    }
    circle(ctx, cx, cy, R * 0.36, null, '#b08d57', 2);
    // ngôi sao 14 cánh ở tâm, sáng dần
    const lit = clamp01(t / 2.5);
    const starR = R * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU - Math.PI / 2;
      const r = i % 2 === 0 ? starR : starR * 0.42;
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#b08d57'; ctx.fill();
    ctx.globalAlpha = 0.25 + 0.6 * lit + 0.15 * boom;
    ctx.fillStyle = '#ffd166'; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#6b5636'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    glow(ctx, cx, cy, starR * 2.4, 'rgba(255,209,102,.8)', 0.15 + 0.3 * lit + 0.35 * boom);
    // sóng âm vàng lan từ tâm ra ngoài, mờ dần (2 vòng lệch pha)
    for (const d of [0, 0.12]) {
      const q = p - d;
      if (q > 0) {
        ctx.globalAlpha = (1 - q) * 0.6;
        circle(ctx, cx, cy, lerp(starR, R * 1.18, easeOut(q)), null, '#ffc857', 3 - q * 1.5);
        ctx.globalAlpha = 1;
      }
    }
    // mặt trống loé nhẹ theo tiếng
    if (boom > 0) {
      ctx.globalAlpha = boom * 0.12;
      circle(ctx, cx, cy, R, '#ffd166');
      ctx.globalAlpha = 1;
    }
  },

  // ---------- Kênh đào ----------
  canal(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#16263f', '#3a4a58', 0.62);
    drawStars(ctx, w, h, t, 22, 9, 0.35);
    const p = (t % 8) / 8, bed = h * 0.92, yLow = h * 0.74, yHigh = h * 0.56;
    const gL = w * 0.36, gR = w * 0.64, cx = w * 0.5, sandY = h * 0.5;
    // chim bay xa
    ctx.strokeStyle = 'rgba(205,220,235,.7)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const bx = ((t * 14 + i * 170) % (w + 60)) - 30, by = h * (0.14 + i * 0.05);
      ctx.beginPath(); ctx.moveTo(bx - 7, by + Math.sin(t * 6 + i) * 3);
      ctx.quadraticCurveTo(bx, by - 4, bx + 7, by + Math.sin(t * 6 + i) * 3); ctx.stroke();
    }
    // bờ cát hai bên + cây cọ
    ctx.fillStyle = '#c9a26b'; ctx.fillRect(0, sandY, w, h - sandY);
    const palm = (x, y, s) => {
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.strokeStyle = '#5b4632'; ctx.lineWidth = 4 * s;
      ctx.quadraticCurveTo(x + 4 * s, y - 18 * s, x + 8 * s, y - 34 * s); ctx.stroke();
      ctx.strokeStyle = '#2f6b3f'; ctx.lineWidth = 2.5 * s;
      for (let f = 0; f < 5; f++) {
        const a = -Math.PI * 0.92 + f * 0.5 + Math.sin(t * 1.3 + f) * 0.05;
        ctx.beginPath(); ctx.moveTo(x + 8 * s, y - 34 * s);
        ctx.quadraticCurveTo(x + 8 * s + Math.cos(a) * 14 * s, y - 34 * s + Math.sin(a) * 10 * s,
          x + 8 * s + Math.cos(a) * 24 * s, y - 34 * s + Math.sin(a) * 14 * s + 7 * s);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    };
    palm(w * 0.07, sandY + 10, 1.1); palm(w * 0.17, sandY + 6, 0.85); palm(w * 0.88, sandY + 8, 1);
    // mực nước buồng âu dâng rồi xả lại cuối chu kỳ
    const fill = p < 0.28 ? 0 : p < 0.55 ? easeOut((p - 0.28) / 0.27) : p < 0.88 ? 1 : 1 - clamp01((p - 0.88) / 0.1);
    const yCh = lerp(yLow, yHigh, fill);
    ctx.fillStyle = '#1e5570';
    ctx.fillRect(0, yLow, gL, bed - yLow);          // kênh thấp bên trái
    ctx.fillRect(gL, yCh, gR - gL, bed - yCh);      // buồng âu
    ctx.fillRect(gR, yHigh, w - gR, bed - yHigh);   // kênh cao bên phải
    ctx.fillStyle = '#132b3a'; ctx.fillRect(0, bed, w, h - bed); // đáy âu
    line(ctx, 0, yLow, gL, yLow, 'rgba(110,231,255,.5)', 1.5);
    line(ctx, gL, yCh, gR, yCh, 'rgba(110,231,255,.6)', 1.5);
    line(ctx, gR, yHigh, w, yHigh, 'rgba(110,231,255,.5)', 1.5);
    // bọt nước khi đang bơm đầy buồng
    if (p > 0.28 && p < 0.55) {
      ctx.fillStyle = 'rgba(191,232,255,.6)';
      for (let i = 0; i < 6; i++) {
        const rise = (t * 55 + i * 31) % Math.max(20, bed - yCh - 8);
        circle(ctx, gL + 10 + rnd(i + 3) * 26, bed - 6 - rise, 1.6 + rnd(i) * 1.4, 'rgba(191,232,255,.6)');
      }
    }
    // hai cổng âu: sau đóng giữ nước, trước mở cho tàu đi
    const rearClosed = p < 0.2 ? 0 : p < 0.28 ? easeOut((p - 0.2) / 0.08) : p < 0.9 ? 1 : 1 - clamp01((p - 0.9) / 0.08);
    const frontClosed = p < 0.55 ? 1 : p < 0.63 ? 1 - easeOut((p - 0.55) / 0.08) : p < 0.88 ? 0 : clamp01((p - 0.88) / 0.08);
    const gate = (gx, closed) => {
      const gh = (bed - h * 0.5) * (0.14 + 0.86 * closed);
      rrect(ctx, gx - 5, bed - gh, 10, gh, 2, '#233042', '#41556e', 1.5);
      rrect(ctx, gx - 9, h * 0.44, 18, 9, 2, '#31404f');
      glow(ctx, gx, h * 0.44, 13, 'rgba(255,200,100,.9)', 0.45 + 0.2 * Math.sin(t * 4 + gx));
    };
    gate(gL, rearClosed); gate(gR, frontClosed);
    // tàu hơi nước: vào buồng → được nâng lên → đi tiếp
    if (p < 0.88) {
      let sx, sy;
      if (p < 0.2) { sx = lerp(-70, cx, easeOut(p / 0.2)); sy = yLow; }
      else if (p < 0.63) { sx = cx; sy = yCh; }
      else { sx = lerp(cx, w + 80, easeIn((p - 0.63) / 0.25)); sy = yHigh; }
      rrect(ctx, sx - 44, sy - 16, 88, 19, [3, 3, 8, 8], '#2b3542');
      rrect(ctx, sx - 20, sy - 27, 34, 12, 2, '#c9d4dc');
      rrect(ctx, sx + 2, sy - 40, 9, 14, 2, '#a4303f');
      // khói tàu bay ngược về sau
      for (let i = 0; i < 5; i++) {
        const cyc = (t * 26 + i * 24) % 80;
        ctx.globalAlpha = (1 - cyc / 80) * 0.45;
        circle(ctx, sx + 6 - cyc * 0.5, sy - 44 - cyc * 0.7, 3 + cyc * 0.07, '#9aa7b5');
      }
      ctx.globalAlpha = 1;
    }
  },

  // ---------- Container hoá vận tải ----------
  container(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0a1224', '#1e2f4c', 0.72);
    drawStars(ctx, w, h, t, 26, 5, 0.35);
    const p = (t % 14) / 14, waterY = h * 0.72, deckY = h * 0.6, dockX = w * 0.3;
    // đèn thành phố xa mờ
    for (let i = 0; i < 18; i++) {
      ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.8 + i * 1.7));
      ctx.fillStyle = i % 3 ? '#ffd166' : '#6ee7ff';
      ctx.fillRect(rnd(i + 61) * w, h * (0.4 + rnd(i + 92) * 0.05), 2, 2);
    }
    ctx.globalAlpha = 1;
    // biển đêm + bến cảng bên phải
    ctx.fillStyle = '#0c1930'; ctx.fillRect(0, waterY, w, h - waterY);
    ctx.fillStyle = '#16233c'; ctx.fillRect(w * 0.6, h * 0.64, w * 0.4, h - h * 0.64);
    // ánh đèn loang trên mặt nước
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 5; i++) {
      const lx = lerp(w * 0.05, w * 0.5, rnd(i + 14)), ly = waterY + 8 + i * 8;
      line(ctx, lx, ly, lx + 22 + 10 * Math.sin(t * 2 + i), ly, '#ffd166', 2);
    }
    ctx.globalAlpha = 1;
    // cần cẩu giàn
    line(ctx, w * 0.66, h * 0.64, w * 0.66, h * 0.16, '#3c4f6b', 7);
    line(ctx, w * 0.88, h * 0.64, w * 0.88, h * 0.16, '#3c4f6b', 7);
    line(ctx, w * 0.05, h * 0.165, w * 0.94, h * 0.165, '#48597a', 6);
    line(ctx, w * 0.66, h * 0.3, w * 0.88, h * 0.165, '#33445e', 3);
    glow(ctx, w * 0.05, h * 0.165, 10, 'rgba(255,90,90,.9)', 0.5 + 0.3 * Math.sin(t * 3));
    // vị trí tàu theo pha: bốc hàng → rời bến → tàu mới cập cảng
    let sx = dockX, loaded = 1;
    if (p >= 0.62 && p < 0.8) sx = dockX + easeIn((p - 0.62) / 0.18) * w * 1.2;
    else if (p >= 0.8) { loaded = 0; sx = lerp(-w * 0.45, dockX, easeOut(clamp01((p - 0.84) / 0.16))); }
    const moving = (p >= 0.64 && p < 0.8) || (p >= 0.84 && p < 0.97);
    if (sx > -w * 0.32) {
      // vệt nước sau lái khi tàu chạy
      if (moving) {
        for (let i = 0; i < 4; i++) {
          ctx.globalAlpha = 0.4 - i * 0.08;
          line(ctx, sx - 122 - i * 20, waterY + 6 + i * 3, sx - 150 - i * 26, waterY + 6 + i * 3, '#dff2ff', 2);
        }
        ctx.globalAlpha = 1;
      }
      // thân tàu + đài chỉ huy
      ctx.beginPath();
      ctx.moveTo(sx - 120, deckY); ctx.lineTo(sx + 110, deckY);
      ctx.lineTo(sx + 96, waterY + 10); ctx.lineTo(sx - 108, waterY + 10);
      ctx.closePath(); ctx.fillStyle = '#25374f'; ctx.fill();
      rrect(ctx, sx + 74, deckY - 34, 26, 34, [3, 3, 0, 0], '#c9d4dc');
      ctx.fillStyle = '#ffd166'; ctx.fillRect(sx + 79, deckY - 28, 4, 3); ctx.fillRect(sx + 89, deckY - 28, 4, 3);
      // 6 container: cẩu chuyển ngang rồi hạ xuống có nảy nhẹ
      const cols = ['#ff8c42', '#2f6bd8', '#8f2d3c'], seg = 0.56 / 6;
      for (let i = 0; i < 6 && loaded; i++) {
        const k = (p - (0.04 + i * seg)) / (seg * 0.92);
        if (k <= 0) continue;
        const tx = sx - 84 + (i % 2) * 50, ty = deckY - 16 * (Math.floor(i / 2) + 1);
        let x = tx, y = ty;
        if (k < 1 && p < 0.62) {
          const kh = clamp01(k / 0.35), kv = clamp01((k - 0.35) / 0.65);
          x = lerp(w * 0.76, tx, easeOut(kh));
          y = lerp(h * 0.2, ty, easeOut(kv)) - Math.sin(clamp01((kv - 0.78) / 0.22) * Math.PI) * 4;
          rrect(ctx, x + 14, h * 0.15, 18, 9, 2, '#4a5c76'); // xe con trên dầm
          line(ctx, x + 23, h * 0.16, x + 23, y, '#8fa2ba', 1.5); // cáp treo
        }
        rrect(ctx, x, y, 46, 15, 2, cols[i % 3], 'rgba(0,0,0,.35)', 1);
        line(ctx, x + 15, y, x + 15, y + 15, 'rgba(0,0,0,.25)', 1.5);
        line(ctx, x + 31, y, x + 31, y + 15, 'rgba(0,0,0,.25)', 1.5);
      }
    }
    // đèn pha cảng
    for (const px of [w * 0.7, w * 0.93]) {
      line(ctx, px, h * 0.64, px, h * 0.34, '#2c3a52', 3);
      glow(ctx, px, h * 0.33, 46, 'rgba(255,209,102,.95)', 0.75);
      circle(ctx, px, h * 0.33, 4, '#ffe9b0');
    }
  },

  // ---------- Con đường Tơ lụa ----------
  caravan(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#151030', '#3a2350', 0.78);
    drawStars(ctx, w, h, t, 55, 21, 0.5);
    // trăng lớn
    glow(ctx, w * 0.76, h * 0.2, 120, 'rgba(255,236,190,.8)', 0.7);
    circle(ctx, w * 0.76, h * 0.2, 30, '#f6e7c1');
    circle(ctx, w * 0.755, h * 0.185, 6, '#e6d4a8');
    circle(ctx, w * 0.78, h * 0.225, 4, '#e6d4a8');
    // hai lớp cồn cát sin trôi parallax, chân trời tím than
    const dune = (baseY, amp, freq, off, color) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        ctx.lineTo(x, baseY + Math.sin((x + off) * freq) * amp + Math.sin((x + off) * freq * 2.7) * amp * 0.35);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    };
    dune(h * 0.6, 10, 0.012, t * 5, '#2c1d46');
    dune(h * 0.73, 15, 0.009, t * 11, '#1e1436');
    ctx.fillStyle = '#120b20'; ctx.fillRect(0, h * 0.85, w, h * 0.15); // cát tiền cảnh
    // một con lạc đà silhouette: bướu, cổ cong, chân đung đưa lệch pha
    const camel = (x, y, s, ph, i) => {
      ctx.fillStyle = '#0d0818'; ctx.lineCap = 'round';
      const bob = Math.sin(ph * 2) * 1.6 * s, by = y - 30 * s + bob;
      ctx.beginPath(); ctx.ellipse(x, y + 3, 26 * s, 4 * s, 0, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); // bóng đổ
      ctx.fillStyle = '#0d0818';
      for (let l = 0; l < 4; l++) {
        const lx = x + (l < 2 ? 15 : -15) * s + (l % 2 ? 5 : -3) * s;
        const sw = Math.sin(ph + l * 2.1) * 8 * s;
        line(ctx, lx, by + 8 * s, lx + sw, y - Math.abs(Math.sin(ph + l * 2.1)) * 2 * s, '#0d0818', 3.5 * s);
      }
      ctx.beginPath(); ctx.ellipse(x, by, 24 * s, 11 * s, 0, 0, TAU); ctx.fill();
      circle(ctx, x - 9 * s, by - 10 * s, 8 * s, '#0d0818'); // bướu sau
      circle(ctx, x + 7 * s, by - 9 * s, 7 * s, '#0d0818');  // bướu trước
      rrect(ctx, x - 12 * s, by - 19 * s, 24 * s, 9 * s, 3, '#0d0818'); // kiện hàng
      ctx.strokeStyle = '#0d0818'; ctx.lineWidth = 6 * s;
      ctx.beginPath(); ctx.moveTo(x + 20 * s, by - 4 * s);
      ctx.quadraticCurveTo(x + 32 * s, by - 16 * s, x + 31 * s, by - 26 * s); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + 34 * s, by - 27 * s, 6 * s, 3.5 * s, 0.25, 0, TAU); ctx.fill();
      line(ctx, x - 23 * s, by - 2 * s, x - 28 * s, by + 8 * s, '#0d0818', 2 * s); // đuôi
      // hàng hoá lấp lánh chấm vàng
      ctx.fillStyle = '#ffd166';
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = 0.35 + 0.6 * Math.abs(Math.sin(t * 2.6 + i * 3 + k * 2.1));
        ctx.fillRect(x + (k - 1) * 8 * s, by - 16 * s - rnd(i * 5 + k) * 5 * s, 2.4, 2.4);
      }
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    };
    for (let i = 0; i < 5; i++) camel(w * (0.14 + i * 0.155), h * 0.9, 1.15, t * 3 + i * 0.9, i);
    // người dắt đoàn phía trước
    const px = w * 0.9, py = h * 0.9, pph = t * 3;
    ctx.lineCap = 'round';
    circle(ctx, px, py - 34, 4.5, '#0d0818');
    line(ctx, px, py - 30, px, py - 14, '#0d0818', 5);
    line(ctx, px, py - 14, px + Math.sin(pph) * 6, py, '#0d0818', 3);
    line(ctx, px, py - 14, px - Math.sin(pph) * 6, py, '#0d0818', 3);
    line(ctx, px, py - 26, px + 8, py - 18, '#0d0818', 3);
    line(ctx, px + 8, py - 40, px + 8, py, '#3a2a1c', 2.5); // gậy
    ctx.lineCap = 'butt';
  },

  // ---------- Angkor Wat ----------
  temple(ctx, t, w, h) {
    const horizon = h * 0.62;
    // trời bình minh tím -> cam
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, '#2b1740'); g.addColorStop(0.55, '#83405f'); g.addColorStop(1, '#f2994a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon);
    // mặt trời mọc dần sau tháp
    const rise = easeOut(clamp01(t / 8));
    const sunX = w * 0.5, sunY = horizon + 16 - rise * 72;
    glow(ctx, sunX, sunY, 135, 'rgba(255,180,90,.85)', 0.45 + 0.4 * rise);
    circle(ctx, sunX, sunY, 24, '#ffd98a');
    // tháp búp sen: thân bậc thang thu dần, đỉnh nhọn
    const tower = (tx, bw, th) => {
      ctx.beginPath(); ctx.moveTo(tx - bw, horizon);
      for (let s = 1; s <= 4; s++) {
        const r = 1 - s * 0.2, y = horizon - th * (0.16 + s * 0.17);
        ctx.lineTo(tx - bw * (r + 0.14), y); ctx.lineTo(tx - bw * r, y - th * 0.04);
      }
      ctx.lineTo(tx, horizon - th);
      for (let s = 4; s >= 1; s--) {
        const r = 1 - s * 0.2, y = horizon - th * (0.16 + s * 0.17);
        ctx.lineTo(tx + bw * r, y - th * 0.04); ctx.lineTo(tx + bw * (r + 0.14), y);
      }
      ctx.closePath(); ctx.fill();
    };
    // cây thốt nốt: thân cong + chùm lá quạt
    const palm = (px, ph2, dir) => {
      ctx.beginPath(); ctx.moveTo(px, horizon);
      ctx.quadraticCurveTo(px + dir * 7, horizon - ph2 * 0.6, px + dir * 13, horizon - ph2);
      ctx.strokeStyle = '#150c1a'; ctx.lineWidth = 5; ctx.stroke();
      const lx = px + dir * 13, ly = horizon - ph2;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.44 + 0.04 * Math.sin(t * 1.4 + i);
        line(ctx, lx, ly, lx + Math.cos(a) * 24, ly + Math.sin(a) * 24, '#150c1a', 3);
      }
    };
    // silhouette đền vẽ 2 lần: cảnh thật & bóng phản chiếu
    const silhouette = () => {
      ctx.fillStyle = '#150c1a';
      ctx.fillRect(0, horizon - 12, w, 12);
      ctx.fillRect(w * 0.2, horizon - 22, w * 0.6, 12);
      [0.5, 0.74, 1, 0.74, 0.5].forEach((k, i) =>
        tower(w * (0.26 + i * 0.12), 15 + k * 15, h * 0.37 * k));
      palm(w * 0.055, h * 0.24, 1); palm(w * 0.945, h * 0.24, -1);
    };
    silhouette();
    // hồ nước + phản chiếu ngược, méo nhẹ bằng shear sin chạy
    const wg = ctx.createLinearGradient(0, horizon, 0, h);
    wg.addColorStop(0, '#241536'); wg.addColorStop(1, '#0c0714');
    ctx.fillStyle = wg; ctx.fillRect(0, horizon, w, h - horizon);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, horizon, w, h - horizon); ctx.clip();
    ctx.translate(0, horizon * 2);
    ctx.transform(1, 0, 0.028 * Math.sin(t * 1.5), -1, 0, 0);
    ctx.globalAlpha = 0.35;
    silhouette();
    ctx.restore();
    // vệt nắng lung linh + vài gợn sóng
    for (let i = 0; i < 5; i++) {
      const ry = horizon + 10 + i * 15, off = Math.sin(t * 1.7 + i * 1.9) * 12;
      line(ctx, sunX - 26 - i * 15 + off, ry, sunX + 26 + i * 15 + off, ry,
        `rgba(255,190,110,${0.3 - i * 0.05})`, 2);
    }
    for (let i = 0; i < 4; i++) {
      const rx = rnd(i + 30) * w, ry2 = horizon + 14 + rnd(i + 60) * (h - horizon - 24);
      ctx.strokeStyle = 'rgba(160,140,200,.2)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(rx, ry2, 16 + 9 * Math.sin(t * 1.2 + i * 2.4), 2.5, 0, 0, TAU);
      ctx.stroke();
    }
    // đàn chim chữ V bay ngang trời
    const bx = w + 90 - ((t * 46) % (w + 220)), by = h * 0.16 + Math.sin(t * 0.8) * 9;
    ctx.strokeStyle = '#170f22'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const k = Math.ceil(i / 2), side = i % 2 ? -1 : 1;
      const px = bx + k * 15, py = by + side * k * 7;
      const wy = 3.5 * Math.sin(t * 8 + i * 1.1);
      ctx.beginPath();
      ctx.moveTo(px - 5, py - wy); ctx.lineTo(px, py); ctx.lineTo(px + 5, py - wy);
      ctx.stroke();
    }
  },

  // ---------- Vòm & bê tông La Mã ----------
  arch(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#181322', '#0b0812');
    const cx = w / 2, floor = h * 0.82, springY = h * 0.58, R = w * 0.13, th = 26;
    const N = 9, seg = Math.PI / N, stepT = 0.55;
    const keyLand = (N - 1) * stepT + 0.45, doneT = keyLand + 0.8;
    ctx.fillStyle = '#221b2c'; ctx.fillRect(0, floor, w, h - floor);
    // pha Pantheon: mái vòm lớn + oculus hiện dần sau khi vòm tự đứng
    const pan = clamp01((t - doneT - 1.4) / 2.2);
    if (pan > 0) {
      const DR = w * 0.36, oy = floor - DR;
      ctx.globalAlpha = pan * 0.9;
      ctx.strokeStyle = '#9a90a8'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(cx, floor, DR, Math.PI, Math.PI * 1.5 - 0.09); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, floor, DR, Math.PI * 1.5 + 0.09, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(154,144,168,.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, floor, DR - 14, Math.PI, TAU); ctx.stroke();
      // chùm tia nắng chéo từ oculus, xoay rất chậm
      const sway = Math.sin(t * 0.11) * 0.55, fx = cx + sway * DR;
      ctx.fillStyle = `rgba(255,209,102,${0.15 * pan})`;
      ctx.beginPath();
      ctx.moveTo(cx - 9, oy + 6); ctx.lineTo(cx + 9, oy + 6);
      ctx.lineTo(fx + 44, floor); ctx.lineTo(fx - 44, floor);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,224,150,${0.18 * pan})`;
      ctx.beginPath();
      ctx.moveTo(cx - 4, oy + 6); ctx.lineTo(cx + 4, oy + 6);
      ctx.lineTo(fx + 18, floor); ctx.lineTo(fx - 18, floor);
      ctx.closePath(); ctx.fill();
      // vũng nắng trên sàn + oculus sáng
      ctx.fillStyle = `rgba(255,209,102,${0.28 * pan})`;
      ctx.beginPath(); ctx.ellipse(fx, floor, 46, 7, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      glow(ctx, cx, oy + 4, 40, 'rgba(255,230,170,.9)', 0.5 * pan);
    }
    // hai trụ đỡ
    ctx.fillStyle = '#6f6880';
    ctx.fillRect(cx - R - th, springY - 2, th, floor - springY + 2);
    ctx.fillRect(cx + R, springY - 2, th, floor - springY + 2);
    // khung gỗ chống hình cung — mờ dần khi vòm hoàn tất
    const frameA = 1 - clamp01((t - doneT) / 1.4);
    if (frameA > 0) {
      ctx.globalAlpha = frameA * 0.9;
      ctx.strokeStyle = '#7a5a33'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, springY, R - 3, Math.PI, TAU); ctx.stroke();
      for (let i = 1; i < 6; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        line(ctx, cx, springY, cx + Math.cos(a) * (R - 4), springY + Math.sin(a) * (R - 4), '#6b4e2c', 3);
      }
      line(ctx, cx, springY, cx, floor, '#6b4e2c', 5);
      ctx.globalAlpha = 1;
    }
    // đá nêm đặt lần lượt từ hai chân lên, đá khoá hạ xuống cuối cùng
    for (let o = 0; o < N; o++) {
      const isKey = o === N - 1;
      const p = clamp01((t - o * stepT) / 0.45);
      if (p <= 0) continue;
      const idx = isKey ? (N - 1) / 2 : (o % 2 === 0 ? o / 2 : N - 1 - (o - 1) / 2);
      const a0 = Math.PI + idx * seg, dy = (1 - easeOut(p)) * (isKey ? -95 : -45);
      ctx.globalAlpha = 0.35 + 0.65 * p;
      ctx.beginPath();
      ctx.arc(cx, springY + dy, R + th, a0 + 0.012, a0 + seg - 0.012);
      ctx.arc(cx, springY + dy, R, a0 + seg - 0.012, a0 + 0.012, true);
      ctx.closePath();
      ctx.fillStyle = isKey ? '#a89a6e' : (idx % 2 ? '#8b8496' : '#7d7589');
      ctx.fill();
      ctx.strokeStyle = '#39324a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // loé sáng khoảnh khắc đá khoá vào vị trí
    const flash = clamp01(1 - Math.abs(t - keyLand) / 0.5);
    if (flash > 0) glow(ctx, cx, springY - R - th / 2, 75, '#ffd166', flash * 0.85);
  },

  // ---------- Thế vận hội Olympia ----------
  olympic(ctx, t, w, h) {
    // nền bình gốm đất nung sẫm
    bgGrad(ctx, w, h, '#8f4c21', '#4e2810');
    const bandY = h * 0.3, bandH = h * 0.42, ink = '#241206';
    // dải băng giữa kiểu black-figure
    ctx.fillStyle = '#b5652f'; ctx.fillRect(0, bandY, w, bandH);
    line(ctx, 0, bandY, w, bandY, ink, 2);
    line(ctx, 0, bandY + bandH, w, bandY + bandH, ink, 2);
    // hoa văn mê cung viền trên dưới
    const meander = (y) => {
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      for (let x = 0; x < w; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 13); ctx.lineTo(x + 2, y + 3); ctx.lineTo(x + 18, y + 3);
        ctx.lineTo(x + 18, y + 9); ctx.lineTo(x + 9, y + 9);
        ctx.stroke();
      }
    };
    meander(bandY + 3); meander(bandY + bandH - 17);
    // vận động viên silhouette đen, chân tay theo pha sin lệch nhau
    const runner = (x, gy, ph) => {
      ctx.save(); ctx.translate(x, gy);
      ctx.strokeStyle = ink; ctx.lineCap = 'round';
      circle(ctx, 9, -47, 6.5, ink);
      line(ctx, -2, -22, 7, -40, ink, 7);
      ctx.lineWidth = 4.5;
      for (const off of [0, Math.PI]) {                 // hai tay đánh so le
        const s = Math.sin(ph + off);
        ctx.beginPath();
        ctx.moveTo(5, -37); ctx.lineTo(5 + s * 9, -29); ctx.lineTo(5 + s * 9 + 8, -29 - s * 6);
        ctx.stroke();
      }
      for (const off of [0, Math.PI]) {                 // hai chân guồng chạy
        const s = Math.sin(ph + off);
        const kx = -2 + s * 12, fy = -Math.max(0, -s) * 9;
        ctx.beginPath();
        ctx.moveTo(-2, -22); ctx.lineTo(kx, -11); ctx.lineTo(kx + Math.cos(ph + off) * 9, fy);
        ctx.stroke();
      }
      ctx.lineCap = 'butt'; ctx.restore();
    };
    const gy = bandY + bandH - 24;
    for (let i = 0; i < 4; i++) {
      const x = ((t * 62 + i * 155) % (w + 130)) - 65;  // chạy ngang lặp vòng
      runner(x, gy, t * 8 + i * 1.7);
    }
    // 2 cột Doric mờ hai bên
    ctx.globalAlpha = 0.15; ctx.fillStyle = '#ecd2a3';
    for (const colX of [w * 0.05, w * 0.95]) {
      ctx.fillRect(colX - 15, h * 0.09, 30, h);
      ctx.fillRect(colX - 21, h * 0.05, 42, 9);
      ctx.fillRect(colX - 18, h * 0.075, 36, 6);
      for (let f = -1; f <= 1; f++) line(ctx, colX + f * 8, h * 0.1, colX + f * 8, h, 'rgba(46,22,8,.7)', 2);
    }
    ctx.globalAlpha = 1;
    // ngọn đuốc cháy nhấp nháy góc trên trái
    const tx = w * 0.1, ty = h * 0.17;
    glow(ctx, tx, ty - 16, 55, 'rgba(255,200,87,.9)', 0.32 + 0.1 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23));
    line(ctx, tx, ty + 30, tx, ty + 2, '#3a1f0c', 6);
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.ellipse(tx, ty, 9, 5, 0, 0, TAU); ctx.fill();
    for (const [c, s, f] of [['#ffc857', 1, 7], ['#ffd166', 0.6, 9]]) { // hai lớp lửa
      const fh2 = (26 + 5 * Math.sin(t * f)) * s;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(tx - 7 * s, ty);
      ctx.quadraticCurveTo(tx - 8 * s, ty - fh2 * 0.5, tx + Math.sin(t * f * 1.3) * 4 * s, ty - fh2);
      ctx.quadraticCurveTo(tx + 8 * s, ty - fh2 * 0.5, tx + 7 * s, ty);
      ctx.closePath(); ctx.fill();
    }
    // vòng nguyệt quế góc trên phải (hở phía trên)
    const wx = w * 0.905, wy = h * 0.155;
    circle(ctx, wx, wy, 19, null, 'rgba(255,209,102,.35)', 2);
    ctx.fillStyle = '#2f240e';
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + 0.5 + i * (TAU - 1) / 11;
      ctx.save();
      ctx.translate(wx + Math.cos(a) * 19, wy + Math.sin(a) * 19);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 2.6, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  },

  // ---------- Quang học Ibn al-Haytham ----------
  optics(ctx, t, w, h) {
    const cx = w * 0.5, cy = h * 0.5, hole = 7;
    // phòng tối bên trái, cảnh ngoài trời bên phải
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, cx, h);
    const sky = ctx.createLinearGradient(cx, 0, cx, h);
    sky.addColorStop(0, '#172440'); sky.addColorStop(1, '#0e1626');
    ctx.fillStyle = sky; ctx.fillRect(cx, 0, w - cx, h);
    ctx.fillStyle = '#15202f'; ctx.fillRect(cx, h * 0.74, w - cx, h * 0.26);
    // mặt trời và ngọn nến ngoài trời
    glow(ctx, w * 0.91, h * 0.15, 70, 'rgba(255,209,102,.9)', 0.85);
    circle(ctx, w * 0.91, h * 0.15, 15, '#ffd166');
    const candX = cx + 42, candY = h * 0.74;
    rrect(ctx, candX - 4, candY - 26, 8, 26, 3, '#e8d8b0');
    glow(ctx, candX, candY - 32, 26, 'rgba(255,200,90,.9)', 0.7);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.ellipse(candX, candY - 33, 3.2, 6 + 1.2 * Math.sin(t * 11), 0, 0, TAU);
    ctx.fill();
    // cây: dùng chung cho cảnh thật và ảnh chiếu ngược
    const tx = w * 0.79, baseY = h * 0.74, topY = h * 0.3;
    const drawTree = () => {
      ctx.lineCap = 'round';
      line(ctx, 0, 0, 0, -h * 0.26, '#7a5a38', 7);
      ctx.lineCap = 'butt';
      circle(ctx, 0, -h * 0.33, h * 0.11, '#3f7d4e');
      circle(ctx, -h * 0.09, -h * 0.27, h * 0.075, '#356d43');
      circle(ctx, h * 0.09, -h * 0.27, h * 0.075, '#356d43');
    };
    ctx.save(); ctx.translate(tx, baseY); drawTree(); ctx.restore();
    // bức tường giữa với lỗ nhỏ (camera obscura)
    ctx.fillStyle = '#2b2115';
    ctx.fillRect(cx - 5, 0, 10, cy - hole);
    ctx.fillRect(cx - 5, cy + hole, 10, h - cy - hole);
    // tia sáng đi CHÉO qua lỗ: đỉnh cây xuống thấp, gốc cây lên cao
    const wallX = w * 0.09, sImg = (cx - wallX) / (tx - cx);
    const yTopImg = cy + (cy - topY) * sImg;   // ảnh của đỉnh cây
    const yBaseImg = cy - (baseY - cy) * sImg; // ảnh của gốc cây
    const u = easeOut(clamp01((t - 0.6) / 2.4));
    ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 2.4);
    for (const [sy, ey] of [[topY, yTopImg], [baseY, yBaseImg]]) {
      ctx.beginPath(); ctx.moveTo(tx, sy);
      if (u <= 0.5) {
        ctx.lineTo(lerp(tx, cx, u * 2), lerp(sy, cy, u * 2));
      } else {
        ctx.lineTo(cx, cy);
        const v = (u - 0.5) * 2;
        ctx.lineTo(lerp(cx, wallX, v), lerp(cy, ey, v));
      }
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.3; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // ảnh cái cây NGƯỢC ĐẦU hiện dần trên tường trái
    const imgA = clamp01((t - 3) / 2.2);
    if (imgA > 0) {
      glow(ctx, wallX, cy, h * 0.42, 'rgba(255,214,150,.35)', imgA * 0.5);
      ctx.save();
      ctx.globalAlpha = imgA * (0.55 + 0.06 * Math.sin(t * 3));
      ctx.translate(wallX, yBaseImg); ctx.scale(-0.9, -sImg);
      drawTree();
      ctx.restore();
    }
    // sơ đồ con mắt mờ góc dưới: nghiên cứu thị giác
    ctx.save();
    ctx.translate(w * 0.17, h * 0.87); ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-34, 0); ctx.quadraticCurveTo(0, -20, 34, 0);
    ctx.quadraticCurveTo(0, 20, -34, 0); ctx.stroke();
    circle(ctx, -10, 0, 8, null, '#6ee7ff', 1.5);
    line(ctx, 34, -4, 60, -10, '#6ee7ff', 1);
    line(ctx, 34, 4, 60, 10, '#6ee7ff', 1);
    ctx.restore();
  },

  // ---------- Cơ học lượng tử ----------
  quantum(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0b1026', '#05070f');
    // ký hiệu ψ, ħ trôi mờ trong nền
    ctx.font = 'italic 30px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#6ee7ff';
    for (let i = 0; i < 5; i++) {
      const x = rnd(i + 60) * w * 0.9, y = h * (0.15 + rnd(i + 90) * 0.7);
      ctx.globalAlpha = 0.06 + 0.05 * Math.sin(t * 0.8 + i * 2);
      ctx.fillText(i % 2 ? 'ħ' : 'ψ', x, y + Math.sin(t * 0.4 + i) * 12);
    }
    ctx.globalAlpha = 1;
    const cx = w * 0.5, cy = h * 0.4;
    // vành orbital elip biến hình chậm
    for (let k = 0; k < 3; k++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(k * TAU / 6 + t * 0.12 * (k % 2 ? 1 : -1));
      ctx.beginPath();
      ctx.ellipse(0, 0, 96 + k * 26 + 8 * Math.sin(t * 0.5 + k),
        34 + 10 * Math.sin(t * 0.35 + k * 2.1), 0, 0, TAU);
      ctx.strokeStyle = 'rgba(110,231,255,.22)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }
    // hạt nhân
    glow(ctx, cx, cy, 46, 'rgba(255,200,102,.9)', 0.55 + 0.1 * Math.sin(t * 3));
    for (let i = 0; i < 6; i++) {
      const a = rnd(i + 10) * TAU, r = 3 + rnd(i + 20) * 5;
      circle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4.5,
        i % 2 ? '#ffc857' : '#ff8f5a');
    }
    // đám mây electron: chấm xác suất nhấp nháy, trong dày ngoài thưa
    for (let i = 0; i < 80; i++) {
      const rr = 20 + Math.pow(rnd(i), 1.7) * 130;
      const a = rnd(i + 200) * TAU + t * 0.06 * (rnd(i + 300) > 0.5 ? 1 : -1);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.72;
      ctx.globalAlpha = (0.15 + 0.75 * Math.abs(Math.sin(t * 2.2 + i * 2.4))) *
        (1 - rr / 190);
      ctx.fillStyle = i % 7 ? '#8be9ff' : '#ffd166';
      ctx.fillRect(x, y, 2.4, 2.4);
    }
    ctx.globalAlpha = 1;
    // lưỡng tính sóng–hạt: gói sóng chạy tới màn đo rồi sụp thành một chấm
    const sy = h * 0.85, x0 = w * 0.1, xm = w * 0.72;
    line(ctx, w * 0.06, sy, w * 0.94, sy, 'rgba(140,160,190,.18)', 1); // trục
    line(ctx, xm, sy - 32, xm, sy + 32, 'rgba(255,209,102,.75)', 3);  // màn đo
    const T = 4, p = (t % T) / T;
    if (p < 0.68) {
      const px = lerp(x0, xm, p / 0.68);
      ctx.beginPath();
      for (let x = px - 66; x <= px + 66; x += 3) {
        const env = Math.exp(-(((x - px) / 30) ** 2));
        const y = sy + Math.sin(x * 0.28 - t * 9) * 15 * env;
        x === px - 66 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      // sụp đổ hàm sóng: MỘT chấm loé sáng tại màn rồi tắt dần
      const k = (p - 0.68) / 0.32;
      glow(ctx, xm, sy, 40, 'rgba(255,255,255,.9)', (1 - k) * 0.9);
      ctx.globalAlpha = 1 - easeIn(k);
      circle(ctx, xm, sy, 4, '#ffffff');
      circle(ctx, xm, sy, 6 + k * 26, null, 'rgba(110,231,255,.6)', 1.5);
      ctx.globalAlpha = 1;
    }
  },

  // ---------- Máy gia tốc & hạt Higgs ----------
  collider(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0a1322', '#04070d');
    // lưới kỹ thuật mờ
    for (let x = 20; x < w; x += 40) line(ctx, x, 0, x, h, 'rgba(110,231,255,.05)', 1);
    for (let y = 20; y < h; y += 40) line(ctx, 0, y, w, y, 'rgba(110,231,255,.05)', 1);
    const cx = w * 0.5, cy = h * 0.52, R = h * 0.36;
    // vòng gia tốc viền kép + các đoạn nam châm
    circle(ctx, cx, cy, R + 7, null, 'rgba(150,190,235,.4)', 2);
    circle(ctx, cx, cy, R - 7, null, 'rgba(150,190,235,.25)', 1.5);
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * TAU;
      line(ctx, cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4),
        cx + Math.cos(a) * (R + 4), cy + Math.sin(a) * (R + 4),
        i % 2 ? 'rgba(255,200,87,.35)' : 'rgba(110,231,255,.3)', 3);
    }
    // ô detector tại đỉnh vòng
    const detA = -Math.PI / 2;
    const dx = cx + Math.cos(detA) * R, dy = cy + Math.sin(detA) * R;
    rrect(ctx, dx - 8, dy - 8, 16, 16, 3, '#101c2e', '#ffd166', 1.5);
    const T = 5, p = (t % T) / T, cut = 0.72;
    if (p < cut) {
      // 2 chùm hạt chạy ngược chiều, nhanh dần về detector
      const q = (p / cut) ** 2;
      for (const [dir, laps, col] of [[-1, 1.5, '#6ee7ff'], [1, 2.5, '#ffc857']]) {
        for (let j = 6; j >= 1; j--) { // đuôi mờ dần phía sau
          const qa = Math.max(0, q - j * 0.008 * (0.4 + q));
          const aa = detA + dir * TAU * laps * (1 - qa);
          ctx.globalAlpha = (1 - j / 7) * 0.6;
          circle(ctx, cx + Math.cos(aa) * R, cy + Math.sin(aa) * R, 3.4 - j * 0.4, col);
        }
        ctx.globalAlpha = 1;
        const a = detA + dir * TAU * laps * (1 - q);
        const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
        glow(ctx, px, py, 26,
          dir < 0 ? 'rgba(110,231,255,.9)' : 'rgba(255,200,87,.9)', 0.8);
        circle(ctx, px, py, 4, col);
      }
    } else {
      // va chạm: vệt cong xoắn nhiều màu toả ra + vòng năng lượng giãn nở
      const k = (p - cut) / (1 - cut);
      const cols = ['#ffd166', '#6ee7ff', '#ff7b7b', '#b48bff', '#7bffb0', '#ffc857'];
      glow(ctx, dx, dy, 60 + 90 * k, 'rgba(255,240,200,.95)', (1 - k) * 0.9);
      circle(ctx, dx, dy, 6 + k * 105, null, `rgba(255,209,102,${(1 - k) * 0.7})`, 2);
      circle(ctx, dx, dy, 4 + k * 66, null, `rgba(110,231,255,${(1 - k) * 0.5})`, 1.5);
      ctx.lineCap = 'round';
      ctx.globalAlpha = (1 - k) * 0.9;
      for (let i = 0; i < 13; i++) {
        const a0 = rnd(i + 40) * TAU, curv = (rnd(i + 80) - 0.5) * 3.2;
        const len = 34 + rnd(i + 120) * 64;
        ctx.beginPath();
        for (let s = 0; s <= 1.001; s += 0.1) {
          const ss = s * easeOut(k); // từ trường bẻ cong quỹ đạo dần
          const ang = a0 + curv * ss * ss;
          const x = dx + Math.cos(ang) * ss * len, y = dy + Math.sin(ang) * ss * len;
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    }
    // số liệu giả nhấp nháy
    ctx.font = '10px "JetBrains Mono", monospace';
    const stats = ['√s = 13 TeV', 'L = 2.4e34', 'm(H) ≈ 125 GeV', 'evt 40 MHz'];
    for (let i = 0; i < stats.length; i++) {
      ctx.globalAlpha = 0.25 + 0.3 * Math.abs(Math.sin(t * 2.1 + i * 1.9));
      ctx.fillStyle = i % 2 ? '#6ee7ff' : '#ffd166';
      ctx.fillText(stats[i], i < 2 ? 12 : w - 112, i % 2 ? h - 12 : 18);
    }
    ctx.globalAlpha = 1;
  },

  // ---------- Gây mê phẫu thuật ----------
  anesthesia(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#26190f', '#0d0806');
    const ty = h * 0.60, hx = w * 0.30, hy = ty - 12;
    // đèn mổ tròn treo trần toả glow ấm
    line(ctx, w * 0.5, 0, w * 0.5, h * 0.10, '#3c2d1b', 5);
    glow(ctx, w * 0.5, h * 0.15, 160, 'rgba(255,200,120,.85)', 0.5 + 0.05 * Math.sin(t * 2));
    circle(ctx, w * 0.5, h * 0.15, 26, '#57431f', '#7c5c30', 3);
    circle(ctx, w * 0.5, h * 0.15, 14, '#ffd166');
    // nón sáng rọi xuống bàn mổ
    ctx.fillStyle = 'rgba(255,205,120,.07)';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 22, h * 0.17); ctx.lineTo(w * 0.5 + 22, h * 0.17);
    ctx.lineTo(w * 0.5 + 185, ty + 24); ctx.lineTo(w * 0.5 - 185, ty + 24);
    ctx.closePath(); ctx.fill();
    // đồng hồ treo tường quay nhanh — ca mổ trôi vèo qua giấc mê
    const cwx = w * 0.855, cwy = h * 0.20;
    circle(ctx, cwx, cwy, 17, '#1c140c', '#7c5c30', 2.5);
    line(ctx, cwx, cwy, cwx + Math.cos(t * 4.2 - Math.PI / 2) * 12,
      cwy + Math.sin(t * 4.2 - Math.PI / 2) * 12, '#e8d9b8', 2);
    line(ctx, cwx, cwy, cwx + Math.cos(t * 0.7 - Math.PI / 2) * 8,
      cwy + Math.sin(t * 0.7 - Math.PI / 2) * 8, '#bfa877', 2.5);
    // bàn mổ
    rrect(ctx, w * 0.20, ty + 14, w * 0.58, 13, 6, '#3d2f1e', '#241a0f', 2);
    line(ctx, w * 0.27, ty + 27, w * 0.27, ty + 70, '#241a10', 8);
    line(ctx, w * 0.71, ty + 27, w * 0.71, ty + 70, '#241a10', 8);
    // bệnh nhân: lồng ngực phập phồng theo nhịp thở chậm, đều
    const breath = Math.sin(t * 1.5) * 3.5;
    ctx.fillStyle = '#151021';
    ctx.beginPath();
    ctx.moveTo(w * 0.33, ty + 14);
    ctx.quadraticCurveTo(w * 0.385, ty - 16 - breath, w * 0.46, ty - 2 - breath * 0.4);
    ctx.quadraticCurveTo(w * 0.58, ty + 4, w * 0.70, ty + 8);
    ctx.lineTo(w * 0.70, ty + 14); ctx.closePath(); ctx.fill();
    circle(ctx, hx, hy, 13, '#151021'); // đầu
    // mặt nạ ether hạ xuống nhẹ nhàng rồi giữ yên
    const drop = easeOut(clamp01((t - 0.7) / 1.8));
    const my = lerp(hy - 55, hy - 4, drop);
    line(ctx, hx, my - 6, w * 0.16, h * 0.16, '#31261a', 3); // cần giữ mặt nạ
    ctx.beginPath();
    ctx.ellipse(hx, my, 13, 9, 0, Math.PI, 0); // vòm mặt nạ úp xuống mặt
    ctx.closePath();
    ctx.fillStyle = 'rgba(159,196,214,.85)'; ctx.fill();
    ctx.strokeStyle = '#cfe3ff'; ctx.lineWidth = 1.5; ctx.stroke();
    // chữ z bay lên lượn sóng, mờ dần — giấc ngủ không đau
    const asleep = clamp01((t - 2.6) / 1.2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const cyc = (t * 0.30 + i * 0.34) % 1;
      const zx = hx + 16 + Math.sin(cyc * 5 + i * 1.7) * 10;
      const zy = hy - 22 - cyc * 70;
      ctx.font = `bold ${11 + i * 4}px "Be Vietnam Pro", sans-serif`;
      ctx.fillStyle = '#ffd166';
      ctx.globalAlpha = asleep * (1 - cyc) * 0.8;
      ctx.fillText('z', zx, zy);
    }
    ctx.globalAlpha = 1;
    // dải nhịp tim đều đặn chạy ngang đáy khung — bình yên
    ctx.fillStyle = '#070a0c'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
    line(ctx, 0, h * 0.86, w, h * 0.86, 'rgba(110,231,255,.25)', 1);
    const y0 = h * 0.93;
    const beat = p => p < 0.10 ? -Math.sin(p / 0.10 * Math.PI) * 3
      : p < 0.16 ? (p - 0.10) / 0.06 * 20
      : p < 0.21 ? 20 - (p - 0.16) / 0.05 * 27
      : p < 0.25 ? -7 + (p - 0.21) / 0.04 * 7
      : p > 0.36 && p < 0.48 ? -Math.sin((p - 0.36) / 0.12 * Math.PI) * 5 : 0;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const p = ((x / w) * 2.2 + t * 0.55) % 1;
      x === 0 ? ctx.moveTo(x, y0 - beat(p)) : ctx.lineTo(x, y0 - beat(p));
    }
    ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 2; ctx.stroke();
  },

  // ---------- Chữ nổi Braille ----------
  braille(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#2a1e11', '#140d07');
    // gờ dòng kẻ trang sách mờ
    for (let i = 0; i < 6; i++) {
      line(ctx, w * 0.08, h * (0.16 + i * 0.145), w * 0.92, h * (0.16 + i * 0.145),
        'rgba(255,224,170,.05)', 1);
    }
    // từ "SÁCH" — mẫu chấm braille chuẩn (Á lược giản dấu thanh, dùng ô chữ A)
    const cells = [
      { ch: 'S', dots: [2, 3, 4] },
      { ch: 'Á', dots: [1] },
      { ch: 'C', dots: [1, 4] },
      { ch: 'H', dots: [1, 2, 5] }
    ];
    const cw = 66, gap = 38, total = cells.length * cw + (cells.length - 1) * gap;
    const x0 = (w - total) / 2, cy = h * 0.47;
    // ngón tay di ngang qua hàng ô theo chu kỳ
    const T = 7, prog = (t % T) / T;
    const fx = lerp(x0 - 70, x0 + total + 60, prog);
    const endFade = clamp01((1 - prog) * T / 0.7); // mờ dần cuối chu kỳ để lặp mượt
    glow(ctx, fx, cy + 30, 95, 'rgba(255,190,110,.55)', 0.5); // ánh ấm lan theo ngón
    cells.forEach((cell, i) => {
      const cx0 = x0 + i * (cw + gap), ccx = cx0 + cw / 2;
      const k = clamp01(1 - Math.abs(fx - ccx) / 48); // độ "chạm" của ngón vào ô
      rrect(ctx, cx0 - 12, cy - 52, cw + 24, 104, 10, 'rgba(0,0,0,.22)', 'rgba(255,224,170,.10)', 1.5);
      for (let d = 1; d <= 6; d++) {
        const dx = cx0 + 16 + (d > 3 ? 34 : 0);
        const dy = cy - 34 + ((d - 1) % 3) * 34;
        if (cell.dots.includes(d)) {
          const lift = k * 3.5; // chấm nhô cao khi ngón chạm
          circle(ctx, dx + 2.5, dy + 3 - lift * 0.4, 9, `rgba(0,0,0,${0.35 + k * 0.3})`);
          circle(ctx, dx, dy - lift, 9, '#b08050');
          if (k > 0.02) {
            ctx.globalAlpha = k;
            circle(ctx, dx, dy - lift, 9, '#ffd166');
            ctx.globalAlpha = 1;
            glow(ctx, dx, dy - lift, 26, 'rgba(255,209,102,.9)', k * 0.5);
          }
          circle(ctx, dx - 3, dy - lift - 3, 3, 'rgba(255,245,220,.45)');
        } else {
          circle(ctx, dx, dy, 8, 'rgba(0,0,0,.3)', 'rgba(255,235,200,.08)', 1.5);
        }
      }
      // chữ cái hiện phía trên ô khi ngón đã lướt tới
      const show = clamp01((fx - (ccx - 34)) / 44) * endFade;
      if (show > 0.01) {
        ctx.globalAlpha = show;
        ctx.font = 'bold 26px "Be Vietnam Pro", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd166';
        ctx.fillText(cell.ch, ccx, cy - 74 - show * 6);
        ctx.globalAlpha = 1;
      }
    });
    // đầu ngón tay bo tròn màu da ấm vươn lên từ mép dưới
    rrect(ctx, fx - 17, cy + 46, 34, h - cy - 30, 17, '#e0a87e', '#b9805a', 2);
    ctx.beginPath();
    ctx.ellipse(fx, cy + 64, 8, 11, 0, 0, TAU);
    ctx.fillStyle = '#f0c49a'; ctx.fill(); // móng tay
  },

  // ---------- Đại học Al-Qarawiyyin ----------
  university(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0e1a33', '#241a10');
    drawStars(ctx, w, h, t, 34, 9, 0.42);
    // trăng lưỡi liềm
    glow(ctx, w * 0.13, h * 0.13, 55, 'rgba(220,235,255,.7)', 0.45);
    circle(ctx, w * 0.13, h * 0.13, 15, '#eef4ff');
    circle(ctx, w * 0.13 + 6, h * 0.13 - 3, 13, '#101d36');
    // tháp minaret vuông, đỉnh sáng
    const mx = w * 0.79, wallTop = h * 0.44, base = h * 0.80;
    ctx.fillStyle = '#43311f'; ctx.fillRect(mx, h * 0.185, 58, wallTop - h * 0.185 + 4);
    ctx.fillStyle = '#54401f'; ctx.fillRect(mx, h * 0.185, 8, wallTop - h * 0.185); // cạnh bắt sáng
    rrect(ctx, mx - 5, h * 0.170, 68, 12, 3, '#2c1f12');
    ctx.fillStyle = '#1f4d44'; // chóp ngói xanh kiểu Bắc Phi
    ctx.beginPath();
    ctx.moveTo(mx + 1, h * 0.170); ctx.lineTo(mx + 29, h * 0.115); ctx.lineTo(mx + 57, h * 0.170);
    ctx.closePath(); ctx.fill();
    glow(ctx, mx + 29, h * 0.105, 42, 'rgba(255,200,87,.95)', 0.65 + 0.1 * Math.sin(t * 2.3));
    circle(ctx, mx + 29, h * 0.105, 4.5, '#ffd166');
    ctx.fillStyle = '#14100a';
    ctx.fillRect(mx + 22, h * 0.24, 14, 26); // ô cửa hẹp trên tháp
    ctx.fillRect(mx + 22, h * 0.33, 14, 26);
    // tường sân trong + dãy 5 vòm móng ngựa
    ctx.fillStyle = '#3b2c1b'; ctx.fillRect(0, wallTop, w, base - wallTop);
    for (let i = 0; i < 5; i++) {
      const ax = w * (0.095 + i * 0.155), r = 27, ac = wallTop + 58;
      ctx.beginPath();
      ctx.moveTo(ax - r * 0.9, base);
      ctx.lineTo(ax - r * 0.9, ac + r * 0.43);
      ctx.arc(ax, ac, r, Math.PI - 0.45, 0.45); // cung vượt quá nửa vòng: móng ngựa
      ctx.lineTo(ax + r * 0.9, base);
      ctx.closePath();
      ctx.fillStyle = '#170f08'; ctx.fill();
      ctx.strokeStyle = '#5f4826'; ctx.lineWidth = 2.5; ctx.stroke();
      glow(ctx, ax, base - 10, 30, 'rgba(255,170,80,.6)', 0.20); // ánh đèn hành lang
    }
    // dải hoa văn zellige: tam giác lam/vàng xen kẽ trên mép tường
    for (let x = 0; x < w; x += 18) {
      const up = (x / 18) % 2 === 0;
      ctx.fillStyle = up ? 'rgba(110,231,255,.30)' : 'rgba(255,200,87,.32)';
      ctx.beginPath();
      if (up) { ctx.moveTo(x, wallTop); ctx.lineTo(x + 18, wallTop); ctx.lineTo(x + 9, wallTop - 12); }
      else { ctx.moveTo(x, wallTop - 12); ctx.lineTo(x + 18, wallTop - 12); ctx.lineTo(x + 9, wallTop); }
      ctx.closePath(); ctx.fill();
    }
    line(ctx, 0, wallTop - 12, w, wallTop - 12, 'rgba(255,224,170,.25)', 1.5);
    ctx.fillStyle = '#211711'; ctx.fillRect(0, base, w, h - base); // nền sân
    // cuốn sách mở giữa sân toả tia sáng vàng hình quạt
    const bx = w * 0.42, by = h * 0.885;
    glow(ctx, bx, by - 10, 80, 'rgba(255,209,102,.85)', 0.5 + 0.08 * Math.sin(t * 2.1));
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.17 + Math.sin(t * 0.9 + i) * 0.02;
      const len = 84 + 16 * Math.sin(t * 1.7 + i * 1.4);
      ctx.globalAlpha = 0.22 + 0.12 * Math.sin(t * 2 + i * 2.1);
      ctx.beginPath();
      ctx.moveTo(bx, by - 10);
      ctx.lineTo(bx + Math.cos(a - 0.045) * len, by - 10 + Math.sin(a - 0.045) * len);
      ctx.lineTo(bx + Math.cos(a + 0.045) * len, by - 10 + Math.sin(a + 0.045) * len);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f2e3bf';
    ctx.beginPath();
    ctx.moveTo(bx, by - 12);
    ctx.quadraticCurveTo(bx - 17, by - 18, bx - 30, by - 11);
    ctx.lineTo(bx - 30, by + 1);
    ctx.quadraticCurveTo(bx - 15, by - 4, bx, by + 5);
    ctx.quadraticCurveTo(bx + 15, by - 4, bx + 30, by + 1);
    ctx.lineTo(bx + 30, by - 11);
    ctx.quadraticCurveTo(bx + 17, by - 18, bx, by - 12);
    ctx.fill();
    line(ctx, bx, by - 12, bx, by + 5, '#c9b489', 1.5); // gáy sách
    // học trò tụ dần quanh cuốn sách
    for (let i = 0; i < 7; i++) {
      const g = easeOut(clamp01((t - 0.4 - i * 0.28) / 2.4));
      const sx = rnd(i + 21) * w, sy = base + 8 + rnd(i + 33) * (h - base - 24);
      const aa = (i / 7) * TAU + 0.5;
      const txp = bx + Math.cos(aa) * (40 + rnd(i + 5) * 16);
      const typ = by + Math.sin(aa) * 15;
      const px = lerp(sx, txp, g), py = lerp(sy, typ, g) + Math.sin(t * 2.6 + i) * 1.2;
      circle(ctx, px, py - 9, 4, '#0e0a07');
      ctx.beginPath(); ctx.ellipse(px, py, 6, 7.5, 0, 0, TAU);
      ctx.fillStyle = '#0e0a07'; ctx.fill();
    }
    // hai đèn lồng treo trong vòm, lắc lư nhẹ
    [w * 0.25, w * 0.56].forEach((lx0, i) => {
      const sway = Math.sin(t * 1.4 + i * 2.2) * 0.13;
      ctx.save();
      ctx.translate(lx0, wallTop + 10);
      ctx.rotate(sway);
      line(ctx, 0, 0, 0, 24, '#241a10', 2);
      glow(ctx, 0, 33, 34, 'rgba(255,200,87,.9)', 0.5 + 0.08 * Math.sin(t * 3 + i));
      rrect(ctx, -7, 24, 14, 18, 4, '#6b4a1c', '#ffc857', 1.5);
      circle(ctx, 0, 33, 4, '#ffd166');
      ctx.restore();
    });
  },

  // ---------- Giếng dầu Baku ----------
  oil(ctx, t, w, h) {
    const horizon = h * 0.56, dx = w * 0.4, topY = horizon - 112;
    bgGrad(ctx, w, h, '#0a0f24', '#232a4a', horizon / h);
    drawStars(ctx, w, h, t, 32, 7, 0.5);
    // mặt cắt lòng đất: các lớp địa tầng + túi dầu đen bóng
    const strata = ['#3d2d1e', '#33251a', '#281c12', '#1c130b'];
    const sh = (h - horizon) / strata.length;
    strata.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, horizon + i * sh, w, sh + 1);
      line(ctx, 0, horizon + i * sh, w, horizon + i * sh, 'rgba(0,0,0,.4)', 1);
    });
    ctx.beginPath();
    ctx.ellipse(dx + 10, h * 0.9, 96, 20, 0, 0, TAU);
    ctx.fillStyle = '#04060a'; ctx.fill();
    ctx.strokeStyle = 'rgba(110,231,255,.22)'; ctx.lineWidth = 2; ctx.stroke();
    line(ctx, dx, horizon, dx, h * 0.9, '#565d66', 4); // ống khoan cắm xuống túi dầu
    // chu kỳ ~6s: dầu phun trào lên đỉnh tháp
    const p = (t % 6) / 6, erupt = p > 0.55 ? Math.sin((p - 0.55) / 0.45 * Math.PI) : 0;
    if (erupt > 0) {
      glow(ctx, dx, topY, 90, 'rgba(255,200,87,.8)', 0.55 * erupt);
      const k = (p - 0.55) / 0.45;
      ctx.fillStyle = '#14181f';
      for (let i = 0; i < 24; i++) {
        const age = k * 1.25 - rnd(i) * 0.45;
        if (age <= 0) continue;
        const px = dx + (rnd(i + 9) - 0.5) * 56 * age;
        const py = topY - (75 + rnd(i + 3) * 60) * age + 130 * age * age; // trọng lực kéo hạt rơi lại
        ctx.globalAlpha = clamp01(1.4 - age);
        ctx.fillRect(px, py, 3.4, 3.4);
      }
      ctx.globalAlpha = 1;
    }
    // tháp khoan gỗ chữ A
    line(ctx, dx - 44, horizon, dx - 7, topY, '#7d5a33', 5);
    line(ctx, dx + 44, horizon, dx + 7, topY, '#7d5a33', 5);
    for (let i = 1; i <= 4; i++) {
      const yy = lerp(horizon, topY, i / 5), half = lerp(44, 7, i / 5);
      line(ctx, dx - half, yy, dx + half, yy, '#6b4c2a', 3);
    }
    rrect(ctx, dx - 12, topY - 8, 24, 8, 2, '#8a6a3e');
    // máy bơm "đầu ngựa" gật gù quanh trục
    const px2 = w * 0.72, pivY = horizon - 44, ang = Math.sin(t * 1.7) * 0.17;
    line(ctx, px2 - 20, horizon, px2, pivY, '#4c565f', 5);
    line(ctx, px2 + 20, horizon, px2, pivY, '#4c565f', 5);
    ctx.save();
    ctx.translate(px2, pivY); ctx.rotate(ang);
    line(ctx, -50, 0, 46, 0, '#93a1ad', 6);          // cần bập bênh
    circle(ctx, -50, 0, 9, '#39424b', '#93a1ad', 2); // đối trọng
    ctx.beginPath();                                  // đầu ngựa
    ctx.arc(52, 0, 13, -Math.PI / 2, Math.PI / 2);
    ctx.fillStyle = '#b7c2cc'; ctx.fill();
    ctx.restore();
    const headX = px2 + Math.cos(ang) * 52, headY = pivY + Math.sin(ang) * 52;
    line(ctx, headX, headY, px2 + 52, horizon, '#7d8993', 3); // ty bơm theo đầu ngựa
    // hàng thùng dầu xếp tăng dần một góc
    const n = Math.min(12, 1 + Math.floor(t / 1.6));
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / 5), c = i % 5;
      const bx = w * 0.05 + c * 20 + r * 10, by = horizon - 24 - r * 25;
      rrect(ctx, bx, by, 17, 24, 3, '#6f451f', '#3a2410', 1.5);
      line(ctx, bx, by + 7, bx + 17, by + 7, '#3a2410', 1.5);
      line(ctx, bx, by + 17, bx + 17, by + 17, '#3a2410', 1.5);
    }
  },

  // ---------- Haber-Bosch ----------
  haber(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#131a28', '#090d15');
    const cx = w / 2, ry = h * 0.13, rh = h * 0.5, rx = cx - 34;
    const pipeL = h * 0.3, pipeR = h * 0.36, grow = clamp01(t / 12);
    // ống dẫn hai bên
    rrect(ctx, -8, pipeL - 9, rx + 12, 18, 4, '#273545', '#3d5063', 2);
    rrect(ctx, cx + 30, pipeR - 9, w - cx - 22, 18, 4, '#273545', '#3d5063', 2);
    // lò phản ứng thép trụ đứng, đinh tán hai mép
    const g = ctx.createLinearGradient(rx, 0, rx + 68, 0);
    g.addColorStop(0, '#3a4a5c'); g.addColorStop(0.45, '#7b8fa3'); g.addColorStop(1, '#2c3949');
    rrect(ctx, rx + 8, ry + rh, 52, 10, 2, '#1d2733');
    rrect(ctx, rx, ry, 68, rh, [34, 34, 8, 8], g, '#1d2733', 2);
    for (let i = 0; i < 9; i++) {
      const yy = ry + 26 + i * (rh - 34) / 8;
      circle(ctx, rx + 6, yy, 1.8, '#9db1c4');
      circle(ctx, rx + 62, yy, 1.8, '#9db1c4');
    }
    line(ctx, rx, ry + rh * 0.38, rx + 68, ry + rh * 0.38, '#1d2733', 3);
    line(ctx, rx, ry + rh * 0.7, rx + 68, ry + rh * 0.7, '#1d2733', 3);
    glow(ctx, cx, ry + rh * 0.55, 46, 'rgba(255,140,60,.55)', 0.3 + 0.08 * Math.sin(t * 5));
    // đồng hồ áp suất, kim rung
    circle(ctx, cx, ry + rh * 0.2, 12, '#e9e4d4', '#1d2733', 2);
    const ang = -2.4 + 1.5 * clamp01(t / 5) + 0.07 * Math.sin(t * 23);
    line(ctx, cx, ry + rh * 0.2, cx + Math.cos(ang) * 8, ry + rh * 0.2 + Math.sin(ang) * 8, '#c23b3b', 2);
    // N₂ (2 chấm lam) + H₂ (2 chấm trắng nhỏ) trôi vào bên trái
    for (let i = 0; i < 6; i++) {
      const pr = (t * 0.14 + i / 6) % 1, mx = lerp(-14, rx - 8, pr), my = pipeL + Math.sin(t * 2 + i) * 2;
      ctx.globalAlpha = clamp01(pr * 6) * clamp01((1 - pr) * 8);
      if (i % 2 === 0) { circle(ctx, mx - 4, my, 4.6, '#6ee7ff'); circle(ctx, mx + 4, my, 4.6, '#6ee7ff'); }
      else { circle(ctx, mx - 3, my, 2.8, '#f2f6fb'); circle(ctx, mx + 3, my, 2.8, '#f2f6fb'); }
    }
    // NH₃ trôi ra bên phải: 1 lam + 3 trắng chân kiềng
    for (let i = 0; i < 4; i++) {
      const pr = (t * 0.14 + i / 4) % 1, mx = lerp(cx + 42, w + 16, pr), my = pipeR + Math.sin(t * 2 + i * 2) * 2;
      ctx.globalAlpha = clamp01(pr * 6) * clamp01((1 - pr) * 6);
      circle(ctx, mx, my - 2, 4.6, '#6ee7ff');
      for (let k = 0; k < 3; k++) {
        const a = Math.PI / 2 + (k - 1) * 0.75;
        circle(ctx, mx + Math.cos(a) * 7.5, my - 2 + Math.sin(a) * 7.5, 2.8, '#f2f6fb');
      }
    }
    ctx.globalAlpha = 1;
    // cánh đồng lúa mì dày và cao dần — phân đạm nuôi nửa nhân loại
    const groundY = h * 0.82;
    ctx.fillStyle = '#2c1e0e'; ctx.fillRect(0, groundY, w, h - groundY);
    glow(ctx, cx, groundY + 10, 90 + 220 * grow, 'rgba(255,200,87,.55)', 0.15 + 0.4 * grow);
    const stalks = Math.floor(lerp(8, 40, grow));
    for (let i = 0; i < stalks; i++) {
      const sx = rnd(i) * w, gi = easeOut(clamp01((t - rnd(i + 70) * 9) / 4));
      if (gi <= 0.02) continue;
      const ht = (26 + rnd(i + 40) * 26) * gi, sway = Math.sin(t * 1.9 + sx * 0.03) * 4 * gi;
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); // thân cong nhẹ theo gió
      ctx.moveTo(sx, groundY + 5);
      ctx.quadraticCurveTo(sx + sway * 0.4, groundY - ht * 0.5, sx + sway, groundY - ht);
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(sx + sway + (k % 2 ? 2.6 : -2.6), groundY - ht + k * 3.2, 2.2, 3.4, 0, 0, TAU);
        ctx.fill();
      }
    }
  },

  // ---------- Vá tầng ozone ----------
  ozone(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#060a18', '#0c1230');
    drawStars(ctx, w, h, t, 46, 4, 1);
    const cx = w * 0.46, cy = h * 0.54, R = h * 0.3;
    const p = (t % 14) / 14, heal = easeOut(clamp01(p / 0.8)); // lỗ thủng co dần rồi lặp
    // mặt trời góc trên phải
    const sx = w * 0.9, sy = h * 0.1;
    glow(ctx, sx, sy, 80, 'rgba(255,209,102,.9)', 0.8);
    circle(ctx, sx, sy, 16, '#ffd166');
    // Trái Đất + lục địa đơn giản
    const og = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.2, cx, cy, R);
    og.addColorStop(0, '#2f6fae'); og.addColorStop(1, '#122c52');
    circle(ctx, cx, cy, R, og);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, TAU); ctx.clip();
    ctx.fillStyle = '#79c2e8'; ctx.globalAlpha = 0.85;
    const lands = [[-0.45, -0.35, 0.36, 0.2, 0.5], [0.2, -0.55, 0.3, 0.16, -0.4],
      [0.05, 0.1, 0.42, 0.22, 0.2], [-0.3, 0.5, 0.24, 0.13, -0.3]];
    for (const b of lands) {
      ctx.beginPath();
      ctx.ellipse(cx + b[0] * R, cy + b[1] * R, b[2] * R, b[3] * R, b[4], 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // vành khí quyển mỏng phát sáng
    circle(ctx, cx, cy, R + 9, null, 'rgba(110,231,255,.55)', 3);
    circle(ctx, cx, cy, R + 9, null, 'rgba(110,231,255,.15)', 9);
    // lỗ thủng tím phía cực nam co dần theo t
    const hole = lerp(1.05, 0.06, heal);
    ctx.strokeStyle = `rgba(150,70,220,${0.85 - 0.6 * heal})`;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 9, Math.PI / 2 - hole, Math.PI / 2 + hole);
    ctx.stroke();
    glow(ctx, cx, cy + R + 6, 30 + 70 * (1 - heal), 'rgba(140,60,220,.8)', 0.1 + 0.55 * (1 - heal));
    // tia UV bật nảy khỏi vành ozone phục hồi thay vì xuyên qua
    for (let i = 0; i < 3; i++) {
      const a = -0.9 + i * 0.55;
      const px = cx + Math.cos(a) * (R + 9), py = cy + Math.sin(a) * (R + 9);
      let dxr = px - sx, dyr = py - sy;
      const dl = Math.hypot(dxr, dyr); dxr /= dl; dyr /= dl;
      const nx = Math.cos(a), ny = Math.sin(a), dot = dxr * nx + dyr * ny;
      const rxd = dxr - 2 * dot * nx, ryd = dyr - 2 * dot * ny; // hướng phản xạ qua pháp tuyến
      const rayA = 0.25 + 0.55 * heal;
      line(ctx, sx, sy, px, py, `rgba(255,209,102,${rayA})`, 1.5);
      line(ctx, px, py, px + rxd * 70, py + ryd * 70, `rgba(255,209,102,${rayA * 0.8})`, 1.5);
      const u = (t * 0.55 + i * 0.37) % 1; // hạt sáng chạy dọc tia rồi bật ra
      const gx = u < 0.6 ? lerp(sx, px, u / 0.6) : px + rxd * 70 * ((u - 0.6) / 0.4);
      const gy = u < 0.6 ? lerp(sy, py, u / 0.6) : py + ryd * 70 * ((u - 0.6) / 0.4);
      circle(ctx, gx, gy, 2.5, '#ffd166');
    }
    // CFC bị cấm: cụm 5 chấm gạch chéo đỏ, mờ dần
    ctx.globalAlpha = 0.15 + 0.75 * (1 - heal);
    const fx = w * 0.11, fy = h * 0.74;
    circle(ctx, fx, fy, 5, '#6ee7ff');
    for (let k = 0; k < 4; k++) {
      const ca = k * TAU / 4 + 0.6;
      circle(ctx, fx + Math.cos(ca) * 10, fy + Math.sin(ca) * 10, 3.2, '#e8f0f8');
    }
    line(ctx, fx - 16, fy - 16, fx + 16, fy + 16, 'rgba(255,80,80,.95)', 3.5);
    line(ctx, fx - 16, fy + 16, fx + 16, fy - 16, 'rgba(255,80,80,.95)', 3.5);
    ctx.globalAlpha = 1;
    // dấu mốc phục hồi
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#a9bcdc';
    ctx.font = '600 15px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1987 → 2066', w / 2, h - 10);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  },

  // ---------- Truyền hình ----------
  tv(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0a0812', '#050308');
    // tháp phát sóng góc trên trái
    const towerX = w * 0.09, towerTop = h * 0.09, towerBase = h * 0.34;
    line(ctx, towerX - 15, towerBase, towerX, towerTop, '#3a4a63', 2);
    line(ctx, towerX + 15, towerBase, towerX, towerTop, '#3a4a63', 2);
    for (let i = 1; i < 4; i++) {
      const k = i / 4, y = towerTop + (towerBase - towerTop) * k;
      line(ctx, towerX - 15 * k, y, towerX + 15 * k, y, '#3a4a63', 1.5);
    }
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.5 + i / 3) % 1;
      circle(ctx, towerX, towerTop, 6 + p * 34, null, `rgba(110,231,255,${(0.5 * (1 - p)).toFixed(3)})`, 2);
    }
    // thân TV gỗ + màn cong
    const tvW = w * 0.36, tvH = tvW * 0.74, tvX = w * 0.44 - tvW / 2, tvY = h * 0.24;
    // ăng-ten tai thỏ
    line(ctx, tvX + tvW * 0.5, tvY, tvX + tvW * 0.24, tvY - h * 0.16, '#8fa3bd', 2);
    line(ctx, tvX + tvW * 0.5, tvY, tvX + tvW * 0.76, tvY - h * 0.18, '#8fa3bd', 2);
    rrect(ctx, tvX, tvY, tvW, tvH, 10, '#4a3423', '#2c1e12', 3);
    const scX = tvX + tvW * 0.06, scY = tvY + tvH * 0.09, scW = tvW * 0.68, scH = tvH * 0.8;
    rrect(ctx, scX - 4, scY - 4, scW + 8, scH + 8, 12, '#151a24', null);
    // hai núm xoay
    circle(ctx, tvX + tvW * 0.87, tvY + tvH * 0.3, 9, '#20242e', '#6b7787', 2);
    circle(ctx, tvX + tvW * 0.87, tvY + tvH * 0.62, 9, '#20242e', '#6b7787', 2);
    // màn hình: quét từng dòng từ trên xuống, 4 giây một lượt
    ctx.save();
    ctx.beginPath(); ctx.roundRect(scX, scY, scW, scH, 9); ctx.clip();
    const scan = (t * 0.25) % 1, scanY = scY + scH * scan;
    const sky = ctx.createLinearGradient(0, scY, 0, scY + scH);
    sky.addColorStop(0, '#39536b'); sky.addColorStop(1, '#182a38');
    ctx.fillStyle = sky; ctx.fillRect(scX, scY, scW, scanY - scY);
    // cảnh trong vùng đã quét: mặt trời + núi + mây
    circle(ctx, scX + scW * 0.72, scY + scH * 0.3, 16, '#ffd166', null);
    ctx.fillStyle = '#243d50';
    ctx.beginPath();
    ctx.moveTo(scX, scY + scH); ctx.lineTo(scX + scW * 0.3, scY + scH * 0.42);
    ctx.lineTo(scX + scW * 0.55, scY + scH); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(scX + scW * 0.4, scY + scH); ctx.lineTo(scX + scW * 0.72, scY + scH * 0.55);
    ctx.lineTo(scX + scW, scY + scH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(220,232,245,.7)';
    ctx.beginPath(); ctx.ellipse(scX + scW * 0.3, scY + scH * 0.24, 20, 7, 0, 0, TAU); ctx.fill();
    // phần chưa quét tối + dải quét sáng
    ctx.fillStyle = 'rgba(5,8,14,.92)'; ctx.fillRect(scX, scanY, scW, scY + scH - scanY);
    ctx.fillStyle = 'rgba(180,230,255,.5)'; ctx.fillRect(scX, scanY - 2, scW, 4);
    // nhiễu hạt theo khung 12fps + scanline ngang
    const fr = Math.floor(t * 12);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = 0.12 + 0.2 * rnd(i * 3 + fr * 7);
      ctx.fillRect(scX + rnd(i + fr) * scW, scY + rnd(i + 40 + fr) * scH, 2, 2);
    }
    ctx.globalAlpha = 0.13; ctx.fillStyle = '#000';
    for (let y = scY; y < scY + scH; y += 3) ctx.fillRect(scX, y, scW, 1);
    ctx.globalAlpha = 1;
    ctx.restore();
    // ánh sáng TV hắt ra phòng + hai người xem silhouette
    glow(ctx, scX + scW / 2, scY + scH / 2, 210, 'rgba(140,200,255,.35)', 0.5 + 0.06 * Math.sin(t * 13));
    ctx.fillStyle = '#06070c';
    circle(ctx, w * 0.33, h * 0.94, 34, '#06070c', null);
    circle(ctx, w * 0.56, h * 0.97, 38, '#06070c', null);
    ctx.fillRect(w * 0.2, h * 0.99, w * 0.5, h * 0.01);
  },

  // ---------- Cờ vua ----------
  chess(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#171008', '#0a0603');
    glow(ctx, w * 0.86, h * 0.16, 150, 'rgba(255,180,80,.45)', 0.5 + 0.07 * Math.sin(t * 9));
    // bàn cờ phối cảnh nghiêng nhẹ
    const topW = w * 0.36, botW = w * 0.64, topY = h * 0.33, botY = h * 0.9, cx = w * 0.5;
    const corner = (c, r) => {
      const k = r / 8, rowY = topY + (botY - topY) * (0.62 * k + 0.38 * k * k);
      const rw = topW + (botW - topW) * ((rowY - topY) / (botY - topY));
      return [cx - rw / 2 + (rw * c) / 8, rowY];
    };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const [x1, y1] = corner(c, r), [x2, y2] = corner(c + 1, r);
        const [x3, y3] = corner(c + 1, r + 1), [x4, y4] = corner(c, r + 1);
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fillStyle = (r + c) % 2 ? '#3d2d1b' : '#c8ad83';
        ctx.fill();
      }
    }
    const at = (c, r) => corner(c + 0.5, r + 0.5);
    // quân cờ silhouette đơn giản; s = cỡ, dark = quân đen
    function piece(x, y, s, type, dark, tilt = 0, alpha = 1) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(tilt); ctx.globalAlpha = alpha;
      ctx.fillStyle = dark ? '#191009' : '#f0e2c5';
      ctx.strokeStyle = dark ? '#54402a' : '#8a7550'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.2, 0, 0, TAU); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, 0); ctx.quadraticCurveTo(-s * 0.14, -s * 0.75, -s * 0.16, -s * 1.05);
      ctx.lineTo(s * 0.16, -s * 1.05); ctx.quadraticCurveTo(s * 0.14, -s * 0.75, s * 0.4, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (type === 'pawn') circle(ctx, 0, -s * 1.25, s * 0.26, ctx.fillStyle, null);
      if (type === 'knight') { // đầu ngựa quay trái
        ctx.beginPath();
        ctx.moveTo(-s * 0.16, -s * 1.0); ctx.quadraticCurveTo(-s * 0.7, -s * 1.3, -s * 0.5, -s * 1.55);
        ctx.quadraticCurveTo(-s * 0.2, -s * 1.8, s * 0.1, -s * 1.6);
        ctx.lineTo(s * 0.16, -s * 1.0); ctx.closePath(); ctx.fill();
      }
      if (type === 'queen') {
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 1.05); ctx.lineTo(-s * 0.34, -s * 1.5); ctx.lineTo(-s * 0.12, -s * 1.2);
        ctx.lineTo(0, -s * 1.6); ctx.lineTo(s * 0.12, -s * 1.2); ctx.lineTo(s * 0.34, -s * 1.5);
        ctx.lineTo(s * 0.3, -s * 1.05); ctx.closePath(); ctx.fill();
      }
      if (type === 'king') {
        ctx.fillRect(-s * 0.07, -s * 1.62, s * 0.14, s * 0.5);
        ctx.fillRect(-s * 0.24, -s * 1.5, s * 0.48, s * 0.13);
      }
      ctx.restore();
    }
    // chu kỳ 8s: tốt tiến → mã nhảy → hậu ăn quân chéo → chiếu vua
    const p = t % 8;
    const seg = (a, b) => clamp01((p - a) / (b - a));
    const mv = (from, to, k) => [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
    const S = h * 0.052;
    piece(...at(1, 1), S, 'pawn', true);
    piece(...at(4, 1), S, 'pawn', true);
    piece(...at(2, 6), S, 'pawn', false);
    piece(...at(6, 6), S, 'pawn', false);
    const kingP = at(7, 1);
    const chk = p > 5.9 ? Math.abs(Math.sin(t * 6)) : 0; // vua bị chiếu: loé + nghiêng
    piece(kingP[0], kingP[1], S * 1.15, 'king', true, chk * 0.14, 1);
    if (chk > 0.4) circle(ctx, kingP[0], kingP[1] - S * 0.7, S * 1.5, null, `rgba(255,80,70,${(chk * 0.8).toFixed(3)})`, 3);
    const pawnK = easeOut(seg(0.4, 1.4));
    piece(...mv(at(4, 6), at(4, 4), pawnK), S, 'pawn', false);
    const nK = easeOut(seg(2.0, 3.2)), lift = Math.sin(nK * Math.PI) * h * 0.11;
    const nPos = mv(at(6, 7), at(5, 5), nK);
    piece(nPos[0], nPos[1] - lift, S * 1.05, 'knight', false);
    const qK = easeOut(seg(4.0, 5.4));
    piece(...at(7, 3), S, 'pawn', true, 0, 1 - seg(5.0, 5.6)); // quân bị ăn mờ dần
    piece(...mv(at(3, 7), at(7, 3), qK), S * 1.1, 'queen', false);
  },

  // ---------- Machu Picchu & Inca ----------
  inca(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0d1524', '#1d3028', 0.95);
    drawStars(ctx, w, h, t, 22, 5, 0.28);
    // mặt trời + tia qua cột Intihuatana trên đỉnh
    const sunX = w * 0.78, sunY = h * 0.14;
    circle(ctx, sunX, sunY, 15, '#ffd166', null);
    glow(ctx, sunX, sunY, 90, 'rgba(255,209,102,.55)', 0.55 + 0.1 * Math.sin(t * 2.1));
    // núi Huayna Picchu + sườn bậc thang
    const peakX = w * 0.42, peakY = h * 0.1;
    ctx.fillStyle = '#22384a';
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h); ctx.quadraticCurveTo(w * 0.3, h * 0.42, peakX, peakY);
    ctx.quadraticCurveTo(w * 0.52, h * 0.4, w * 0.62, h); ctx.closePath(); ctx.fill();
    line(ctx, sunX - 12, sunY + 4, peakX + 8, peakY + 14, 'rgba(255,209,102,.35)', 1.5);
    ctx.fillStyle = '#31465a';
    ctx.fillRect(peakX - 3, peakY + 2, 6, 16); // cột đá Intihuatana
    // ruộng bậc thang uốn theo sườn trái
    for (let i = 0; i < 6; i++) {
      const y = h * (0.52 + i * 0.075), half = w * (0.085 + i * 0.02);
      ctx.strokeStyle = 'rgba(126,178,122,.55)'; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.3 - half, y);
      ctx.quadraticCurveTo(w * 0.3, y - h * 0.03, w * 0.3 + half, y);
      ctx.stroke();
    }
    // mây trôi THẤP HƠN đỉnh núi
    ctx.fillStyle = 'rgba(216,228,240,.4)';
    for (let i = 0; i < 2; i++) {
      const cx2 = ((t * (10 + i * 5) + i * 320) % (w + 260)) - 130, cy = h * (0.56 + i * 0.12);
      ctx.beginPath();
      ctx.ellipse(cx2, cy, 68, 13, 0, 0, TAU);
      ctx.ellipse(cx2 + 44, cy + 5, 46, 10, 0, 0, TAU);
      ctx.fill();
    }
    // tường đá đa giác tự ghép khít (đỉnh chung có jitter theo rnd)
    const cols = 5, rows = 3, x0 = w * 0.62, y0 = h * 0.5, sw = w * 0.068, sh = h * 0.13;
    const vx = (i, j) => x0 + i * sw + (i > 0 && i < cols ? (rnd(i * 7 + j * 13) - 0.5) * sw * 0.36 : 0);
    const vy = (i, j) => y0 + j * sh + (j > 0 && j < rows ? (rnd(i * 11 + j * 17 + 3) - 0.5) * sh * 0.3 : 0);
    const placed = Math.floor(t / 0.7);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        if (k > placed) continue;
        let ox = 0, land = 1;
        if (k === placed) { // viên đang bay vào từ phải
          land = easeOut(clamp01((t - k * 0.7) / 0.55));
          ox = (1 - land) * w * 0.3;
        }
        ctx.beginPath();
        ctx.moveTo(vx(i, j) + ox, vy(i, j));
        ctx.lineTo(vx(i + 1, j) + ox, vy(i + 1, j));
        ctx.lineTo(vx(i + 1, j + 1) + ox, vy(i + 1, j + 1));
        ctx.lineTo(vx(i, j + 1) + ox, vy(i, j + 1));
        ctx.closePath();
        ctx.fillStyle = `rgb(${118 + Math.round(rnd(k) * 26)},${112 + Math.round(rnd(k + 9) * 22)},${104 + Math.round(rnd(k + 5) * 20)})`;
        ctx.fill();
        ctx.strokeStyle = land < 1 ? '#ffd166' : '#3c3a33';
        ctx.lineWidth = land < 1 ? 2.5 : 1.5;
        ctx.stroke();
      }
    }
    // llama gặm cỏ trên bậc thang
    const lx = w * 0.27, ly = h * 0.6, nod = Math.sin(t * 1.6) * 3;
    ctx.fillStyle = '#0e1620';
    ctx.beginPath(); ctx.ellipse(lx, ly, 15, 8, 0, 0, TAU); ctx.fill();
    ctx.fillRect(lx - 11, ly, 3, 11); ctx.fillRect(lx + 8, ly, 3, 11);
    ctx.beginPath();
    ctx.moveTo(lx + 12, ly - 3); ctx.quadraticCurveTo(lx + 20, ly - 16 + nod, lx + 23, ly - 18 + nod);
    ctx.lineTo(lx + 27, ly - 14 + nod); ctx.quadraticCurveTo(lx + 20, ly - 8, lx + 16, ly); ctx.fill();
    // chùm quipu buông thõng góc phải, đung đưa nhẹ
    const qx = w * 0.9, qy = h * 0.12;
    line(ctx, qx - 34, qy, qx + 34, qy, '#c9a86a', 3);
    for (let i = 0; i < 6; i++) {
      const bx = qx - 28 + i * 11, sway = Math.sin(t * 1.2 + i * 1.1) * 5;
      ctx.strokeStyle = '#b39055'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, qy);
      ctx.quadraticCurveTo(bx + sway, qy + 34, bx + sway, qy + 62 + rnd(i) * 14);
      ctx.stroke();
      for (let n = 1; n <= 3; n++) {
        circle(ctx, bx + sway * (n / 3) * 0.8, qy + n * 17 + rnd(i + n) * 6, 2.2, '#e0c890', null);
      }
    }
  },

  // ---------- Dự phòng ----------
  fallback(ctx, t, w, h) {
    bgGrad(ctx, w, h, '#0d1320', '#080d17');
    drawStars(ctx, w, h, t, 40, 91, 1);
    const cx = w / 2, cy = h / 2;
    glow(ctx, cx, cy, 90 + Math.sin(t * 2) * 18, 'rgba(255,200,87,.9)', 0.7);
    circle(ctx, cx, cy, 16, '#ffd166');
    for (let k = 0; k < 3; k++) {
      const age = (t * 0.5 + k / 3) % 1;
      ctx.globalAlpha = (1 - age) * 0.5;
      circle(ctx, cx, cy, 20 + age * 90, null, '#ffc857', 2);
    }
    ctx.globalAlpha = 1;
  }
};
