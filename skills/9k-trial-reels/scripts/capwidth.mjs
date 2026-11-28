// Every Arabic caption chunk must fit on ONE line (he asked, Nov 2026). Measures each chunk of each version's
// captions at its real font and size, and fails when the widest is wider than the stack.
//   node <skill>/scripts/capwidth.mjs          (project root; reads hf/<V>/compositions/cap<V>.html)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const { chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright'); // the montage project's playwright
const MAX = 932; // 1080 − 2×60 stack inset, less the 34 px padding each side of the dark caption panel
const chunks = new Map();
for (const v of ['A', 'B', 'C']) {
  const f = `hf/${v}/compositions/cap${v}.html`; if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  const size = +(html.match(/\.ar\{[^}]*font:700 (\d+)px/) || [])[1];
  for (const c of JSON.parse(html.match(/const AR=(.*);\n/)[1])) chunks.set(c.w.map((w) => w[0]).join(' '), { v, t: c.s, size, k: c.w.map((w) => w[2]) });
}
const font = (n) => 'file://' + path.resolve('hf/shared/assets/fonts', n);
const b = await chromium.launch(); const p = await b.newPage();
await p.setContent(`<style>
@font-face{font-family:A;font-weight:700;src:url(${font('ibm-plex-sans-arabic-arabic-700-normal.woff2')});unicode-range:U+0600-06FF,U+FB50-FDFF,U+FE70-FEFC,U+200C-200E}
@font-face{font-family:A;font-weight:700;src:url(${font('ibm-plex-sans-arabic-latin-700-normal.woff2')});unicode-range:U+0000-00FF,U+2000-206F}
.ar{display:inline-flex;white-space:nowrap;gap:0 .26em;direction:rtl;font-weight:700;font-family:A}.ar .k{padding:0 .2em}</style><div id="x"></div>`);
const res = await p.evaluate(async (list) => {
  await document.fonts.load('700 52px A', 'ا'); await document.fonts.ready;
  const x = document.getElementById('x');
  return list.map(([txt, m]) => {
    x.innerHTML = `<div class="ar" style="font-size:${m.size}px">` + txt.split(' ').map((w, i) => `<span class="${m.k[i] ? 'k' : ''}">${w}</span>`).join('') + '</div>';
    return { w: Math.round(x.firstChild.getBoundingClientRect().width), txt, ...m };
  });
}, [...chunks.entries()]);
await b.close();
res.sort((a, c) => c.w - a.w);
for (const r of res.slice(0, 5)) console.log(`${r.w}px  ${r.v} @${r.t}s  ${r.txt}`);
const over = res.filter((r) => r.w > MAX);
if (over.length) { console.log(`✗ ${over.length} chunk(s) wider than ${MAX}px: shorten the line in VO or split it`); process.exit(1); }
console.log(`✓ all ${res.length} chunks fit on one line (widest ${res[0].w}px ≤ ${MAX}px)`);
