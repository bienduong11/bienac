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
  <script src="/js/nhac-nen.js"></script>
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
let MANG = { video: {} };
const TITLES = {};   // id video → tiêu đề (data/tat-ca-video.json)
const DOVUI = {};    // id video → số câu Đố vui trỏ tới video đó

/** Video liên quan: chọn tay (lien-quan) trước, rồi bù bằng video chung khái niệm trên Mạng tri thức. */
function related(p, posts) {
  const byKey = (k) => posts.find((q) => q.slug === k || q.short === k || q.alias.includes(k) || q.legacy.includes(k));
  const out = [];
  const add = (q) => { if (q && q !== p && !out.includes(q)) out.push(q); };
  p.lienQuan.forEach((k) => add(byKey(k)));
  const mine = (MANG.video || {})[p.video] || [];
  if (mine.length) {
    posts
      .filter((q) => q.video && q !== p)
      .map((q) => [q, ((MANG.video || {})[q.video] || []).filter((k) => mine.includes(k)).length])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || b[0].date.localeCompare(a[0].date))
      .forEach(([q]) => add(q));
  }
  return out.slice(0, 4);
}
function relatedHtml(list) {
  if (!list.length) return '';
  return `<section class="post-related"><h2>Video liên quan</h2><ul>${list
    .map((q) => `<li><a href="${esc(q.url)}"><img src="https://i.ytimg.com/vi/${esc(q.video)}/mqdefault.jpg" alt="" loading="lazy" width="320" height="180" /><span>${esc(q.title)}</span></a></li>`)
    .join('')}</ul></section>`;
}
/** Hàng lối sang Đố vui / Mạng tri thức / Ủng hộ. */
function exploreHtml(p) {
  const n = DOVUI[p.video] || 0;
  const items = [];
  if (n) items.push(`<a href="/do-vui/#v=${esc(p.video)}"><b>Đố vui</b><span>${n} câu hỏi từ video này</span></a>`);
  if (p.video && (MANG.video || {})[p.video]) items.push(`<a href="/mang-tri-thuc/#v=${esc(p.video)}"><b>Mạng tri thức</b><span>Video này nối với những chủ đề nào</span></a>`);
  items.push(`<a href="/support/"><b>Ủng hộ Bienac</b><span>Giúp kênh làm thêm những video như thế này</span></a>`);
  return `<nav class="post-explore" aria-label="Khám phá thêm">${items.join('')}</nav>`;
}
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
  blocks.push([p.hook, `Nguồn, bài đọc và đính chính: ${SITE}${p.link}`].filter(Boolean).join('\n'));
  if (m.ungHo) blocks.push(m.ungHo);
  if (m.lienKet) blocks.push(m.lienKet);
  if (p.luuY) blocks.push('Lưu ý\n' + plain(p.luuY));
  if (p.nguonChinh) blocks.push('Tài liệu tham khảo chính\n' + plain(p.nguonChinh) + `\nToàn bộ tài liệu: ${SITE}${p.link}`);
  else if (p.nguon) blocks.push('Tài liệu tham khảo\n' + plain(p.nguon));
  if (p.hinhAnh) blocks.push('Hình ảnh, video, âm thanh\n' + plain(p.hinhAnh));
  else if (p.footageList && p.footageList.length) blocks.push(`Hình ảnh, video, âm thanh: ${SITE}${p.url}#footage`);
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

/* ---------------------------------------------------------------------
 * Trang từng video: content/videos/<slug>.json  →  video/<slug>/index.html
 *   { slug, youtube_id, title, summary, chapters[], references[{group,text,url}],
 *     footage[{group,text,url}],  (tùy chọn) description, date, related[], tags[] }
 * Nếu posts/*.md có cùng youtube_id thì gộp: bài .md góp lời bình, lưu ý, đính chính,
 * hashtag; JSON góp tóm tắt, chương, tài liệu, tư liệu. Link cũ /v/… và /bai-viet/…
 * của bài .md chuyển hẳn (301) sang /video/<slug>/.
 * ------------------------------------------------------------------- */
