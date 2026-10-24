#!/usr/bin/env node
/* =====================================================================
 * Dựng kho bài viết từ thư mục posts/ (Markdown) ra HTML tĩnh.
 *
 *   posts/ten-bai-viet.md  →  bai-viet/ten-bai-viet/index.html
 *                          →  bai-viet/ten-bai-viet/mo-ta.txt  (mô tả YouTube dựng sẵn)
 *                          →  bai-viet/index.html   (danh sách bài)
 *                          →  cong-cu/mo-ta/index.html  (trang chép mô tả, không lên Google)
 *                          →  _redirects   (link ngắn: /v/ten-ngan, /dk, /yt…)
 *                          →  sitemap.xml
 *
 * Trong bài, các mục đặc biệt (tiêu đề ## đúng tên):
 *   ## Chương         danh sách "- 0:00 Tên chương", hiện thành mục lục bấm nhảy phút
 *   ## Đính chính     hiện thành khung đỏ ở đầu bài
 *   ## Nguồn tham khảo  danh sách nguồn, chữ nhỏ ở cuối bài
 *
 * Chạy lúc Cloudflare Pages dựng web (npm run build).
 * File bắt đầu bằng dấu _ hoặc có `draft: true` sẽ bị bỏ qua.
 * ===================================================================== */
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'posts');
const OUT = path.join(ROOT, 'bai-viet');
const SITE = 'https://bienac.com';

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Đọc phần đầu file dạng:  ---\nkhoa: gia tri\n---  */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) {
      v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, '');
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
    }
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}

const fmtDate = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
};

/** Thời gian đọc ước lượng: ~200 từ/phút tiếng Việt. */
const readingMinutes = (text) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));

/** Tách mục "## Tên" ra khỏi thân bài, trả về [nội dung mục, thân còn lại]. */
function takeSection(body, names) {
  const re = new RegExp(`^##\\s+(?:${names.join('|')})\\s*$`, 'mi');
  const m = body.match(re);
  if (!m) return ['', body];
  const start = m.index, after = start + m[0].length;
  const next = body.slice(after).search(/^##\s+/m);
  const end = next === -1 ? body.length : after + next;
  return [body.slice(after, end).trim(), body.slice(0, start) + body.slice(end)];
}

/** "- 1:02:03 Tên" → { t: '1:02:03', s: 3723, name } */
function parseChapters(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*[-*]?\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+[-–—:]?\s*(.+)$/))
    .filter(Boolean)
    .map(([, t, name]) => ({ t, name: name.trim(), s: t.split(':').reduce((a, x) => a * 60 + Number(x), 0) }));
}

const header = () => `
  <header class="site-header scrolled">
    <a class="brand" href="/">
      <span class="brand-logo"><img src="/assets/logo.svg" alt="logo Bienac" /></span>
      <span class="brand-name">Bienac</span>
    </a>
    <nav class="site-nav">
      <span class="nav-here">Bài viết</span>
      <a class="nav-apps" href="/#apps" title="Tất cả mục" aria-label="Tất cả mục của Bienac">⊞</a>
      <a class="nav-cta" href="https://www.youtube.com/@bienac?sub_confirmation=1" target="_blank" rel="noopener">Đăng ký kênh</a>
    </nav>
  </header>`;

const page = ({ title, description, url, image, body, type = 'website', noindex = false }) => `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${url}" />${noindex ? '\n  <meta name="robots" content="noindex, nofollow" />' : ''}
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image || SITE + '/assets/preview.jpeg'}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,600;0,800;1,400&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/blog.css" />
  <link rel="stylesheet" href="/css/theme.css" />
</head>
<body class="no-webgl blog">
  <div class="vignette" aria-hidden="true"></div>
${header()}
  <main class="blog-main">
${body}
  </main>
  <footer class="site-footer"><p>© ${new Date().getFullYear()} Bienac.</p></footer>
</body>
</html>
`;

/** Mục lục chương: bấm là tua video tới đúng giây. */
function chapterNav(p) {
  if (!p.chapters.length) return '';
  const items = p.chapters
    .map((c) => `<li><a href="https://www.youtube.com/watch?v=${esc(p.video)}&t=${c.s}s" data-s="${c.s}"><b>${c.t}</b> ${esc(c.name)}</a></li>`)
    .join('');
  return `<nav class="post-chapters" aria-label="Mục lục video"><p class="post-chapters-k">Mục lục</p><ol>${items}</ol></nav>`;
}
const CHAPTER_JS = `
    <script>
      document.querySelectorAll('.post-chapters a[data-s]').forEach((a) => a.addEventListener('click', (e) => {
        const f = document.getElementById('player'); if (!f) return;
        e.preventDefault();
        f.src = f.src.split('?')[0] + '?start=' + a.dataset.s + '&autoplay=1';
        f.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }));
    </script>`;

