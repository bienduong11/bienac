/* =====================================================================
 * bienac — FAB bong bóng "hiện tượng vật lý"
 *
 * Bong bóng tự bay lơ lửng quanh màn hình như bọt xà phòng (trôi dạt
 * ngẫu nhiên + dập dềnh, nảy lại khi chạm mép). Có thể kéo-thả tới vị
 * trí bất kỳ (thả tay sẽ bay theo quán tính). Nhấn (không kéo) sẽ mở
 * danh sách hiện tượng vật lý để đổi hiệu ứng nền WebGL.
 * ===================================================================== */
(function () {
  'use strict';
  if (!window.BienacFX) return;

  const PHENOMENA = [
    { name: 'arc',          icon: '⚡', label: 'Hồ quang điện' },
    { name: 'lightning',    icon: '🌩️', label: 'Sấm sét' },
    { name: 'polarized',    icon: '🌈', label: 'Tia phân cực' },
    { name: 'interference', icon: '🌊', label: 'Giao thoa sóng' },
  ];
  const EFFECT_KEY = 'bienac-effect';
  const SIZE = 56;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------- Dựng DOM --- */
  const bubble = document.createElement('button');
  bubble.className = 'phys-bubble';
  bubble.title = 'Hiện tượng vật lý — kéo để di chuyển, nhấn để chọn';
  bubble.setAttribute('aria-label', 'Chọn hiện tượng vật lý làm hiệu ứng nền');
  bubble.innerHTML = '<span class="phys-icon">⚛</span>';

  const menu = document.createElement('div');
  menu.className = 'phys-menu collapsed';
  menu.setAttribute('role', 'group');
  menu.innerHTML = '<span class="phys-label">Hiện tượng vật lý</span>';
  PHENOMENA.forEach((ph) => {
    const b = document.createElement('button');
    b.dataset.effect = ph.name;
    b.textContent = `${ph.icon} ${ph.label}`;
    b.addEventListener('click', () => {
      if (window.bienacSelectEffect) window.bienacSelectEffect(ph.name);
      markActive();
      closeMenu();
    });
    menu.appendChild(b);
  });
  document.body.append(bubble, menu);

  function markActive() {
    const cur = localStorage.getItem(EFFECT_KEY);
    menu.querySelectorAll('button[data-effect]').forEach((b) => {
      b.classList.toggle('active', b.dataset.effect === cur);
    });
  }

  /* ------------------------------------------------ Vật lý bay --- */
  let x = 26, y = window.innerWidth < 720 ? window.innerHeight - SIZE - 24 : window.innerHeight * 0.55;
  let vx = 18, vy = -10;
  let phase = Math.random() * Math.PI * 2;
  let dragging = false, menuOpen = false;
  let last = performance.now();

  function bounds() {
    const m = 8;
    return {
      minX: m,
      minY: m,
      maxX: window.innerWidth - SIZE - m,
      maxY: window.innerHeight - SIZE - m,
    };
  }

  function step(now) {
    requestAnimationFrame(step);
    if (document.hidden) { last = now; return; } // nghỉ khi tab ẩn

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (!dragging && !menuOpen && !reduceMotion) {
      // gió ngẫu nhiên nhè nhẹ đẩy bong bóng trôi dạt
      vx += (Math.random() - 0.5) * 40 * dt + Math.sin(phase + now / 2400) * 6 * dt;
      vy += (Math.random() - 0.5) * 40 * dt - 2.5 * dt; // hơi nhẹ hơn không khí
      // lực cản giữ tốc độ dịu
      vx *= 1 - 0.35 * dt;
      vy *= 1 - 0.35 * dt;
      const sp = Math.hypot(vx, vy);
      const maxSp = 46;
      if (sp > maxSp) { vx *= maxSp / sp; vy *= maxSp / sp; }

      x += vx * dt;
      y += vy * dt + Math.sin(now / 900 + phase) * 7 * dt; // dập dềnh

      const b = bounds();
      if (x < b.minX) { x = b.minX; vx = Math.abs(vx) * 0.85; }
      if (x > b.maxX) { x = b.maxX; vx = -Math.abs(vx) * 0.85; }
      if (y < b.minY) { y = b.minY; vy = Math.abs(vy) * 0.85; }
      if (y > b.maxY) { y = b.maxY; vy = -Math.abs(vy) * 0.85; }
    } else if (dragging || menuOpen) {
      const b = bounds();
      x = Math.min(Math.max(x, b.minX), b.maxX);
      y = Math.min(Math.max(y, b.minY), b.maxY);
    }

    bubble.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
  requestAnimationFrame(step);

  /* ------------------------------------------------- Kéo & nhấn --- */
  let downX = 0, downY = 0, grabX = 0, grabY = 0, moved = false;
  let lastPX = 0, lastPY = 0, lastPT = 0;

  bubble.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    bubble.setPointerCapture(e.pointerId);
    dragging = true;
    moved = false;
    downX = e.clientX; downY = e.clientY;
    grabX = x; grabY = y;
    lastPX = e.clientX; lastPY = e.clientY; lastPT = performance.now();
    vx = 0; vy = 0;
    bubble.classList.add('grabbing');
  });

  bubble.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - downX, dy = e.clientY - downY;
    if (Math.hypot(dx, dy) > 6) moved = true;
    x = grabX + dx;
    y = grabY + dy;
    // đo vận tốc để "ném" bong bóng khi thả tay
    const t = performance.now();
    const dt = Math.max((t - lastPT) / 1000, 0.001);
    vx = (e.clientX - lastPX) / dt * 0.6;
    vy = (e.clientY - lastPY) / dt * 0.6;
    lastPX = e.clientX; lastPY = e.clientY; lastPT = t;
  });

  bubble.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    bubble.classList.remove('grabbing');
    if (!moved) {
      vx = 0; vy = 0;
      toggleMenu();
    }
    // nếu vừa kéo: giữ vận tốc ném, vòng lặp vật lý tự tiếp tục
  });
  bubble.addEventListener('pointercancel', () => {
    dragging = false;
    bubble.classList.remove('grabbing');
  });

  /* -------------------------------------------------------- Menu --- */
  function openMenu() {
    menuOpen = true;
    markActive();
    menu.classList.remove('collapsed');
    // đặt menu cạnh bong bóng, lật hướng nếu tràn màn hình
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let mx = x + SIZE / 2 - mw / 2;
    let my = y - mh - 12;
    if (my < 8) my = y + SIZE + 12;
    mx = Math.min(Math.max(mx, 8), window.innerWidth - mw - 8);
    my = Math.min(Math.max(my, 8), window.innerHeight - mh - 8);
    menu.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    bubble.classList.add('open');
  }
  function closeMenu() {
    menuOpen = false;
    menu.classList.add('collapsed');
    bubble.classList.remove('open');
  }
  function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }

  document.addEventListener('pointerdown', (e) => {
    if (menuOpen && !menu.contains(e.target) && e.target !== bubble && !bubble.contains(e.target)) {
      closeMenu();
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) closeMenu();
  });
})();