const VIDEO_SRC = path.join(ROOT, 'content', 'videos');
const VIDEO_OUT = path.join(ROOT, 'video');
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Chương trong JSON: "12:34 Tên" hoặc { time, title } (chấp nhận cả t/start, name). */
function jsonChapters(list) {
  return (list || [])
    .map((c) => (typeof c === 'string' ? c : `${c.time ?? c.t ?? c.start ?? ''} ${c.title ?? c.name ?? ''}`))
    .flatMap((l) => parseChapters(l));
}
/** Danh sách {group, text, url} → HTML, mỗi nhóm một tiêu đề nhỏ, giữ đúng thứ tự xuất hiện. */
function groupedHtml(list, tag) {
  const groups = [];
  for (const it of list || []) {
    const g = String(it.group || '').trim();
    let cur = groups.find((x) => x.g === g);
    if (!cur) groups.push((cur = { g, items: [] }));
    cur.items.push(it);
  }
  return groups
    .map(({ g, items }) => `${g ? `<h3>${esc(g)}</h3>` : ''}<${tag}>${items
      .map((it) => {
        const text = marked.parseInline(String(it.text || '').trim() || it.url || '');
        return `<li>${text}${it.url ? ` <a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 60))}</a>` : ''}</li>`;
      })
      .join('')}</${tag}>`)
    .join('');
}

async function readJsonVideos() {
  let files = [];
  try { files = (await readdir(VIDEO_SRC)).filter((f) => f.endsWith('.json') && !f.startsWith('_')); } catch { return []; }
  const out = [];
  for (const f of files) {
    const d = JSON.parse(await readFile(path.join(VIDEO_SRC, f), 'utf8'));
    const slug = d.slug || f.replace(/\.json$/, '');
    if (slug !== f.replace(/\.json$/, '')) throw new Error(`${f}: slug "${slug}" phải trùng tên file`);
    if (!SLUG_RE.test(slug)) throw new Error(`${f}: slug chỉ gồm chữ thường a-z, số và gạch ngang`);
    if (!d.youtube_id || !d.title) throw new Error(`${f}: thiếu youtube_id hoặc title`);
    out.push({ ...d, slug });
  }
  return out;
}

