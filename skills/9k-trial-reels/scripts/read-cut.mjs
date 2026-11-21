// node <skill>/scripts/read-cut.mjs [hf/cut-review/index.html] [out=work/keep.json]     (run in the project root)
// Reads the cut he edited in Studio back into a keep list: every visible raw.mp4 clip, in timeline order, as
// [rawIn, rawOut], snapped to the source frame grid. Gaps between clips are CLOSED (that is the rule: a gap he left
// is not a pause he wants). Labels he deleted don't matter. Prints what changed against the previous keep, with the
// words that were cut, and keeps the previous list as work/keep.prev.json.
import fs from 'node:fs';

const idx = process.argv[2] || 'hf/cut-review/index.html';
const out = process.argv[3] || 'work/keep.json';
const html = fs.readFileSync(idx, 'utf8');
const probe = fs.existsSync('work/probe.json') ? JSON.parse(fs.readFileSync('work/probe.json', 'utf8')) : {};
const FPS = probe.fps || 30;
const snap = (t) => Math.round(t * FPS) / FPS;
const r3 = (x) => Math.round(x * 1000) / 1000;
const words = fs.existsSync('work/words.json') ? JSON.parse(fs.readFileSync('work/words.json', 'utf8')) : [];

const clips = [];
for (const m of html.matchAll(/<video\b[^>]*>/g)) {
  const tag = m[0];
  if (!/src="assets\/raw\.mp4"/.test(tag) || /\bdata-hidden\b/.test(tag)) continue;
  const g = (k) => { const x = tag.match(new RegExp(`${k}="([^"]*)"`)); return x ? +x[1] : NaN; };
  const s = g('data-start'), d = g('data-duration'), ms = g('data-media-start') || 0, rate = g('data-playback-rate') || 1;
  if (!(d > 0)) continue;
  if (rate !== 1) console.warn(`⚠ clip at ${s}s has playback-rate ${rate}: the voice must stay at 1x, using its source range anyway`);
  clips.push({ s, a: snap(ms), b: snap(ms + d * rate) });
}
clips.sort((x, y) => x.s - y.s);
const keep = [];
for (const { a, b } of clips) { const l = keep.at(-1); if (l && Math.abs(l[1] - a) < 0.5 / FPS) l[1] = b; else if (b - a > 0.5 / FPS) keep.push([a, b]); }
const len = (k) => k.reduce((t, [a, b]) => t + b - a, 0);
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
if (prev) {
  // source ranges kept before but not now = what he removed; and the reverse = what he brought back
  const minus = (A, B) => A.flatMap(([a, b]) => { let parts = [[a, b]]; for (const [c, d] of B) parts = parts.flatMap(([x, y]) => (d <= x || c >= y ? [[x, y]] : [c > x ? [x, c] : null, d < y ? [d, y] : null].filter(Boolean))); return parts; }).filter(([a, b]) => b - a > 0.05);
  const said = (a, b) => words.filter((w) => w.s < b - 0.03 && w.e > a + 0.03).map((w) => w.w).join(' ');
  for (const [a, b] of minus(prev, keep)) console.log(`  − raw ${fmt(a)}–${fmt(b)} (${(b - a).toFixed(2)}s) ${said(a, b)}`);
  for (const [a, b] of minus(keep, prev)) console.log(`  + raw ${fmt(a)}–${fmt(b)} (${(b - a).toFixed(2)}s) ${said(a, b)}`);
  if (JSON.stringify(prev) !== JSON.stringify(keep.map(([a, b]) => [r3(a), r3(b)]))) fs.writeFileSync(out.replace(/\.json$/, '.prev.json'), JSON.stringify(prev));
}
fs.writeFileSync(out, JSON.stringify(keep.map(([a, b]) => [r3(a), r3(b)])));
console.log(`${out}: ${keep.length} pieces · ${len(keep).toFixed(2)}s${prev ? ` (was ${prev.length} · ${len(prev).toFixed(2)}s)` : ''} · gaps closed`);
