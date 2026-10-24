#!/usr/bin/env node
/* =====================================================================
 * Dựng kho bài viết từ thư mục posts/ (Markdown) ra HTML tĩnh.
 *
 *   posts/ten-bai-viet.md  →  bai-viet/ten-bai-viet/index.html
 *                          →  bai-viet/index.html   (danh sách bài)
 *                          →  sitemap.xml
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

const header = (active) => `
  <header class="site-header scrolled">
    <a class="brand" href="/">
      <span class="brand-logo"><img src="/assets/logo.svg" alt="logo Bienac" /></span>
      <span class="brand-name">Bienac</span>
    </a>
    <nav class="site-nav">
      <a href="/#videos">Video</a>
      <a href="/bai-viet/"${active ? ' class="nav-active"' : ''}>Bài viết</a>
      <a href="/elements.html">Nguyên tố</a>
      <a href="/#about">Về Bienac</a>
      <a class="nav-cta" href="https://www.youtube.com/@bienac?sub_confirmation=1" target="_blank" rel="noopener">Đăng ký kênh</a>
    </nav>
  </header>`;

const page = ({ title, description, url, image, body, type = 'website' }) => `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${url}" />
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
  <link rel="stylesheet" href="/css/blog.css" />
</head>
<body class="no-webgl blog">
  <div class="vignette" aria-hidden="true"></div>
${header(true)}
  <main class="blog-main">
${body}
  </main>
  <footer class="site-footer"><p>© ${new Date().getFullYear()} Bienac.</p></footer>
</body>
</html>
`;

async function main() {
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
    posts.push({
      slug,
      title: data.title,
      description: data.description || '',
      date: String(data.date).slice(0, 10),
      video: data.video || '',
      tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
      html: marked.parse(body),
      minutes: readingMinutes(body),
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
      ? `<div class="post-player"><iframe src="https://www.youtube-nocookie.com/embed/${esc(p.video)}" title="${esc(p.title)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
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
      ${player}
      <div class="post-body">${p.html}</div>
      <footer class="post-cta">
        <p>Bài viết này đi kèm video trên kênh Bienac. Đăng ký để không lỡ những câu chuyện tiếp theo.</p>
        <a class="btn btn-primary" href="https://www.youtube.com/@bienac?sub_confirmation=1" target="_blank" rel="noopener">Đăng ký kênh</a>
      </footer>
    </article>
    <script type="application/ld+json">${jsonld}</script>`;
    await mkdir(path.join(OUT, p.slug), { recursive: true });
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

  // Sitemap
  const urls = ['/', '/elements.html', '/phenomena.html', '/thegioi/index.html', '/bai-viet/', ...posts.map((p) => `/bai-viet/${p.slug}/`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  await writeFile(path.join(ROOT, 'sitemap.xml'), sitemap);

  console.log(`Đã dựng ${posts.length} bài viết.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