let CFG = {};
/** Mô tả YouTube dựng sẵn: câu mở, link, mục lục, chân mô tả, hashtag. */
/** Markdown → chữ thuần cho mô tả YouTube: danh sách thành "• ", link thành "chữ URL". */
function plain(md) {
  return md
    .split(/\r?\n/)
    .map((l) => l
      .replace(/^\s*(?:[-*]|\d+\.)\s+/, '• ')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => (u.replace(/^https?:\/\//, '').startsWith(t) ? u : `${t} ${u}`))
      .replace(/(^|[\s(])[*_]+|[*_]+(?=[\s).,;:]|$)/g, '$1')
      .replace(/`/g, ''))
    .join('\n')
    .trim();
}
/** Lấy nội dung một mục "## Tên" mà không bỏ nó khỏi bài. */
const peekSection = (body, names) => takeSection(body, names)[0];

/**
 * Mô tả YouTube dựng sẵn, theo đúng khuôn mô tả quen dùng của kênh:
 * câu mở · link hồ sơ · ủng hộ · liên kết · lưu ý · tài liệu · hình ảnh · bản quyền · mục lục
 * Các khối cố định nằm ở data/config.json → moTa.
 */
function youtubeDescription(p) {
  const m = CFG.moTa || {};
  const SEP = m.ngan || '▁';
  const blocks = [];
  blocks.push([p.hook, `Nguồn, bài đọc và đính chính: ${SITE}/v/${p.short}`].filter(Boolean).join('\n'));
  if (m.ungHo) blocks.push(m.ungHo);
  if (m.lienKet) blocks.push(m.lienKet);
  if (p.luuY) blocks.push('Lưu ý\n' + plain(p.luuY));
  if (p.nguon) blocks.push('Tài liệu tham khảo\n' + plain(p.nguon));
  if (p.hinhAnh) blocks.push('Hình ảnh, video, âm thanh\n' + plain(p.hinhAnh));
  if (m.banQuyen) blocks.push(m.banQuyen.replace('{nam}', p.date.slice(0, 4)));
  if (p.chapters.length) {
    const ch = p.chapters.slice();
    if (ch[0].s !== 0) ch.unshift({ t: '00:00', name: 'Mở đầu', s: 0 });   // YouTube cần mốc 0:00
    blocks.push(ch.map((c) => `${c.t} ${c.name}`).join('\n'));
  }
  const tags = [...(m.hashtags || []), ...p.hashtags].map((t) => '#' + String(t).replace(/^#/, '').replace(/\s+/g, ''));
  if (tags.length) blocks.push([...new Set(tags)].join(' '));
  let out = blocks.join(`\n${SEP}\n`) + '\n';
  if (out.length > 5000) out = out.slice(0, 4990) + '…\n';   // giới hạn của YouTube
  return out;
}

async function main() {
  try { CFG = JSON.parse(await readFile(path.join(ROOT, 'data', 'config.json'), 'utf8')); } catch {}
  let files = [];
  try {
    files = (await readdir(SRC)).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
  } catch {
    console.log('Không có thư mục posts/, bỏ qua.');
  }

  const posts = [];
  for (const f of files) {
    const raw = await readFile(path.join(SRC, f), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    if (data.draft === true) continue;
    if (!data.title || !data.date) {
      console.warn(`Bỏ qua ${f}: thiếu title hoặc date.`);
      continue;
    }
    const slug = f.replace(/\.md$/, '');
    let rest = body;
    let chapText, fixText;
    [chapText, rest] = takeSection(rest, ['Chương', 'Mục lục']);
    [fixText, rest] = takeSection(rest, ['Đính chính']);
    let luuY, hinhAnh;
    [luuY, rest] = takeSection(rest, ['Lưu ý']);
    [hinhAnh, rest] = takeSection(rest, ['Hình ảnh, video, âm thanh', 'Hình ảnh']);
    const nguon = peekSection(rest, ['Nguồn tham khảo', 'Tài liệu tham khảo']);
    const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
    posts.push({
      slug,
      short: data.link || slug,                 // bienac.com/v/<link>
      title: data.title,
      description: data.description || '',
      hook: data.hook || data.description || '',
      date: String(data.date).slice(0, 10),
      video: data.video || '',
      tags: list(data.tags),
      hashtags: list(data.hashtags),
      chapters: parseChapters(chapText),
      fix: fixText ? marked.parse(fixText) : '',
      luuY, hinhAnh, nguon,
      luuYHtml: luuY ? marked.parse(luuY) : '',
      hinhAnhHtml: hinhAnh ? marked.parse(hinhAnh) : '',
      html: marked.parse(rest),
      minutes: readingMinutes(rest),
    });
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // Từng bài
  for (const p of posts) {
    const url = `${SITE}/bai-viet/${p.slug}/`;
    const thumb = p.video ? `https://i.ytimg.com/vi/${p.video}/maxresdefault.jpg` : '';
    const player = p.video
      ? `<div class="post-player"><iframe id="player" src="https://www.youtube-nocookie.com/embed/${esc(p.video)}" title="${esc(p.title)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
      : '';
    const jsonld = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      inLanguage: 'vi',
      author: { '@type': 'Person', name: 'Dương Văn Biên' },
      publisher: { '@type': 'Organization', name: 'Bienac', url: SITE },
      image: thumb || undefined,
      mainEntityOfPage: url,
    });
    const body = `
    <article class="post">
      <a class="post-back" href="/bai-viet/">← Tất cả bài viết</a>
      <header class="post-head">
        <p class="post-meta">${fmtDate(p.date)} · ${p.minutes} phút đọc${p.tags.length ? ' · ' + p.tags.map(esc).join(' · ') : ''}</p>
        <h1 class="post-title">${esc(p.title)}</h1>
        ${p.description ? `<p class="post-lede">${esc(p.description)}</p>` : ''}
      </header>
      ${p.fix ? `<aside class="post-fix"><p class="post-fix-k">Đính chính</p>${p.fix}</aside>` : ''}
      ${player}
      ${chapterNav(p)}
      <p class="post-short">Link ngắn của video này: <a href="/v/${esc(p.short)}">bienac.com/v/${esc(p.short)}</a></p>
      ${p.luuYHtml ? `<aside class="post-note"><p class="post-fix-k">Lưu ý</p>${p.luuYHtml}</aside>` : ''}
      <div class="post-body">${p.html}</div>
      ${p.hinhAnhHtml ? `<section class="post-credits"><h2>Hình ảnh, video, âm thanh</h2>${p.hinhAnhHtml}</section>` : ''}
      <section class="post-comments">
        <h2>Thảo luận</h2>
        <div class="giscus"></div>
        <script src="https://giscus.app/client.js" data-repo="bienduong11/bienac" data-repo-id="R_kgDOVVi1CQ" data-category="General" data-category-id="DIC_kwDOVVi1Cc4DJfa2" data-mapping="pathname" data-strict="0" data-reactions-enabled="1" data-emit-metadata="0" data-input-position="top" data-theme="transparent_dark" data-lang="vi" data-loading="lazy" crossorigin="anonymous" async></script>
      </section>
      <footer class="post-cta">
        <p>Bài viết này đi kèm video trên kênh Bienac. Đăng ký để không lỡ những câu chuyện tiếp theo.</p>
        <a class="btn btn-primary" href="https://www.youtube.com/@bienac?sub_confirmation=1" target="_blank" rel="noopener">Đăng ký kênh</a>
      </footer>
    </article>
    <script type="application/ld+json">${jsonld}</script>${p.chapters.length && p.video ? CHAPTER_JS : ''}`;
    await mkdir(path.join(OUT, p.slug), { recursive: true });
    await writeFile(path.join(OUT, p.slug, 'mo-ta.txt'), youtubeDescription(p));
    await writeFile(
      path.join(OUT, p.slug, 'index.html'),
      page({ title: `${p.title} · Bienac`, description: p.description, url, image: thumb, body, type: 'article' })
    );
  }

  // Trang danh sách
  const list = posts.length
    ? `<ul class="post-list">${posts
        .map(
          (p) => `
        <li><a class="post-item" href="/bai-viet/${p.slug}/">
          ${p.video ? `<img class="post-item-thumb" src="https://i.ytimg.com/vi/${p.video}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360" />` : ''}
          <div class="post-item-text">
            <p class="post-meta">${fmtDate(p.date)} · ${p.minutes} phút đọc</p>
            <h2>${esc(p.title)}</h2>
            ${p.description ? `<p>${esc(p.description)}</p>` : ''}
          </div>
        </a></li>`
        )
        .join('')}
      </ul>`
    : `<div class="post-empty"><h2>Bài viết đầu tiên đang được biên soạn</h2><p>Trong lúc chờ, bạn xem video trên kênh nhé.</p><a class="btn btn-ghost" href="/#videos">Xem video</a></div>`;

  await writeFile(
    path.join(OUT, 'index.html'),
    page({
      title: 'Bài viết · Bienac',
      image: `${SITE}/assets/og/bai-viet.jpg`,
      description: 'Nội dung các video của Bienac ở dạng đọc, kèm đầy đủ nguồn tham khảo.',
      url: `${SITE}/bai-viet/`,
      body: `
    <section class="blog-intro">
      <h1 class="section-title">Bài <span class="accent">viết</span></h1>
      <p class="section-sub">Câu chuyện trong mỗi video, viết lại để đọc chậm, kèm đủ nguồn để bạn tự kiểm chứng.</p>
    </section>
    ${list}`,
    })
  );

  // Trang công cụ: chép mô tả YouTube (không cho Google lập chỉ mục)
  const tool = posts.filter((p) => p.video || p.chapters.length);
  const TOOL_OUT = path.join(ROOT, 'cong-cu', 'mo-ta');
  await rm(path.join(ROOT, 'cong-cu'), { recursive: true, force: true });
  await mkdir(TOOL_OUT, { recursive: true });
  await writeFile(
    path.join(TOOL_OUT, 'index.html'),
    page({
      title: 'Mô tả YouTube · Bienac',
      description: 'Công cụ nội bộ.',
      url: `${SITE}/cong-cu/mo-ta/`,
      noindex: true,
      body: `
    <section class="blog-intro">
      <h1 class="section-title">Mô tả <span class="accent">YouTube</span></h1>
      <p class="section-sub">Dựng tự động từ thư mục posts/. Bấm “Sao chép” rồi dán vào ô mô tả trên YouTube Studio.</p>
    </section>
    ${tool.length ? tool.map((p) => `
    <section class="tool-item">
      <div class="tool-head"><h2>${esc(p.title)}</h2><button class="btn btn-ghost" type="button" data-copy>Sao chép</button></div>
      <textarea readonly rows="10">${esc(youtubeDescription(p))}</textarea>
    </section>`).join('') : '<div class="post-empty"><h2>Chưa có video nào</h2><p>Thêm file .md có dòng video: vào thư mục posts/.</p></div>'}
    <script>
      document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
        const t = b.closest('.tool-item').querySelector('textarea');
        try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
        b.textContent = 'Đã chép ✓'; setTimeout(() => (b.textContent = 'Sao chép'), 1600);
      }));
    </script>`,
    })
  );

  // Link ngắn (Cloudflare Pages đọc file _redirects ở thư mục gốc)
  const yt = (CFG.channelUrl || 'https://www.youtube.com/@bienac').replace(/\/$/, '');
  const redirects = [
    `/dk ${yt}?sub_confirmation=1 302`,
    `/yt ${yt} 302`,
    `/goi-y /#request 302`,
    `/v /bai-viet/ 302`,
    ...posts.map((p) => `/v/${p.short} /bai-viet/${p.slug}/ 302`),
    ...posts.filter((p) => p.short !== p.slug).map((p) => `/v/${p.slug} /bai-viet/${p.slug}/ 302`),
  ];
  await writeFile(path.join(ROOT, '_redirects'), redirects.join('\n') + '\n');

  // Mục lục bài cho ô tìm kiếm trang chủ
  await writeFile(path.join(OUT, 'muc-luc.json'), JSON.stringify(posts.map((p) => ({ slug: p.slug, title: p.title, description: p.description, video: p.video }))));

  // Bảng tra video → hồ sơ (Mạng tri thức dùng)
  await writeFile(path.join(OUT, 'ho-so.json'), JSON.stringify(Object.fromEntries(posts.filter((p) => p.video).map((p) => [p.video, `/v/${p.short}`]))));

  // Sitemap
  const urls = ['/', '/elements.html', '/phenomena.html', '/thegioi/index.html', '/thang-vu-tru/', '/dong-thoi-gian/', '/mang-tri-thuc/', '/chiet-tu/', '/bau-troi/', '/ung-ho/', '/moi-giay/', '/do-vui/', '/lich-vu-tru/', '/he-mat-troi/', '/hanh-tinh/', '/pho-anh-sang/', '/hai-khe/', '/phong-xa/', '/su-song/', '/dan-chim/', '/canh-buom/', '/galton/', '/am-lich/', '/kinh-dich/', '/he-dem/', '/ngon-lua/', '/tron-mau/', '/con-lac/', '/bat-dau/', '/bai-viet/', ...posts.map((p) => `/bai-viet/${p.slug}/`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  await writeFile(path.join(ROOT, 'sitemap.xml'), sitemap);

  console.log(`Đã dựng ${posts.length} bài viết, ${redirects.length} link ngắn.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
