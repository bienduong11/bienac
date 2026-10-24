/* =====================================================================
 * bienac — khởi tạo trang & bảng chọn hiệu ứng
 * ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * CẤU HÌNH — sửa trong data/config.json (không cần đụng vào file này).
   * DEFAULTS chỉ là phương án dự phòng khi không tải được config.json.
   *
   * Thứ tự ưu tiên danh sách video:
   *   1. data/config.json → videos có điền id  (sửa tay)
   *   2. data/videos.json                       (CI tự lấy từ kênh YouTube)
   *   3. DEFAULTS bên dưới                      (placeholder)
   * ------------------------------------------------------------------ */
  const DEFAULTS = {
    channelUrl: 'https://www.youtube.com/@bienac',
    maxVideos: 6,
    videos: [
      { id: '', title: 'Cực quang sinh ra như thế nào?',            tag: 'Vật lý' },
      { id: '', title: 'Vì sao đại dương có sóng?',                  tag: 'Tự nhiên' },
      { id: '', title: 'Tinh vân — vườn ươm của những vì sao',       tag: 'Vũ trụ' },
      { id: '', title: 'Ánh sáng của đom đóm: hóa học kỳ diệu',      tag: 'Sinh học' },
      { id: '', title: 'Lỗ đen có thực sự "đen"?',                   tag: 'Vũ trụ' },
      { id: '', title: 'Thời gian có trôi như nhau ở mọi nơi?',      tag: 'Vật lý' },
    ],
  };

  async function fetchJson(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) { /* offline / file:// — dùng dự phòng */ }
    return null;
  }

  async function loadConfig() {
    const cfg = await fetchJson('data/config.json');
    return Object.assign({}, DEFAULTS, cfg || {});
  }

  async function loadVideos(config) {
    const max = Number(config.maxVideos) > 0 ? Number(config.maxVideos) : DEFAULTS.maxVideos;
    const manual = (config.videos || []).filter((v) => v && v.id);
    if (manual.length) return manual.slice(0, max);
    if (config.autoFetchVideos !== false) {
      const auto = await fetchJson('data/videos.json');
      if (Array.isArray(auto) && auto.length) return auto.slice(0, max);
    }
    const fallback = (config.videos && config.videos.length) ? config.videos : DEFAULTS.videos;
    return fallback.slice(0, max);
  }

  const EFFECT_KEY = 'bienac-effect';
  const DEFAULT_EFFECT = 'aurora';

  /* ----------------------------------------------- Hiệu ứng nền --- */
  // Trang chủ dùng nền mã nhị phân riêng (js/nen-logo.js), không có fx-canvas
  const canvas = document.getElementById('fx-canvas');
  if (canvas && window.BienacFX) {
  const engine = new window.BienacFX.FXEngine(canvas);

  const saved = localStorage.getItem(EFFECT_KEY);
  const initial = window.BienacFX.EFFECTS.includes(saved) ? saved : DEFAULT_EFFECT;

  const options = document.getElementById('fx-options');
  const buttons = options ? Array.from(options.querySelectorAll('button[data-effect]')) : [];

  function selectEffect(name, instant) {
    if (!window.BienacFX.EFFECTS.includes(name)) return;
    if (instant) {
      engine.current = engine.getProgram(name);
    } else {
      engine.setEffect(name);
    }
    localStorage.setItem(EFFECT_KEY, name);
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.effect === name));
  }
  selectEffect(initial, true);

  // Cho bong bóng hiện tượng vật lý (js/bubble.js) đổi hiệu ứng nền
  window.bienacSelectEffect = (name) => selectEffect(name, false);

  buttons.forEach((b) => {
    b.addEventListener('click', () => selectEffect(b.dataset.effect, false));
  });

  // Phím tắt 1-4 đổi hiệu ứng
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    const idx = parseInt(e.key, 10) - 1;
    if (idx >= 0 && idx < buttons.length) selectEffect(buttons[idx].dataset.effect, false);
  });

  // Thu gọn / mở bảng chọn
  const toggle = document.getElementById('fx-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = options.classList.toggle('collapsed') === false;
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  }

  /* ----------------------------------------- Menu mobile (nav) ---- */
  const navToggle = document.getElementById('nav-toggle');
  const siteNav = document.getElementById('site-nav');
  if (navToggle && siteNav) {
    const setNav = (open) => {
      siteNav.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    };
    navToggle.addEventListener('click', () => {
      setNav(!siteNav.classList.contains('open'));
    });
    // Đóng menu khi chọn một mục
    siteNav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setNav(false));
    });
    // Đóng menu khi nhấn Esc
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setNav(false);
    });
  }

  /* -------------------------------------- Liên kết + lưới video --- */
  const PLACEHOLDER_GRADIENTS = [
    'linear-gradient(135deg, #04293f, #0b7a6e)',
    'linear-gradient(135deg, #061b3a, #1e4fa0)',
    'linear-gradient(135deg, #1b0b3a, #6e2bb0)',
    'linear-gradient(135deg, #052e2a, #19b89a)',
    'linear-gradient(135deg, #0a1030, #3a3ad0)',
    'linear-gradient(135deg, #2a0b30, #b03a8a)',
  ];

  function renderLinks(config) {
    ['nav-subscribe', 'hero-subscribe', 'about-subscribe', 'more-videos'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = config.channelUrl + (id === 'more-videos' ? '/videos' : '?sub_confirmation=1');
    });
  }

  function renderVideos(config, videos) {
    const grid = document.getElementById('video-grid');
    if (!grid) return;
    grid.innerHTML = '';

    videos.forEach((v, i) => {
      const a = document.createElement('a');
      a.className = 'video-card';
      a.target = '_blank';
      a.rel = 'noopener';
      a.href = v.id ? `https://www.youtube.com/watch?v=${v.id}` : config.channelUrl + '/videos';

      const thumb = document.createElement('div');
      thumb.className = 'video-thumb';
      if (v.id) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = v.title;
        img.src = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
        thumb.appendChild(img);
      } else {
        thumb.style.background = PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length];
        thumb.innerHTML = '<span class="thumb-mark">▶</span>';
      }

      const meta = document.createElement('div');
      meta.className = 'video-meta';
      const tag = document.createElement('span');
      tag.className = 'video-tag';
      tag.textContent = v.tag || 'Video';
      const h3 = document.createElement('h3');
      h3.textContent = v.title;
      meta.appendChild(tag);
      meta.appendChild(h3);

      a.appendChild(thumb);
      a.appendChild(meta);
      grid.appendChild(a);
      observer.observe(a);
    });
  }

  (async () => {
    const config = await loadConfig();
    renderLinks(config);
    renderVideos(config, await loadVideos(config));
  })();

  /* ----------------------------------------------------- Khác ----- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Header đổi nền khi cuộn
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  // Hiện dần các section khi cuộn tới
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        observer.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.section, .video-card').forEach((el) => observer.observe(el));


})();
