/* =====================================================================
 * Nhạc nền ambient cho bienac.com, tổng hợp trực tiếp bằng Web Audio:
 * không tải file nhạc nào, không lo bản quyền, nhạc không bao giờ lặp y hệt.
 *  - Lớp đệm (pad): hợp âm ngũ cung trầm, đổi chậm mỗi ~18 giây.
 *  - Tiếng chuông: thỉnh thoảng một nốt trong vắt, có tiếng vang dài.
 * Mặc định phát: thử phát ngay khi vào trang, trình duyệt chặn thì phát
 * ở lần chạm/bấm đầu tiên. Người xem tắt thì nhớ lựa chọn đó.
 * ===================================================================== */
(function () {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const KEY = 'bienac-nhac';
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch (e) {} };

  // ---------- nút bật/tắt ----------
  const css = document.createElement('style');
  css.textContent = `
  .nhac-btn{position:fixed;right:22px;bottom:22px;z-index:60;width:46px;height:46px;border-radius:50%;border:0;cursor:pointer;
    display:grid;place-items:center;color:#00ffff;background:rgba(6,10,12,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    box-shadow:inset 0 0 0 1px rgba(0,255,255,.28),0 6px 20px rgba(0,0,0,.35);transition:box-shadow .3s,transform .2s}
  .nhac-btn:hover{transform:scale(1.06);box-shadow:inset 0 0 0 1px rgba(0,255,255,.6),0 0 22px rgba(0,255,255,.25)}
  .nhac-btn .bars{display:flex;gap:3px;align-items:flex-end;height:16px}
  .nhac-btn .bars i{width:3px;height:4px;border-radius:2px;background:currentColor;opacity:.55;transition:height .4s}
  .nhac-btn.on .bars i{opacity:1;animation:nhac-b 1.6s ease-in-out infinite}
  .nhac-btn.on .bars i:nth-child(2){animation-delay:-.4s}.nhac-btn.on .bars i:nth-child(3){animation-delay:-.9s}.nhac-btn.on .bars i:nth-child(4){animation-delay:-1.2s}
  @keyframes nhac-b{0%,100%{height:4px}50%{height:15px}}
  .nhac-btn.on{box-shadow:inset 0 0 0 1px rgba(0,255,255,.6),0 0 24px rgba(0,255,255,.28)}
  @media (prefers-reduced-motion: reduce){.nhac-btn.on .bars i{animation:none;height:10px}}
  body.home .nhac-btn{bottom:82px}
  @media (max-width:720px){.nhac-btn{right:14px;bottom:14px;width:42px;height:42px}body.home .nhac-btn{right:22px;bottom:80px}}`;
  document.head.appendChild(css);
  const btn = document.createElement('button');
  btn.className = 'nhac-btn';
  btn.type = 'button';
  btn.innerHTML = '<span class="bars"><i></i><i></i><i></i><i></i></span>';
  const label = (on) => { btn.setAttribute('aria-label', on ? 'Tắt nhạc nền' : 'Bật nhạc nền'); btn.title = on ? 'Tắt nhạc nền' : 'Bật nhạc nền ambient'; btn.setAttribute('aria-pressed', String(on)); };
  label(false);
  document.body.appendChild(btn);

  // ---------- bộ tổng hợp ----------
  let ctx = null, master, padBus, bellBus, verb, playing = false, timers = [];
  const MASTER = 0.9;

  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.knee.value = 10;
    master.connect(comp).connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse(6, 3);
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.55;
    verb.connect(verbGain).connect(master);

    // đệm: lọc thông thấp, tần số cắt dao động rất chậm
    padBus = ctx.createGain(); padBus.gain.value = 1.0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.03;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 320;
    lfo.connect(lfoAmt).connect(lp.frequency); lfo.start();
    padBus.connect(lp); lp.connect(master); lp.connect(verb);

    bellBus = ctx.createGain(); bellBus.gain.value = 0.6;
    const dl = ctx.createDelay(2); dl.delayTime.value = 0.62;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    bellBus.connect(master); bellBus.connect(verb); bellBus.connect(dl); dl.connect(fb).connect(dl); dl.connect(verb);
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // Ngũ cung Rê (D E F# A B), các hợp âm đệm xoay vòng
  const CHORDS = [[38, 50, 57, 62, 66], [35, 47, 54, 59, 62], [43, 50, 55, 59, 64], [40, 52, 57, 59, 64], [33, 45, 52, 57, 61]];
  const BELLS = [74, 76, 78, 81, 83, 86, 88, 90, 93];
  let ci = 0;

  function padChord() {
    const notes = CHORDS[ci++ % CHORDS.length], t = ctx.currentTime, dur = 22;
    notes.forEach((m, k) => {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = k === 0 ? 'sine' : 'triangle';
        o.frequency.value = mtof(m); o.detune.value = det + (Math.random() * 4 - 2);
        const peak = (k === 0 ? 0.16 : 0.07) / 2;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 6);
        g.gain.setValueAtTime(peak, t + dur - 8);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g).connect(padBus); o.start(t); o.stop(t + dur + 0.1);
      }
    });
    timers.push(setTimeout(() => playing && padChord(), 18000));
  }

  function bell() {
    const t = ctx.currentTime, m = BELLS[(Math.random() * BELLS.length) | 0], f = mtof(m);
    [[1, 0.09], [2.01, 0.025], [3.98, 0.01]].forEach(([mul, amp]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5 / mul);
      o.connect(g).connect(bellBus); o.start(t); o.stop(t + 5);
    });
    timers.push(setTimeout(() => playing && bell(), 2500 + Math.random() * 7000));
  }

  function start() {
    if (playing) return;
    if (!ctx) build();
    ctx.resume();
    playing = true;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(MASTER, t + 4);
    padChord(); timers.push(setTimeout(() => playing && bell(), 3000));
    btn.classList.add('on'); label(true); set('1');
  }

  function stop(remember = true) {
    if (!playing) return;
    playing = false;
    timers.forEach(clearTimeout); timers = [];
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 1.2);
    setTimeout(() => { if (!playing) ctx.suspend(); }, 1400);
    btn.classList.remove('on'); label(false);
    if (remember) set('0');
  }

  btn.addEventListener('click', (e) => { e.stopPropagation(); playing ? stop() : start(); });

  // Mặc định phát. Chỉ không phát khi người xem đã tự tắt (lưu '0').
  // Trình duyệt thường chặn âm thanh trước khi người xem tương tác, nên:
  // thử phát ngay; nếu bị chặn thì phát ở cú chạm, cú bấm hoặc phím đầu tiên.
  if (get() !== '0') {
    const EV = ['pointerdown', 'keydown', 'touchend', 'click'];
    const go = (e) => {
      if (e && btn.contains(e.target)) return;      // bấm thẳng vào nút: để nút tự xử lý
      EV.forEach((ev) => removeEventListener(ev, go, true));
      if (!playing) start();
    };
    EV.forEach((ev) => addEventListener(ev, go, true));
    try {
      build();
      ctx.resume().then(() => {
        if (ctx.state === 'running' && !playing) { EV.forEach((ev) => removeEventListener(ev, go, true)); start(); }
      }).catch(() => {});
    } catch (e) {}
  }

  // Ẩn tab thì tạm dừng cho đỡ tốn pin
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !playing) return;
    document.hidden ? ctx.suspend() : ctx.resume();
  });
})();
