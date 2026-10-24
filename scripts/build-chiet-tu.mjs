#!/usr/bin/env node
/* =====================================================================
 * Dựng dữ liệu cho ứng dụng Chiết tự (chiet-tu/du-lieu.json).
 * Chỉ cần chạy lại khi muốn cập nhật nguồn; file kết quả được lưu trong repo.
 *
 *   1. Tải ba nguồn về một thư mục:
 *        https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt
 *        https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip  (giải nén)
 *        https://kaikki.org/dictionary/Vietnamese/kaikki.org-dictionary-Vietnamese.jsonl
 *   2. node scripts/build-chiet-tu.mjs <thư-mục-đó>
 *
 * Nguồn:
 *   - Âm Hán Việt và từ ghép: Wiktionary qua kaikki.org (CC BY-SA 4.0)
 *   - Âm đọc dự phòng, pinyin, số nét, nghĩa tiếng Anh: Unicode Unihan (giấy phép Unicode)
 *   - Cấu tạo chữ (IDS): CJKVI IDS, dựa trên CHISE (GPL v2)
 * ===================================================================== */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2];
if (!SRC) { console.error('Cần đường dẫn thư mục chứa ids.txt và Unihan_*.txt'); process.exit(1); }

const uni = {};   // ký tự → { kVietnamese, kMandarin, kTotalStrokes, kDefinition }
const WANT = new Set(['kVietnamese', 'kMandarin', 'kTotalStrokes', 'kDefinition']);
for (const f of ['Unihan_Readings.txt', 'Unihan_IRGSources.txt', 'Unihan_DictionaryLikeData.txt']) {
  let txt;
  try { txt = await readFile(path.join(SRC, f), 'utf8'); } catch { continue; }
  for (const line of txt.split('\n')) {
    if (!line.startsWith('U+')) continue;
    const [cp, key, val] = line.split('\t');
    if (!WANT.has(key)) continue;
    const ch = String.fromCodePoint(parseInt(cp.slice(2), 16));
    (uni[ch] = uni[ch] || {})[key] = val;
  }
}

// IDS: lấy cách tách đầu tiên, bỏ nhãn vùng [GTJKV…]
const ids = {};
for (const line of (await readFile(path.join(SRC, 'ids.txt'), 'utf8')).split('\n')) {
  if (!line.startsWith('U+')) continue;
  const [, ch, first] = line.split('\t');
  if (!first) continue;
  const seq = first.replace(/\[[^\]]*\]/g, '').replace(/^\^|\$$/g, '');
  if (seq && seq !== ch) ids[ch] = seq;
}

// Wiktionary: âm Hán Việt (thẻ han-viet-reading hoặc "chữ Hán form of X") và từ ghép
const wk = {};
function walk(o, acc) {
  if (Array.isArray(o)) o.forEach((v) => walk(v, acc));
  else if (o && typeof o === 'object') {
    if (o.word && (o.tags || []).includes('han-viet-reading')) acc.push(o.word.toLowerCase());
    Object.values(o).forEach((v) => walk(v, acc));
  }
}
const rl = readline.createInterface({ input: createReadStream(path.join(SRC, 'kaikki.org-dictionary-Vietnamese.jsonl')) });
for await (const line of rl) {
  if (!line.includes('"pos": "character"')) continue;
  const d = JSON.parse(line);
  const hv = [], words = [];
  walk(d, hv);
  for (const s of d.senses || []) {
    for (const g of s.glosses || []) {
      const m = g.match(/^chữ Hán form of (\S+)/);
      if (m) hv.push(m[1].toLowerCase());
    }
    for (const r of s.derived || []) if (r.word && r.roman && [...r.word].length <= 4) words.push([r.word, r.roman]);
  }
  for (const r of d.derived || []) if (r.word && r.roman && [...r.word].length <= 4) words.push([r.word, r.roman]);
  if (!hv.length && !words.length) continue;
  const e = (wk[d.word] = wk[d.word] || { hv: [], w: [] });
  for (const h of hv) if (!e.hv.includes(h)) e.hv.push(h);
  for (const w of words) if (!e.w.some((x) => x[0] === w[0])) e.w.push(w);
}

const IDC = /[⿰-⿿㇯]/u;
const parts = (seq) => [...seq].filter((c) => !IDC.test(c) && !/[①-⑳]/.test(c));

// Tập ký tự: mọi chữ có âm Hán Việt, cộng đệ quy các bộ phận cấu thành
const keep = new Set([...Object.keys(uni).filter((c) => uni[c].kVietnamese), ...Object.keys(wk).filter((c) => wk[c].hv.length)]);
const stack = [...keep];
while (stack.length) {
  const c = stack.pop();
  for (const p of parts(ids[c] || '')) if (!keep.has(p)) { keep.add(p); stack.push(p); }
}

const out = {};
for (const c of keep) {
  const u = uni[c] || {};
  const def = (u.kDefinition || '').split(/;\s*/).slice(0, 3).join('; ');
  const w = wk[c];
  // [âm Hán Việt (Wiktionary), âm đọc Unihan, pinyin, số nét, nghĩa tiếng Anh, cấu tạo, từ ghép]
  out[c] = [
    w && w.hv.length ? w.hv.join(' ') : '',
    (u.kVietnamese || '').replace(/\s+/g, ' ').trim(),
    (u.kMandarin || '').split(' ')[0],
    Number((u.kTotalStrokes || '').split(' ')[0]) || 0,
    def.length > 90 ? def.slice(0, 88) + '…' : def,
    ids[c] || '',
    w ? w.w.slice(0, 8).map(([h, r]) => h + '|' + r).join(',') : '',
  ];
}

await mkdir(path.join(ROOT, 'chiet-tu'), { recursive: true });
await writeFile(path.join(ROOT, 'chiet-tu', 'du-lieu.json'), JSON.stringify(out));
console.log(`Đã ghi ${Object.keys(out).length} chữ (${Object.values(out).filter((r) => r[0]).length} chữ có âm Hán Việt từ Wiktionary).`);
