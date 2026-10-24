#!/usr/bin/env node
/* =====================================================================
 * Lấy danh sách video THƯỜNG mới nhất của kênh từ tab /videos của YouTube
 * và ghi vào data/videos.json (chạy trong CI, không cần API key).
 *
 * Vì sao không dùng RSS feed?
 *   RSS (videos.xml) chỉ trả tối đa 15 mục mới nhất và TRỘN cả Short lẫn
 *   video thường — nếu kênh up nhiều Short thì video thường bị đẩy ra ngoài.
 *   Tab /videos của kênh chỉ liệt kê video thường (Short nằm ở tab /shorts
 *   riêng) và cho nhiều video hơn → lọc Short một cách tự nhiên.
 *
 * Cách dùng:  node scripts/fetch-videos.mjs
 *
 * Đọc data/config.json:
 *   - channelId  : id kênh dạng UC... (nếu để trống sẽ tự tìm từ channelUrl)
 *   - channelUrl : link kênh, vd https://www.youtube.com/@bienac
 *   - maxVideos  : số video tối đa ghi ra
 * ===================================================================== */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'data', 'config.json');
const OUT_PATH = path.join(ROOT, 'data', 'videos.json');
const ALL_PATH = path.join(ROOT, 'data', 'tat-ca-video.json');

// Dùng UA trình duyệt thật để YouTube trả về trang có ytInitialData đầy đủ.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, 'accept-language': 'vi,en;q=0.8' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${url}`);
  return res.text();
}

/** Tìm channelId (UC...) từ trang kênh khi config chưa điền sẵn. */
async function resolveChannelId(channelUrl) {
  const html = await fetchText(channelUrl);
  const m =
    html.match(/"channelId"\s*:\s*"(UC[\w-]+)"/) ||
    html.match(/channel_id=(UC[\w-]+)/) ||
    html.match(/"externalId"\s*:\s*"(UC[\w-]+)"/);
  if (!m) throw new Error(`Không tìm thấy channelId trong ${channelUrl}`);
  return m[1];
}

/** Trích object JSON `var ytInitialData = {...};` nhúng trong trang kênh. */
function extractInitialData(html) {
  const m =
    html.match(/var ytInitialData\s*=\s*(\{.*?\});<\/script>/s) ||
    html.match(/ytInitialData"\]\s*=\s*(\{.*?\});<\/script>/s);
  if (!m) throw new Error('Không tìm thấy ytInitialData trong trang /videos.');
  return JSON.parse(m[1]);
}

/** Duyệt đệ quy, gom mọi object nằm dưới khoá `key`. */
function collect(node, key, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, key, out);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === key) out.push(v);
      collect(v, key, out);
    }
  }
  return out;
}

/**
 * Lấy danh sách video thường từ tab /videos.
 * YouTube hiện render mỗi video bằng `lockupViewModel`:
 *   - contentId                              → videoId
 *   - lockupMetadataViewModel.title.content  → tiêu đề
 */
function parseVideosTab(html) {
  const data = extractInitialData(html);
  const videos = [];
  const seen = new Set();
  for (const lv of collect(data, 'lockupViewModel')) {
    const id = lv?.contentId;
    // videoId hợp lệ dài 11 ký tự; bỏ qua playlist / mục khác.
    if (!id || id.length !== 11 || seen.has(id)) continue;
    const meta = collect(lv, 'lockupMetadataViewModel')[0];
    const title = meta?.title?.content;
    if (!title) continue;
    seen.add(id);
    videos.push({ id, title });
  }
  return videos;
}

async function main() {
  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));

  if (config.autoFetchVideos === false) {
    console.log('autoFetchVideos = false trong data/config.json — bỏ qua.');
    return;
  }

  let channelId = config.channelId;
  if (!channelId) {
    console.log(`channelId trống — đang tìm từ ${config.channelUrl}...`);
    channelId = await resolveChannelId(config.channelUrl);
    console.log(`Tìm thấy channelId: ${channelId}`);
  }

  const videosUrl = `https://www.youtube.com/channel/${channelId}/videos`;
  console.log(`Đang tải tab video: ${videosUrl}`);
  const html = await fetchText(videosUrl);

  const max = Number(config.maxVideos) > 0 ? Number(config.maxVideos) : 6;
  const all = parseVideosTab(html);
  const videos = all.slice(0, max);
  if (!videos.length) throw new Error('Không lấy được video thường nào từ tab /videos.');

  await writeFile(OUT_PATH, JSON.stringify(videos, null, 2) + '\n', 'utf8');
  console.log(`Đã ghi ${videos.length} video vào data/videos.json`);

  // Toàn bộ video thấy được ở tab /videos (dùng cho Mạng tri thức)
  await writeFile(ALL_PATH, JSON.stringify(all, null, 2) + '\n', 'utf8');
  console.log(`Đã ghi ${all.length} video vào data/tat-ca-video.json`);
}

main().catch((err) => {
  console.error(`Lỗi: ${err.message}`);
  process.exit(1);
});
