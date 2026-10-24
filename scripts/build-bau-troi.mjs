#!/usr/bin/env node
/* =====================================================================
 * Dựng dữ liệu cho ứng dụng Bầu trời Đông Tây (bau-troi/du-lieu.json).
 * Chỉ cần chạy lại khi muốn cập nhật; file kết quả được lưu trong repo.
 *
 *   npm pack d3-celestial@0.7.35 && tar xzf d3-celestial-0.7.35.tgz
 *   node scripts/build-bau-troi.mjs package/data
 *
 * Nguồn: d3-celestial của Olaf Frohn (giấy phép BSD-3), gồm danh mục sao
 * Hipparcos, đường nối 88 chòm sao IAU và các tinh quan Trung Hoa cổ.
 * ===================================================================== */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2];
if (!SRC) { console.error('Cần đường dẫn thư mục data của d3-celestial'); process.exit(1); }
const load = async (f) => JSON.parse(await readFile(path.join(SRC, f), 'utf8'));

const r2 = (x) => Math.round(x * 100) / 100;
const ra = (lon) => r2(lon < 0 ? lon + 360 : lon);       // kinh độ [-180,180] → xích kinh [0,360)
const pt = ([lon, lat]) => [ra(lon), r2(lat)];

const stars = (await load('stars.6.json')).features
  .filter((f) => f.properties.mag <= 5.8)
  .map((f) => [...pt(f.geometry.coordinates), Math.round(f.properties.mag * 10) / 10, Math.round((parseFloat(f.properties.bv) || 0.6) * 10) / 10]);

async function group(namesFile, linesFile, pick) {
  const names = (await load(namesFile)).features;
  const lines = Object.fromEntries((await load(linesFile)).features.map((f) => [f.id, f.geometry.coordinates]));
  const seen = new Set();
  return names
    .filter((f) => { const k = f.id + '|' + f.properties.name; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((f) => ({ ...pick(f), c: pt(f.geometry.coordinates), l: (lines[f.id] || []).map((seg) => seg.map(pt)) }));
}

const west = await group('constellations.json', 'constellations.lines.json', (f) => ({ id: f.id, n: f.properties.name, r: Number(f.properties.rank) }));
const east = await group('constellations.cn.json', 'constellations.lines.cn.json', (f) => ({ n: f.properties.name, en: f.properties.en, r: Number(f.properties.rank) }));

await mkdir(path.join(ROOT, 'bau-troi'), { recursive: true });
await writeFile(path.join(ROOT, 'bau-troi', 'du-lieu.json'), JSON.stringify({ s: stars, w: west, e: east }));
console.log(`Đã ghi ${stars.length} sao, ${west.length} chòm phương Tây, ${east.length} tinh quan phương Đông.`);
