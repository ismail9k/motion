// node <skill>/scripts/cut-review.mjs [keep=work/keep.json]        (run in the project root)
// Gate 1. Builds hf/cut-review: the voiceover cut ALONE, one clip per kept piece of the raw take, each with a label
// (piece number, raw range, the words it keeps, what was cut before it). He opens it in Studio, drags clip edges,
// deletes pieces, and that edited index.html becomes the cut (read it back with read-cut.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'hf/cut-review');
const W = 1080, H = 1920;
const r3 = (x) => Math.round(x * 1000) / 1000;
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);

const keepFile = process.argv[2] || 'work/keep.json';
const keep = readJson(keepFile);
if (!keep) throw new Error(`no ${keepFile}: run 9k-montage's ingest.mjs + cut.mjs first`);
const cfg = readJson('montage.json');
const words = readJson('work/words.json', []);
const drops = readJson('edit.json', {}).cut?.drop || [];

// a 1080×1920 proxy of the RAW take (review only; the voiceover is later re-cut from the original)
fs.mkdirSync(path.join(OUT, 'assets/fonts'), { recursive: true });
const raw = path.join(OUT, 'assets/raw.mp4');
if (!fs.existsSync(raw)) {
  console.log('making the raw proxy…');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', cfg.source, '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:-1:-1,fps=30`, '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', raw], { stdio: 'inherit' });
}
// fonts from the montage project's @fontsource packages
const FONTS = [['ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-arabic-600-normal.woff2'], ['ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-latin-600-normal.woff2'], ['ibm-plex-mono', 'ibm-plex-mono-latin-700-normal.woff2']];
for (const [pkg, f] of FONTS) { const s = path.join(ROOT, 'node_modules/@fontsource', pkg, 'files', f); if (fs.existsSync(s)) fs.copyFileSync(s, path.join(OUT, 'assets/fonts', f)); }

const vids = [], labels = [];
let T = 0;
keep.forEach(([a, b], i) => {
  const d = r3(b - a);
  vids.push(`<video id="seg${i + 1}" class="clip" src="assets/raw.mp4" playsinline data-has-audio="true" data-start="${r3(T)}" data-duration="${d}" data-media-start="${r3(a)}" data-track-index="0"></video>`);
  const said = words.filter((w) => w.s < b - 0.05 && w.e > a + 0.05).map((w) => w.w).join(' ');
  const prevEnd = i ? keep[i - 1][1] : 0, gap = r3(a - prevEnd);
  const why = drops.filter(([s, e]) => s < a && e > prevEnd).map((x) => x[2]).filter(Boolean);
  const cutLine = i === 0 ? (a > 0.3 ? `✂ ${a.toFixed(1)}s cut from the start` : '') : gap > 0.05 ? `✂ ${gap.toFixed(1)}s cut${why.length ? ': ' + why.join(' · ') : ' (pause)'}` : '';
  labels.push(`<div id="lab${i + 1}" class="clip lab ${i % 2 ? 'odd' : ''}" data-start="${r3(T)}" data-duration="${d}" data-track-index="1">
    <div class="hd"><span class="n">#${String(i + 1).padStart(2, '0')}</span><span class="src">raw ${mmss(a)} → ${mmss(b)} · ${d.toFixed(1)}s</span></div>
    ${cutLine ? `<div class="cut">${esc(cutLine)}</div>` : ''}
    <div class="said">${esc(said)}</div>
  </div>`);
  T += b - a;
});
const TOTAL = r3(T);

fs.writeFileSync(path.join(OUT, 'hyperframes.json'), JSON.stringify({ $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', paths: { assets: 'assets' }, media: { autoProxy: true } }, null, 2));
fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify({ name: 'cut-review', private: true, type: 'module', scripts: { dev: 'npx --yes hyperframes@latest preview' } }, null, 2));
const face = (fam, file, w) => `@font-face{font-family:"${fam}";src:url("assets/fonts/${file}") format("woff2");font-weight:${w};font-display:block}`;
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html>
<html lang="ar" data-resolution="portrait">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
${face('IBM Plex Sans Arabic', FONTS[0][1], 600)}
${face('IBM Plex Sans Arabic', FONTS[1][1], 600)}
${face('IBM Plex Mono', FONTS[2][1], 700)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0F0F0F}
#root{position:relative;width:100%;height:100%;overflow:hidden;background:#0F0F0F}
#root video{position:absolute;left:0;top:0;width:${W}px;height:${H}px;object-fit:cover}
.lab{position:absolute;left:60px;right:60px;top:300px;padding:24px 30px;border-radius:24px;background:rgba(15,15,15,.86);border:3px solid #2FB161;color:#F5F5F5;display:flex;flex-direction:column;gap:12px}
.lab.odd{border-color:#E85A02}
.lab .hd{display:flex;justify-content:space-between;align-items:baseline;direction:ltr;font:700 34px/1.2 "IBM Plex Mono",monospace}
.lab .n{font-size:48px}
.lab .src{color:#999999;font-size:30px}
.lab .cut{direction:ltr;font:700 28px/1.3 "IBM Plex Mono","IBM Plex Sans Arabic",monospace;color:#F4C871;unicode-bidi:plaintext}
.lab .said{direction:rtl;text-align:right;font:600 40px/1.45 "IBM Plex Sans Arabic",sans-serif}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="${W}" data-height="${H}" data-duration="${TOTAL}">
 ${vids.join('\n ')}
 ${labels.join('\n ')}
</div>
<script>
const tl=gsap.timeline({paused:true});
window.__timelines["main"]=tl;
</script>
</body>
</html>
`);
console.log(`hf/cut-review: ${keep.length} pieces · ${TOTAL}s. Open it: cd hf/cut-review && npx --yes hyperframes@latest preview`);
