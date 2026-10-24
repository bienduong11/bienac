/* =====================================================================
 * Ô tìm kiếm trang chủ: video, bài viết, ứng dụng, và chữ Hán (mở Chiết tự).
 * Dữ liệu nạp lúc người dùng bấm vào ô lần đầu.
 * ===================================================================== */
(function () {
  'use strict';
  const q = document.getElementById('q'), box = document.getElementById('search-res');
  if (!q || !box) return;
  const APPS = [
    ['Bảng tuần hoàn', '/elements.html', 'nguyen to hoa hoc bang tuan hoan'],
    ['Hiện tượng vật lý', '/phenomena.html', 'hien tuong vat ly cuc quang set'],
    ['Quả địa cầu lịch sử', '/thegioi/index.html', 'trai dat dia cau lich su phat minh'],
    ['Chiết tự chữ Hán', '/chiet-tu/', 'chiet tu chu han han viet'],
    ['Mạng tri thức', '/mang-tri-thuc/', 'mang tri thuc khai niem'],
    ['Bầu trời Đông Tây', '/bau-troi/', 'bau troi sao chom sao nhi thap bat tu'],
    ['Thang vũ trụ', '/thang-vu-tru/', 'thang vu tru kich thuoc quark'],
    ['Dòng thời gian Đông Tây', '/dong-thoi-gian/', 'dong thoi gian lich su'],
    ['Mỗi giây trên Trái Đất', '/moi-giay/', 'moi giay set sinh van toc'],
    ['Đố vui khoa học', '/do-vui/', 'do vui cau hoi trac nghiem quiz'],
    ['Lịch vũ trụ', '/lich-vu-tru/', 'lich vu tru sagan big bang'],
    ['Hệ Mặt Trời thu nhỏ', '/he-mat-troi/', 'he mat troi ti le hanh tinh'],
    ['Bạn trên các hành tinh', '/hanh-tinh/', 'hanh tinh can nang tuoi sao hoa'],
    ['Phổ điện từ', '/pho-anh-sang/', 'pho dien tu anh sang buoc song tia x gamma'],
    ['Thí nghiệm hai khe', '/hai-khe/', 'hai khe giao thoa song hat luong tu'],
    ['Phân rã phóng xạ', '/phong-xa/', 'phong xa ban ra carbon 14 tuoi'],
    ['Trò chơi sự sống', '/su-song/', 'tro choi su song conway'],
    ['Đàn chim', '/dan-chim/', 'dan chim boids tu to chuc'],
    ['Hiệu ứng cánh bướm', '/canh-buom/', 'canh buom lorenz hon loan'],
    ['Bàn Galton', '/galton/', 'galton phan phoi chuan xac suat'],
    ['Âm lịch & Can Chi', '/am-lich/', 'am lich can chi tet tiet khi con giap'],
    ['Kinh Dịch nhị phân', '/kinh-dich/', 'kinh dich que nhi phan leibniz'],
    ['Hệ đếm nhân loại', '/he-dem/', 'he dem nhi phan la ma maya babylon'],
    ['Ngọn lửa màu', '/ngon-lua/', 'ngon lua mau kim loai pho phat xa han the'],
    ['Trộn ánh sáng', '/tron-mau/', 'tron mau anh sang rgb te bao non'],
    ['Con lắc kép', '/con-lac/', 'con lac kep hon loan'],
    ['Bắt đầu từ đây', '/bat-dau/', 'bat dau moi xem gioi thieu lo trinh nen xem video nao'],
    ['Ủng hộ Bienac', '/ung-ho/', 'ung ho donate'],
  ];
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let data = null, items = [], sel = -1;

  async function load() {
    if (data) return;
    const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [videos, posts, hoSo] = await Promise.all([get('/data/tat-ca-video.json'), get('/bai-viet/muc-luc.json'), get('/bai-viet/ho-so.json')]);
    data = [];
    (posts || []).forEach((p) => data.push({ k: 'Bài viết', t: p.title, u: `/bai-viet/${p.slug}/`, img: p.video ? `https://i.ytimg.com/vi/${p.video}/mqdefault.jpg` : '', f: fold(p.title + ' ' + (p.description || '')) }));
    (videos || []).forEach((v) => data.push({ k: 'Video', t: v.title, u: (hoSo && hoSo[v.id]) || `https://www.youtube.com/watch?v=${v.id}`, img: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, f: fold(v.title) }));
    APPS.forEach(([t, u, kw]) => data.push({ k: 'Ứng dụng', t, u, ic: '◈', f: fold(t) + ' ' + kw }));
  }

  function render() {
    const raw = q.value.trim();
    if (!raw) { box.hidden = true; return; }
    const han = [...raw].filter((c) => /\p{Script=Han}/u.test(c));
    const words = fold(raw).split(/\s+/).filter(Boolean);
    items = han.length ? han.slice(0, 4).map((c) => ({ k: 'Chiết tự', t: `Tách chữ ${c}`, u: `/chiet-tu/#${encodeURIComponent(c)}`, ic: c })) : [];
    if (data) items.push(...data.filter((d) => words.every((w) => d.f.includes(w))).slice(0, 8));
    sel = -1;
    box.innerHTML = items.length
      ? items.map((d, i) => `<a href="${esc(d.u)}" data-i="${i}"${/^https?:/.test(d.u) ? ' target="_blank" rel="noopener"' : ''}>${d.img ? `<img src="${esc(d.img)}" alt="" loading="lazy" />` : `<span class="ic">${esc(d.ic)}</span>`}<span><span class="k">${d.k}</span><span class="t">${esc(d.t)}</span></span></a>`).join('')
      : `<p>Không tìm thấy “${esc(raw)}”.</p>`;
    box.hidden = false;
  }

  q.addEventListener('focus', () => { load().then(render); });
  q.addEventListener('input', () => { load().then(render); });
  q.addEventListener('keydown', (e) => {
    const links = box.querySelectorAll('a');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links.forEach((a, i) => a.classList.toggle('on', i === sel));
    } else if (e.key === 'Enter') {
      const a = links[sel >= 0 ? sel : 0];
      if (a) a.click();
    } else if (e.key === 'Escape') { box.hidden = true; q.blur(); }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#search')) box.hidden = true; });
})();
