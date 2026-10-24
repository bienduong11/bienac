/* =====================================================================
 * Nền trang chủ: mưa mã nhị phân. Các dòng 0/1 chảy xuống khắp màn hình,
 * và khi đi qua vùng logo thì sáng lên, dần dần ghép thành hình logo Bienac.
 * Vùng logo bám theo phần tử .hero-logo nên cuộn trang thì logo đi theo.
 * ===================================================================== */
(function () {
  'use strict';
  const cv = document.getElementById('bin-canvas');
  const holder = document.querySelector('.hero-logo');
  if (!cv || !holder) return;
  const g = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, DPR = 1, CELL = 10, cols = 0, rows = 0;
  let digits;                  // ký tự 0/1 của từng ô
  let drops = [];              // các giọt mưa theo cột
  let mask = null, mSize = 0;  // mặt nạ logo (mSize × mSize ô)
  let lit = null;              // độ sáng tích lũy của từng ô trong logo
  const sprites = {};

  const logo = new Image();
  logo.src = '/assets/logo.svg';

  function sprite(ch, color) {
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(CELL * DPR);
    const x = c.getContext('2d');
    x.scale(DPR, DPR);
    x.font = `600 ${CELL}px "JetBrains Mono", ui-monospace, monospace`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = color;
    x.fillText(ch, CELL / 2, CELL / 2 + 0.5);
    return c;
  }

  function buildMask() {
    const r = holder.getBoundingClientRect();
    mSize = Math.max(8, Math.round(r.width / CELL));
    const m = document.createElement('canvas');
    m.width = m.height = mSize;
    const x = m.getContext('2d');
    if (logo.complete && logo.naturalWidth) x.drawImage(logo, 0, 0, mSize, mSize);
    const d = x.getImageData(0, 0, mSize, mSize).data;
    mask = new Uint8Array(mSize * mSize);
    for (let i = 0; i < mask.length; i++) mask[i] = d[i * 4 + 3] > 90 ? 1 : 0;
    lit = new Float32Array(mSize * mSize);
    if (reduce) lit.fill(1);
  }

  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    CELL = W < 720 ? 9 : 10;
    cv.width = W * DPR; cv.height = H * DPR;
    cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
    digits = new Uint8Array(cols * rows).map(() => (Math.random() < 0.5 ? 0 : 1));
    for (const [k, col] of [['d', 'rgba(55,240,207,1)'], ['b', 'rgba(179,255,236,1)'], ['h', 'rgba(255,255,255,1)']]) {
      sprites[k + '0'] = sprite('0', col); sprites[k + '1'] = sprite('1', col);
    }
    drops = [];
    for (let c = 0; c < cols; c++) drops.push(newDrop(c, true));
    buildMask();
    // thêm giọt cho các cột đi qua logo để hình logo ghép nhanh hơn
    const r = holder.getBoundingClientRect();
    const c0 = Math.floor(r.left / CELL), c1 = Math.ceil(r.right / CELL);
    for (let c = Math.max(0, c0); c < Math.min(cols, c1); c++) for (let k = 0; k < 3; k++) drops.push(newDrop(c, true));
  }

  function newDrop(c, scatter) {
    return {
      c,
      y: scatter ? Math.random() * H * 1.5 - H * 0.5 : -Math.random() * H * 0.6,
      v: (0.18 + Math.random() * 0.42) * CELL,   // ô mỗi khung hình
      len: 8 + Math.floor(Math.random() * 22),
    };
  }

  function put(key, x, y, a) {
    if (a < 0.02) return;
    g.globalAlpha = a > 1 ? 1 : a;
    g.drawImage(sprites[key], x, y, CELL, CELL);
  }

  let last = 0;
  function frame(t) {
    if (document.hidden) { requestAnimationFrame(frame); return; }
    if (t - last < 28) { requestAnimationFrame(frame); return; }   // ~35 khung hình/giây
    last = t;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.clearRect(0, 0, W, H);

    const r = holder.getBoundingClientRect();
    // gióng lưới theo góc logo để ô chữ khớp đúng hình
    const ox = ((r.left % CELL) + CELL) % CELL - CELL, oy = ((r.top % CELL) + CELL) % CELL - CELL;
    const lc = Math.round((r.left - ox) / CELL), lr = Math.round((r.top - oy) / CELL);
    const inLogo = (c, rr) => {
      const mx = c - lc, my = rr - lr;
      return mx >= 0 && my >= 0 && mx < mSize && my < mSize && mask[my * mSize + mx] ? my * mSize + mx : -1;
    };

    // lật ngẫu nhiên vài ký tự
    for (let i = 0; i < 40; i++) { const k = (Math.random() * digits.length) | 0; digits[k] ^= 1; }

    // mưa
    for (const d of drops) {
      if (!reduce) d.y += d.v;
      const head = Math.floor(d.y / CELL);
      if ((head - d.len) * CELL > H) { Object.assign(d, newDrop(d.c, false)); continue; }
      const x = ox + d.c * CELL;
      for (let k = 0; k <= d.len; k++) {
        const rr = head - k;
        if (rr < 0 || rr >= rows) continue;
        const y = oy + rr * CELL;
        const ch = digits[rr * cols + d.c];
        const fade = Math.pow(1 - k / (d.len + 1), 1.6);
        const li = inLogo(d.c, rr);
        if (li >= 0) { lit[li] = 1; continue; }        // ô logo vẽ riêng ở dưới
        if (k === 0) put('h' + ch, x, y, 0.55);
        else put('d' + ch, x, y, fade * 0.32);
      }
    }

    // logo: ô đã được mưa chạm vào thì sáng, rồi lắng dần về mức nền
    if (mask) {
      for (let my = 0; my < mSize; my++) {
        for (let mx = 0; mx < mSize; mx++) {
          const i = my * mSize + mx;
          if (!mask[i] || lit[i] <= 0) continue;
          const c = lc + mx, rr = lr + my;
          const x = ox + c * CELL, y = oy + rr * CELL;
          if (y < -CELL || y > H) continue;
          const ch = digits[((rr % rows) + rows) % rows * cols + (((c % cols) + cols) % cols)];
          const a = lit[i];
          put(a > 0.9 ? 'h' + ch : 'b' + ch, x, y, 0.35 + a * 0.6);
          if (!reduce && a > 0.6) lit[i] -= 0.01;
        }
      }
    }
    g.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(frame);
  }

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  const start = () => { resize(); requestAnimationFrame(frame); };
  if (logo.complete) start(); else { logo.onload = start; logo.onerror = start; }
  if (document.fonts) document.fonts.ready.then(() => { if (W) { const keep = lit; resize(); if (keep && keep.length === lit.length) lit = keep; } });
})();