async function main() {
  try { CFG = JSON.parse(await readFile(path.join(ROOT, 'data', 'config.json'), 'utf8')); } catch {}
  try { MANG = JSON.parse(await readFile(path.join(ROOT, 'data', 'mang-tri-thuc.json'), 'utf8')); } catch {}
  try { for (const v of JSON.parse(await readFile(path.join(ROOT, 'data', 'tat-ca-video.json'), 'utf8'))) TITLES[v.id] = v.title; } catch {}
  try {
    const dv = await readFile(path.join(ROOT, 'do-vui', 'index.html'), 'utf8');
    for (const m of dv.matchAll(/'([\w-]{11})'\],?\s*$/gm)) DOVUI[m[1]] = (DOVUI[m[1]] || 0) + 1;
  } catch {}

  // 1. Bài Markdown (posts/)
  let files = [];
  try { files = (await readdir(SRC)).filter((f) => f.endsWith('.md') && !f.startsWith('_')); } catch {}
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const mdPosts = [];
  for (const f of files) {
    const raw = await readFile(path.join(SRC, f), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    if (data.draft === true) continue;
    if (!data.title || !data.date) { console.warn(`Bỏ qua ${f}: thiếu title hoặc date.`); continue; }
    const slug = f.replace(/\.md$/, '');
    let rest = body, chapText, fixText, luuY, hinhAnh, tomTat, nguon, nguonChinh;
    [chapText, rest] = takeSection(rest, ['Chương', 'Mục lục']);
    [fixText, rest] = takeSection(rest, ['Đính chính']);
    [luuY, rest] = takeSection(rest, ['Lưu ý']);
    [hinhAnh, rest] = takeSection(rest, ['Hình ảnh, video, âm thanh', 'Hình ảnh']);
    [tomTat, rest] = takeSection(rest, ['Tóm tắt']);
    [nguonChinh, rest] = takeSection(rest, ['Nguồn chính']);
    [nguon, rest] = takeSection(rest, ['Nguồn tham khảo', 'Tài liệu tham khảo']);
    mdPosts.push({
      slug, short: data.link || slug, alias: list(data.alias), lienQuan: list(data['lien-quan']), legacy: [],
      title: data.title, description: data.description || '', hook: data.hook || data.description || '',
      date: String(data.date).slice(0, 10), video: data.video || '', tags: list(data.tags), hashtags: list(data.hashtags),
      chapters: parseChapters(chapText), fix: fixText ? marked.parse(fixText) : '',
      luuY, hinhAnh, nguon, nguonChinh,
      luuYHtml: luuY ? marked.parse(luuY) : '', hinhAnhHtml: hinhAnh ? marked.parse(hinhAnh) : '',
      tomTatHtml: tomTat ? marked.parse(tomTat) : '', nguonHtml: nguon ? marked.parse(nguon) : '',
      html: marked.parse(rest), minutes: readingMinutes(rest), bodyText: rest.trim(),
    });
  }

  // 2. Trang video (content/videos/*.json), gộp với bài .md cùng video
  const jsonVideos = await readJsonVideos();
  const posts = [];
  const usedMd = new Set();
  for (const d of jsonVideos) {
    const md = mdPosts.find((m) => m.video === d.youtube_id);
    if (md) usedMd.add(md);
    const chapters = jsonChapters(d.chapters);
    const refs = d.references || [], foot = d.footage || [];
    const summary = String(d.summary || '').trim();
    posts.push({
      ...(md || { alias: [], lienQuan: [], hashtags: [], tags: [], luuYHtml: '', fix: '', html: '', minutes: 0, bodyText: '', nguonChinh: '' }),
      kind: 'video',
      slug: d.slug,
      short: d.slug,
      url: `/video/${d.slug}/`,
      link: `/video/${d.slug}`,
      legacy: md ? [...new Set([md.short, md.slug, ...md.alias])] : [],
      // Thảo luận cũ (giscus) gắn theo đường dẫn /bai-viet/<tên>/: giữ nguyên để không mất bình luận.
      talk: md ? `bai-viet/${md.slug}/` : `video/${d.slug}`,
      alias: [],
      lienQuan: list(d.related).concat(md ? md.lienQuan : []),
      title: d.title,
      description: d.description || (md && md.description) || summary.split(/\n\s*\n/)[0].slice(0, 200),
      hook: (md && md.hook) || d.description || '',
      date: String(d.date || (md && md.date) || '').slice(0, 10),
      video: d.youtube_id,
      tags: list(d.tags).length ? list(d.tags) : md ? md.tags : [],
      chapters: chapters.length ? chapters : md ? md.chapters : [],
      tomTatHtml: summary ? marked.parse(summary) : md ? md.tomTatHtml : '',
      nguon: refs.length ? '' : md ? md.nguon : '',
      nguonHtml: refs.length ? groupedHtml(refs, 'ol') : md ? md.nguonHtml : '',
      hinhAnh: foot.length ? '' : md ? md.hinhAnh : '',
      hinhAnhHtml: foot.length ? groupedHtml(foot, 'ul') : md ? md.hinhAnhHtml : '',
      footageList: foot,
    });
  }
  for (const m of mdPosts) if (!usedMd.has(m)) posts.push({ ...m, kind: 'post', url: `/bai-viet/${m.slug}/`, link: `/v/${m.short}` });
  posts.sort((a, b) => (b.date || '0').localeCompare(a.date || '0'));

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await rm(VIDEO_OUT, { recursive: true, force: true });

  // 3. Dựng từng trang
  for (const p of posts) {
    const url = SITE + p.url;
    const thumb = p.video ? `https://i.ytimg.com/vi/${p.video}/hqdefault.jpg` : '';
    const player = p.video
      ? `<div class="post-player"><iframe id="player" src="https://www.youtube-nocookie.com/embed/${esc(p.video)}" title="${esc(p.title)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
      : '';
    const jsonld = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': p.kind === 'video' ? 'VideoObject' : 'Article',
      [p.kind === 'video' ? 'name' : 'headline']: p.title,
      description: p.description,
      ...(p.kind === 'video'
        ? { thumbnailUrl: thumb, embedUrl: `https://www.youtube.com/embed/${p.video}`, uploadDate: p.date || undefined, contentUrl: `https://www.youtube.com/watch?v=${p.video}` }
        : { datePublished: p.date, image: thumb || undefined }),
      inLanguage: 'vi',
      author: { '@type': 'Person', name: 'Dương Văn Biên' },
      publisher: { '@type': 'Organization', name: 'Bienac', url: SITE },
      mainEntityOfPage: url,
    });
    const meta = [p.date && fmtDate(p.date), p.minutes && p.bodyText ? `${p.minutes} phút đọc` : '', ...p.tags.map(esc)].filter(Boolean).join(' · ');
    const jumps = [p.nguonHtml && '<a href="#references">Tài liệu tham khảo</a>', p.hinhAnhHtml && '<a href="#footage">Tư liệu</a>'].filter(Boolean).join(' · ');
    const body = `
    <article class="post">
      <a class="post-back" href="/bai-viet/">← Tất cả video</a>
      <header class="post-head">
        ${meta ? `<p class="post-meta">${meta}</p>` : ''}
        <h1 class="post-title">${esc(p.title)}</h1>
      </header>
      ${p.tomTatHtml ? `<section class="post-summary" id="summary"><p class="post-fix-k">Tóm tắt</p>${p.tomTatHtml}</section>` : p.description ? `<p class="post-lede">${esc(p.description)}</p>` : ''}
      ${p.fix ? `<aside class="post-fix"><p class="post-fix-k">Đính chính</p>${p.fix}</aside>` : ''}
      ${player}
      <div id="chapters">${chapterNav(p)}</div>
      <p class="post-short">Link: <a href="${esc(p.link)}">bienac.com${esc(p.link)}</a>${jumps ? ' · ' + jumps : ''}</p>
      ${p.luuYHtml ? `<aside class="post-note"><p class="post-fix-k">Lưu ý</p>${p.luuYHtml}</aside>` : ''}
      ${p.bodyText ? `<div class="post-body">${p.html}</div>` : ''}
      ${p.nguonHtml ? `<section class="post-refs" id="references"><h2>Tài liệu tham khảo</h2>${p.nguonHtml}</section>` : ''}
      ${p.hinhAnhHtml ? `<section class="post-credits post-refs" id="footage"><h2>Hình ảnh, video, âm thanh</h2>${p.hinhAnhHtml}</section>` : ''}
      ${relatedHtml(related(p, posts))}
      ${exploreHtml(p)}
      <section class="post-comments">
        <h2>Thảo luận</h2>
        <div class="giscus"></div>
        <script src="https://giscus.app/client.js" data-repo="bienduong11/bienac" data-repo-id="R_kgDOVVi1CQ" data-category="General" data-category-id="DIC_kwDOVVi1Cc4DJfa2" data-mapping="specific" data-term="${esc(p.talk || `bai-viet/${p.slug}/`)}" data-strict="0" data-reactions-enabled="1" data-emit-metadata="0" data-input-position="top" data-theme="transparent_dark" data-lang="vi" data-loading="lazy" crossorigin="anonymous" async></script>
      </section>
      <footer class="post-cta">
        <p>Trang này đi kèm video trên kênh Bienac. Đăng ký để không lỡ những câu chuyện tiếp theo.</p>
        <a class="btn btn-primary" href="https://www.youtube.com/@bienac?sub_confirmation=1" target="_blank" rel="noopener">Đăng ký kênh</a>
      </footer>
    </article>
    <script type="application/ld+json">${jsonld}</script>${p.chapters.length && p.video ? CHAPTER_JS : ''}`;
    const dir = p.kind === 'video' ? path.join(VIDEO_OUT, p.slug) : path.join(OUT, p.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'mo-ta.txt'), youtubeDescription(p));
    await writeFile(path.join(dir, 'index.html'), page({ title: `${p.title} · Bienac`, description: p.description, url, image: thumb, body, type: p.kind === 'video' ? 'video.other' : 'article' }));
  }

  // 4. Trang danh sách
  const listHtml = posts.length
    ? `<ul class="post-list">${posts
        .map((p) => `
        <li><a class="post-item" href="${p.url}">
          ${p.video ? `<img class="post-item-thumb" src="https://i.ytimg.com/vi/${p.video}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360" />` : ''}
          <div class="post-item-text">
            ${p.date ? `<p class="post-meta">${fmtDate(p.date)}</p>` : ''}
            <h2>${esc(p.title)}</h2>
            ${p.description ? `<p>${esc(p.description)}</p>` : ''}
          </div>
        </a></li>`)
        .join('')}
      </ul>`
    : `<div class="post-empty"><h2>Đang biên soạn</h2><p>Trong lúc chờ, bạn xem video trên kênh nhé.</p><a class="btn btn-ghost" href="/#videos">Xem video</a></div>`;
  await writeFile(path.join(OUT, 'index.html'), page({
    title: 'Bài viết · Bienac',
    image: `${SITE}/assets/og/bai-viet.jpg`,
    description: 'Hồ sơ từng video của Bienac: tóm tắt, chương, tài liệu tham khảo và tư liệu.',
    url: `${SITE}/bai-viet/`,
    body: `
    <section class="blog-intro">
      <h1 class="section-title">Bài <span class="accent">viết</span></h1>
      <p class="section-sub">Mỗi video một trang: tóm tắt, chương, đủ nguồn để bạn tự kiểm chứng.</p>
    </section>
    ${listHtml}`,
  }));

  // 5. Công cụ chép mô tả YouTube (không lên Google)
  const tool = posts.filter((p) => p.video || p.chapters.length);
  const TOOL_OUT = path.join(ROOT, 'cong-cu', 'mo-ta');
  await rm(path.join(ROOT, 'cong-cu'), { recursive: true, force: true });
  await mkdir(TOOL_OUT, { recursive: true });
  await writeFile(path.join(TOOL_OUT, 'index.html'), page({
    title: 'Mô tả YouTube · Bienac', description: 'Công cụ nội bộ.', url: `${SITE}/cong-cu/mo-ta/`, noindex: true,
    body: `
    <section class="blog-intro">
      <h1 class="section-title">Mô tả <span class="accent">YouTube</span></h1>
      <p class="section-sub">Dựng tự động. Bấm “Sao chép” rồi dán vào ô mô tả trên YouTube Studio.</p>
    </section>
    ${tool.map((p) => `
    <section class="tool-item">
      <div class="tool-head"><h2>${esc(p.title)}</h2><button class="btn btn-ghost" type="button" data-copy>Sao chép</button></div>
      <textarea readonly rows="10">${esc(youtubeDescription(p))}</textarea>
    </section>`).join('')}
    <script>
      document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
        const t = b.closest('.tool-item').querySelector('textarea');
        try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
        b.textContent = 'Đã chép ✓'; setTimeout(() => (b.textContent = 'Sao chép'), 1600);
      }));
    </script>`,
  }));

  // 6. Chuyển hướng (Cloudflare Pages đọc _redirects ở thư mục gốc)
  const yt = (CFG.channelUrl || 'https://www.youtube.com/@bienac').replace(/\/$/, '');
  const redirects = [
    `/dk ${yt}?sub_confirmation=1 302`,
    `/yt ${yt} 302`,
    `/goi-y /#request 302`,
    `/ung-ho /support/ 301`,
    `/ung-ho/ /support/ 301`,
    `/donate /support/ 301`,
    `/v /bai-viet/ 302`,
    `/video /bai-viet/ 302`,
    `/video/ /bai-viet/ 302`,
  ];
  for (const p of posts) {
    if (p.kind === 'video') {
      for (const k of p.legacy) redirects.push(`/v/${k} ${p.url} 301`);
      const mdSlug = p.talk.startsWith('bai-viet/') ? p.talk.split('/')[1] : '';
      if (mdSlug) redirects.push(`/bai-viet/${mdSlug}/ ${p.url} 301`, `/bai-viet/${mdSlug} ${p.url} 301`);
    } else {
      redirects.push(`/v/${p.short} ${p.url} 302`);
      if (p.short !== p.slug) redirects.push(`/v/${p.slug} ${p.url} 302`);
      for (const a of p.alias) if (a !== p.short && a !== p.slug) redirects.push(`/v/${a} ${p.url} 302`);
    }
  }
  // Mỗi đường dẫn chỉ được trỏ một chỗ, và không được đè lên trang thật đang có.
  const seen = new Map();
  for (const r of redirects) {
    const [from, to] = r.split(' ');
    if (seen.has(from) && seen.get(from) !== to) throw new Error(`Đường dẫn ${from} bị trùng: ${seen.get(from)} và ${to}`);
    seen.set(from, to);
  }
  for (const p of posts) if (p.kind === 'video' && seen.has(p.url)) throw new Error(`${p.url} vừa là trang vừa là chuyển hướng`);
  await writeFile(path.join(ROOT, '_redirects'), [...new Set(redirects)].join('\n') + '\n');

  // 7. Dữ liệu cho ô tìm kiếm, Mạng tri thức
  await writeFile(path.join(OUT, 'muc-luc.json'), JSON.stringify(posts.map((p) => ({ slug: p.slug, url: p.url, title: p.title, description: p.description, video: p.video }))));
  await writeFile(path.join(OUT, 'ho-so.json'), JSON.stringify(Object.fromEntries(posts.filter((p) => p.video).map((p) => [p.video, p.url]))));

  // 8. Sitemap
  const urls = ['/', '/elements.html', '/phenomena.html', '/thegioi/index.html', '/thang-vu-tru/', '/dong-thoi-gian/', '/mang-tri-thuc/', '/chiet-tu/', '/bau-troi/', '/support/', '/moi-giay/', '/do-vui/', '/lich-vu-tru/', '/he-mat-troi/', '/hanh-tinh/', '/pho-anh-sang/', '/hai-khe/', '/phong-xa/', '/su-song/', '/dan-chim/', '/canh-buom/', '/galton/', '/am-lich/', '/kinh-dich/', '/he-dem/', '/ngon-lua/', '/tron-mau/', '/con-lac/', '/bat-dau/', '/bai-viet/', ...posts.map((p) => p.url)];
  await writeFile(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);

  console.log(`Đã dựng ${posts.filter((p) => p.kind === 'video').length} trang video, ${posts.filter((p) => p.kind === 'post').length} bài cũ, ${redirects.length} chuyển hướng.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
