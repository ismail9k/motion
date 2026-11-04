// HDR sources (iPhone HLG / Dolby Vision, PQ): keep the picture 10-bit end to end and bring the sRGB overlay into the
// same signal, so the footage keeps its look and the 9k colours land where they should.
//   kind(file)          → 'hlg' | 'pq' | null   (from the stream's transfer tag)
//   writeLut(path, kind) → a .cube that maps sRGB graphics to BT.2020 HLG / PQ, SDR white = 203 cd/m² (ITU-R BT.2408)
//   tags(kind)          → ffmpeg output colour tags
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export function kind(file) {
  let t = '';
  try { t = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_transfer', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' }).split('\n')[0].trim(); } catch { return null; }
  return t === 'arib-std-b67' ? 'hlg' : t === 'smpte2084' ? 'pq' : null;
}

const srgb = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const M = [[0.6274, 0.3293, 0.0433], [0.0691, 0.9195, 0.0114], [0.0164, 0.088, 0.8956]]; // BT.709 → BT.2020 primaries
const hlgOetf = (e) => { const a = 0.17883277, b = 0.28466892, c = 0.55991073; return e <= 1 / 12 ? Math.sqrt(3 * e) : a * Math.log(12 * e - b) + c; };
const pqOetf = (l) => { const m1 = 0.1593017578125, m2 = 78.84375, c1 = 0.8359375, c2 = 18.8515625, c3 = 18.6875, y = l ** m1; return ((c1 + c2 * y) / (1 + c3 * y)) ** m2; };

function map(r, g, b, k) {
  const l = [srgb(r), srgb(g), srgb(b)];
  const w = M.map((row) => Math.max(0, row[0] * l[0] + row[1] * l[1] + row[2] * l[2]));
  if (k === 'pq') return w.map((x) => pqOetf((x * 203) / 10000));
  // HLG on a 1000 cd/m² display (system gamma 1.2): display light → scene light → OETF. 203 cd/m² lands at 75 % signal.
  const fd = w.map((x) => x * 0.203), yd = 0.2627 * fd[0] + 0.678 * fd[1] + 0.0593 * fd[2];
  const s = yd > 0 ? yd ** ((1 - 1.2) / 1.2) : 0;
  return fd.map((x) => hlgOetf(x * s));
}

export function writeLut(path, k, n = 33) {
  const out = [`TITLE "9k sRGB → ${k}"`, `LUT_3D_SIZE ${n}`];
  for (let bi = 0; bi < n; bi++) for (let gi = 0; gi < n; gi++) for (let ri = 0; ri < n; ri++)
    out.push(map(ri / (n - 1), gi / (n - 1), bi / (n - 1), k).map((v) => Math.min(1, v).toFixed(6)).join(' '));
  writeFileSync(path, out.join('\n') + '\n');
}

export const tags = (k) => ['-color_primaries', 'bt2020', '-color_trc', k === 'pq' ? 'smpte2084' : 'arib-std-b67', '-colorspace', 'bt2020nc', '-color_range', 'tv'];
