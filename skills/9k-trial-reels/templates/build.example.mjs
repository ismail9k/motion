// EXAMPLE generator from a real film (Shark Tank Egypt × Generative AI vs Operations Research, Nov 2026).
// Copy to <project>/hf/build.mjs and rewrite VO, CL, CLIPS, B, S (scenes) and VARIANTS for the new film; keep the
// machinery (cut remap + warp, sceneFile, captions, layout, asset relink). See references/build.md.
// Generates three HyperFrames projects (A, B, C) for the "أنهي AI؟" short from one spec.
// Layout: show / picture scenes in the top panel (1080x608), Ismail in the bottom panel, bilingual captions.
// node build.mjs  → hf/A, hf/B, hf/C (index.html + compositions/ + assets hard-linked from shared/)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SH = path.join(HERE, 'shared');
const W = 1080, H = 1920, TOP = 608, PY = 0, BY = PY + TOP, VOY = -204, MY = (1920 - 608) / 2; // MY: centred show clip y (variant.center) // PY: top panel y; BY: bottom panel y // VOY: where his 1080x1920 frame sits inside the bottom panel
const r3 = (x) => Math.round(x * 1000) / 1000;
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();

// ---------- source facts ----------
// The cut. KEEP (work/keep.json) is the approved cut; assets/vo.mp4 is built from it (recut.mjs).
// KEEP_OLD (work/keep.built.json) is the cut this file's times were WRITTEN against (captions, blocks, scene beats):
// freeze it once (cp work/keep.json work/keep.built.json) when you start writing times. If he trims the cut later,
// re-run read-cut.mjs + recut.mjs and rebuild: every time below is remapped onto the new cut through the raw-take
// source time, beats inside removed stretches jump, SFX in them are dropped. Identical files = no remap.
const readKeep = (f) => JSON.parse(fs.readFileSync(path.join(HERE, '../work', f), 'utf8'));
const KEEP = readKeep('keep.json');
const KEEP_OLD = fs.existsSync(path.join(HERE, '../work/keep.built.json')) ? readKeep('keep.built.json') : KEEP;
const edgesOf = (k) => { const e = []; let acc = 0; for (const [a, b] of k) { e.push(acc); acc += b - a; } e.push(acc); return e; };
const OLD_EDGES = edgesOf(KEEP_OLD), EDGES = edgesOf(KEEP).map(r3);
const srcOfOld = (t) => { for (let i = 0; i < KEEP_OLD.length; i++) if (t < OLD_EDGES[i + 1] - 1e-6) return KEEP_OLD[i][0] + Math.max(0, t - OLD_EDGES[i]); return KEEP_OLD.at(-1)[1]; };
const oldOfSrc = (x) => { for (let i = 0; i < KEEP_OLD.length; i++) if (x >= KEEP_OLD[i][0] - 0.02 && x <= KEEP_OLD[i][1] + 0.02) return OLD_EDGES[i] + Math.min(Math.max(0, x - KEEP_OLD[i][0]), KEEP_OLD[i][1] - KEEP_OLD[i][0]); return null; };
// an old-cut range → the pieces of it that survive in the new cut, in new output time
function oldRangeToNew(s, e, withSrc = false) {
  const src = []; for (let i = 0; i < KEEP_OLD.length; i++) { const a = Math.max(s, OLD_EDGES[i]), b = Math.min(e, OLD_EDGES[i + 1]); if (b - a > 1e-4) src.push([KEEP_OLD[i][0] + a - OLD_EDGES[i], KEEP_OLD[i][0] + b - OLD_EDGES[i]]); }
  const out = []; for (const [c, d] of src) KEEP.forEach(([x, y], j) => { const a = Math.max(c, x), b = Math.min(d, y); if (b - a > 1e-4) out.push([EDGES[j] + a - x, EDGES[j] + b - x, a]); });
  out.sort((u, v) => u[0] - v[0]);
  // merge only where both the output AND the source run on: a closed gap touches in output time but jumps in source
  const m = []; for (const iv of out) { const l = m.at(-1); if (l && Math.abs(iv[0] - l[1]) < 1e-3 && Math.abs(iv[2] - (l[2] + l[1] - l[0])) < 0.05) l[1] = iv[1]; else m.push([...iv]); }
  return withSrc ? m.map(([a, b, x]) => [r3(a), r3(b), x]) : m.map(([a, b]) => [r3(a), r3(b)]);
}
const CLIPS = {};
for (const id of ['c1a-700m', 'c1b-ai-easy', 'c2-probabilities', 'c3a-27-quadrillion', 'c4a-600-people', 'c4b-three', 'c5a-by-hand-question', 'c5b-no-hand-code'])
  CLIPS[id.split('-')[0]] = { file: id + '.mp4', d: r3(dur(path.join(SH, 'assets', id + '.mp4'))) };
// show clips brought to ~-19.5 LUFS (his voice averages -21.2): plain gain, measured with ebur128
const CLIP_LUFS = { c1a: -14.8, c1b: -17.3, c2: -18.0, c3a: -16.5, c4a: -15.6, c4b: -12.2, c5a: -13.5, c5b: -12.6 };
const clipGain = (id) => r3(Math.min(1, Math.pow(10, (-19.5 - CLIP_LUFS[id]) / 20)));
const SHOW_RATE = 1.2; // B-roll (show clips) speed, pitch preserved
const LISTEN_D = r3(dur(path.join(SH, 'assets/listen.mp4')));

// ---------- captions: his VO (cut time) ----------
// * = keyword pill (one per line), ~ = keep these words together (shown as a space)
const VO = [
  [0.00, 1.48, 'بس هو أنهي *AI بالظبط؟', 'But which AI, exactly?'],
  [1.48, 3.56, 'لأن دي النقطة اللي ناس كتير بتتلخبط فيها', 'Because this is where a lot of people get confused.'],
  [3.56, 5.74, 'الـAI مش كله *ChatGPT وClaude', "AI isn't all ChatGPT and Claude."],
  [5.74, 8.62, 'أكيد الـAI اللي بيسوق عربيات *ذاتية~القيادة', 'The AI driving self-driving cars'],
  [8.62, 12.36, 'مختلف تمامًا عن الـAI اللي بيعمل الـ*AI~slop اللي مالي الإنترنت', 'is nothing like the AI making the slop all over the internet.'],
  [12.36, 14.76, 'فيه AI بيولّد كلام وصور *وكود', 'There is AI that generates text, images and code…'],
  [14.76, 17.46, 'وفيه تقنيات تانية بتحل مشاكل *رياضية معقدة جدًا', '…and other techniques that solve very complex math problems.'],
  [17.46, 19.00, 'والفرق ما بينهم هو ده *المهم', 'The difference between them is what matters.'],
  [19.00, 21.66, 'المجال اللي بتكلم عنه هنا هو الـ*Operations~Research', 'The field in question here is Operations Research.'],
  [21.66, 23.14, 'خلّيني أبسّطهالك', 'Let me simplify it.'],
  [23.14, 24.76, 'لو إنت بتلعب ماتش *شطرنج', "Say you're playing a game of chess:"],
  [24.76, 29.04, 'فكل حركة بتفتح قدامك مجموعة كبيرة من *الاحتمالات أو الحركات التانية', 'every move opens up a big set of possible moves.'],
  [29.04, 31.86, 'وكل حركة بتشوف لو *خصمك رد عليك', 'For each one, you look at how your opponent could reply,'],
  [31.86, 35.80, 'ومع كل الاحتمالات دي بتشوف الاحتمالات اللي خصمك هيرد عليك بيها', 'and for each of those, every reply they could make.'],
  [35.80, 37.64, 'فمع كل احتمال فيه *احتمال', 'Every possibility branches into more,'],
  [37.64, 41.18, 'وهكذا لحد ما يبقى عندنا عدد *مهول جدًا من الاحتمالات', 'until you have an enormous number of possibilities.'],
  [41.18, 45.26, 'تخيّل بدل رقعة الشطرنج دي عندك *مصنع فيه متغيرات كتيرة جدًا', 'Now swap the chessboard for a factory with tons of variables.'],
  [45.26, 48.56, 'فمسائل الـOperations~Research عادةً بتبقى *NP-Hard', 'Operations Research problems are usually NP-Hard.'],
  [48.56, 53.26, 'يعني ببساطة ما فيش خوارزمية *معروفة تقدر تحل كل الاحتمالات دي في وقت قصير', 'Simply put: no known algorithm can check them all in a short time.'],
  [53.26, 55.48, 'وطبعًا كل ما المشكلة تكبر والمتغيرات تكبر', 'And the bigger the problem, the more variables,'],
  [55.48, 58.30, 'كل ما العمليات الحسابية بتكبر بشكل *مرعب', 'the computation explodes.'],
  [58.30, 61.04, 'بس خلّي بالك، ده مش معناه إن إحنا ما *نعرفش نحل المسألة دي', "But careful: that doesn't mean we can't solve it."],
  [61.04, 67.46, 'التحدي هنا إننا نوصل لأفضل حل ممكن في أسرع وقت، أو في وقت *منطقي', 'The challenge is reaching the best possible solution fast, or in reasonable time.'],
  [67.46, 70.58, 'وعشان نوصل لده بنستخدم حاجة اسمها *Solvers', 'For that, we use something called solvers.'],
  [70.58, 72.92, 'ودي بتبقى خوارزمية أو *معادلة رياضية', 'Algorithms, mathematical models.'],
  [72.92, 76.14, 'بدل ما تجرّب كل الاحتمالات، بتقدر توصّلك *لأفضل~حل', 'Instead of trying everything, they get you to the best solution,'],
  [76.14, 79.20, 'وأحيانًا بتثبت إن ده الحل الأفضل *على~الإطلاق', 'and sometimes they prove it is the best one possible.'],
  [79.20, 81.46, 'طب إيه الفرق ما بين كل ده و*ChatGPT وClaude؟', "So what's the difference between this and ChatGPT or Claude?"],
  [81.46, 84.50, 'الفكرة إنك لو سألت Claude أو ChatGPT نفس *السؤال', 'If you ask Claude or ChatGPT the question,'],
  [84.50, 87.30, 'هيديك حل يبدو إنه *منطقيًا صح', "you'll get an answer that looks logically right,"],
  [87.30, 89.54, 'بس مش *بالضرورة يكون الحل الأفضل', "but it's not necessarily the best one."],
  [89.54, 91.98, 'وممكن لو أخدت نفس السؤال وديته لClaude', 'Take the same question back to Claude,'],
  [91.98, 95.06, 'أو سألت ChatGPT تاني نفس السؤال بس في *محادثة~تانية', 'or ask ChatGPT again in a new chat,'],
  [95.06, 97.38, 'يديك حل *مختلف~تمامًا عن الأولاني', 'and you get a completely different answer.'],
  [97.38, 100.30, 'بعكس الـOperations~Research أو الـ*Solver', 'Unlike Operations Research, the solver:'],
  [100.30, 101.34, 'وده الفرق *الجوهري', "that's the key difference."],
  [101.34, 103.70, 'إن كل مرة تسأل الـOperations~Research', 'Every time you ask Operations Research,'],
  [103.70, 105.02, 'هيطلع لك *نفس~الحل', 'you get the same solution.'],
  [105.02, 106.46, 'هنا هو بيقترح لك *حل', 'One suggests a solution.'],
  [106.46, 109.58, 'لكن ده بيديك حل *مثبت~رياضيًا إنه الأفضل', 'The other gives you one mathematically proven to be best.'],
  [109.58, 111.66, 'أنا هنا مش فاهم هو قال *600 بناءً على إيه', "I don't get what he based 600 on."],
  [111.66, 114.78, 'لإني دوّرت وملقيتش أرقام *دقيقة عن الموضوع ده', 'I searched and found no exact numbers on this.'],
  [114.78, 117.14, 'وكمان ده علم بيتشرح في *الجامعات من سنين', "Plus, it's been taught at universities for years,"],
  [117.14, 118.86, 'وفيه أدوات *Open~Source أصلًا', 'and there are open-source tools,'],
  [118.86, 120.42, 'زي Google *OR-Tools مثلًا', 'like Google OR-Tools,'],
  [120.42, 121.58, 'ممكن أي حد *يستخدمها', 'that anyone can use.'],
  [121.58, 127.56, 'يمكن يقصد إن مفيش حد متخصص في نوع معين من الـSolvers ويقدر يبنيه *من~الصفر', 'Maybe he means few people can build a certain kind of solver from scratch.'],
  [127.56, 131.54, 'بس هو مش *علم~نووي أو علم سري إن مفيش حد يعرفه', "But it's not nuclear science, or a secret nobody knows."],
  [131.54, 133.48, 'الحتة دي بقى محتاجة حلقة *لوحدها', 'Now that part needs its own episode.'],
];
// lines whose words changed in the corrected cut (keyed by old start)
const VO_FIX = {
  31.86: ['كل الاحتمالات دي بتشوف الاحتمالات اللي خصمك هيرد عليك بيها', 'With all of those, you look at every reply your opponent could make.'],
  41.18: ['تخيّل رقعة الشطرنج دي عندك *مصنع فيه متغيرات كتيرة جدًا', 'Now imagine this chessboard is a factory with tons of variables.'],
  61.04: ['إننا نوصل لأفضل حل ممكن في أسرع وقت، أو في وقت *منطقي', 'We need the best possible solution fast, or in reasonable time.'],
  67.46: ['بنستخدم حاجة اسمها *Solvers', 'We use something called solvers.'],
  117.14: ['وفيه أدوات *Open~Source', 'and there are open-source tools,'],
  121.58: ['هو يقصد إن مفيش حد متخصص في نوع معين من الـSolvers ويقدر يبنيه *من~الصفر', 'He means few people can build a certain kind of solver from scratch.'],
};
const VO_NEW = VO.flatMap(([s, e, ar, en]) => {
  const iv = oldRangeToNew(s, e); const len = iv.reduce((a, [x, y]) => a + y - x, 0);
  if (len < 0.3) return [];
  const f = VO_FIX[s] || [ar, en];
  return [[iv[0][0], iv.at(-1)[1], f[0], f[1]]];
});
// ---------- captions: show clips (clip-local time) ----------
const CL = {
  c1a: [[0.20, 1.38, 'عارف مقيّمها بكام؟', 'Know what you valued it at?'], [1.38, 2.20, 'بكام؟', 'How much?'], [2.20, 4.36, 'بـ*700 مليون جنيه', '700 million pounds.']],
  c1b: [[0.24, 4.50, 'وإنت عارف إن كل الكلام الحلو اللي اتقال ده', 'And you know all the nice things just said…'], [4.50, 9.40, 'للأسف بقى بيتعمل *بالـAI دلوقتي بسهولة', '…AI can do that easily now, unfortunately.']],
  c2: [[0.26, 2.46, 'أو كل الـGenerative~AI applications', 'or any generative AI application,'], [2.46, 5.06, 'هي في الآخر بتطلّع *احتمالات', 'in the end, outputs probabilities.'], [5.06, 9.20, 'ما أقدرش آخد منها *deterministic~output', "I can't get a deterministic output from it."]],
  c3a: [[0.26, 7.50, 'المعادلة دي بتحتمل جوّاها *27~كوادريليون احتمال من الحلول', 'This equation holds 27 quadrillion possible solutions.']],
  c4a: [[0.26, 5.40, 'في العالم، في حدود *ستمية بني آدم على الكوكب', 'Worldwide, about 600 people on the planet.']],
  c4b: [[0.26, 2.26, 'إنت بقى في حد منهم معاك؟', 'Do you have any of them with you?'], [2.26, 3.26, '*تلاتة', 'Three.'], [3.26, 4.50, 'تلاتة من *ستمية؟', 'Three out of 600?']],
  c5a: [[0.16, 2.36, 'يعني لسه بتكتب الكود *بإيدك؟', 'So you still write code by hand?']],
  c5b: [[0.26, 3.50, 'لا طبعًا، ما حدش بيعمل كود بإيده *خلاص', 'No way, nobody writes code by hand anymore.']],
};

// ---------- the three variants ----------
const B = { // VO blocks in cut time
  B1: [[0, 19.01]], B2: [[19.01, 41.14]], B3: [[41.14, 45.37]], B4a: [[45.37, 60.98]], B4aShort: [[45.37, 53.33], [58.33, 60.98]],
  B4b: [[60.98, 79.2]], B5a: [[79.2, 97.23]], B5b: [[97.23, 109.42]], B6: [[109.42, 131.38]], B7: [[131.38, 133.478]],
};
function voBlock(oldParts) {
  const parts = [], warp = []; let nl = 0, ol = 0;
  for (const [a, b] of oldParts) {
    for (const [x, y, sx] of oldRangeToNew(a, b, true)) {
      const oldT = oldOfSrc(sx); // old-cut time of this piece's first frame
      warp.push([r3(nl), r3(ol + oldT - a), r3(y - x)]);
      const l = parts.at(-1); if (l && Math.abs(l[1] - x) < 1e-3) l[1] = y; else parts.push([x, y]);
      nl += y - x;
    }
    ol += b - a;
  }
  return { parts, warp };
}
const vo = (name, scene, p = {}) => { const { parts, warp } = voBlock(B[name]); return { t: 'vo', parts, scene, p: { ...p, warp } }; };
const clip = (id, over, p = {}) => ({ t: 'clip', id, over, p });
const VARIANTS = {
  A: { punch: 1.06, mirror: false, center: true, hook: 'hookA', items: [
    clip('c1a'), clip('c1b'), vo('B1', 'sb1'), clip('c2'), vo('B2', 'sb2'), vo('B3', 'sb3'), clip('c3a', 'q27'),
    vo('B4aShort', 'sb4a', { checkAt: 7.96, curveAt: 99 }), vo('B4b', 'sb4b'), vo('B5a', 'sb5a'), vo('B5b', 'sb5b', { band: 1 }),
    clip('c4a', 'six'), clip('c4b'), vo('B6', 'sb6'), clip('c5a'), clip('c5b'), vo('B7', 'sb7')] },
  B: { punch: 1.10, mirror: false, hook: 'hookB', items: [
    clip('c4a'), clip('c4b'), vo('B6', 'sb6', { band: 1 }), clip('c1b'), vo('B1', 'sb1'), clip('c2'), vo('B2', 'sb2'), vo('B3', 'sb3'),
    clip('c3a', 'q27'), vo('B4b', 'sb4b'), vo('B5a', 'sb5a'), vo('B5b', 'sb5b'), clip('c5a'), clip('c5b'), vo('B7', 'sb7')] },
  C: { punch: 1.06, mirror: true, hook: 'hookC', items: [
    vo('B1', 'sb1', { kickAt: 3.5 }), clip('c2'), vo('B2', 'sb2'), vo('B3', 'sb3'), clip('c3a', 'q27'), vo('B4a', 'sb4a', { checkAt: 12.93, curveAt: 7.89 }),
    vo('B4b', 'sb4b'), vo('B5a', 'sb5a'), vo('B5b', 'sb5b', { band: 1 }), clip('c5a'), clip('c5b'), vo('B7', 'sb7')] },
};

// ---------- shared scene header ----------
const FONTS = [['IBM Plex Sans Arabic', 'ibm-plex-sans-arabic-arabic', 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'],
  ['IBM Plex Sans Arabic', 'ibm-plex-sans-arabic-latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ['IBM Plex Sans', 'ibm-plex-sans-latin', null]];
const fontFaces = () => FONTS.flatMap(([fam, file, range]) => [400, 600, 700].map((w) =>
  `@font-face{font-family:"${fam}";src:url("assets/fonts/${file}-${w}-normal.woff2") format("woff2");font-weight:${w};font-display:block${range ? ';unicode-range:' + range : ''}}`)).join('\n') +
  '\n@font-face{font-family:"IBM Plex Mono";src:url("assets/fonts/ibm-plex-mono-latin-400-normal.woff2") format("woff2");font-weight:400;font-display:block}' +
  '\n@font-face{font-family:"IBM Plex Mono";src:url("assets/fonts/ibm-plex-mono-latin-700-normal.woff2") format("woff2");font-weight:700;font-display:block}';
const BASE_CSS = `
.k9{position:absolute;inset:0;overflow:hidden;pointer-events:none;direction:rtl;color:#F5F5F5;font-family:"IBM Plex Sans Arabic","IBM Plex Sans",sans-serif;-webkit-font-smoothing:antialiased}
.k9 .abs{position:absolute}
.k9 .lat{font-family:"IBM Plex Sans",sans-serif;direction:ltr;unicode-bidi:isolate}
.k9 .mono{font-family:"IBM Plex Mono",monospace;direction:ltr;unicode-bidi:isolate}
.k9 .panel{position:absolute;box-sizing:border-box;background:#1A1A1A;border:2px solid #404040;border-radius:28px}
.k9 .chip{position:absolute;box-sizing:border-box;display:flex;align-items:center;gap:12px;height:64px;padding:0 24px;border-radius:999px;background:#242424;border:2px solid #404040;font-weight:600;font-size:30px;white-space:nowrap}
.k9 .tag{display:inline-block;padding:4px 16px;border-radius:14px;background:#1F3327;color:#2FB161;font-weight:600;font-size:30px;letter-spacing:.04em;white-space:nowrap}
.k9 .caret{display:inline-block;width:.08em;height:.9em;margin:0 .04em;background:#E85A02;vertical-align:-.1em}
.k9 .glow{position:absolute;width:760px;height:760px;border-radius:50%;filter:blur(90px);opacity:.22}
.k9 .center{position:absolute;left:0;right:0;display:flex;justify-content:center}
`;
const HELPERS = `
const clamp=(x,a,b)=>Math.min(b===undefined?1:b,Math.max(a===undefined?0:a,x));
function spring(t,k,d){if(t<=0)return 0;const w0=Math.sqrt(k),z=d/(2*w0);if(z<1){const wd=w0*Math.sqrt(1-z*z);return 1-Math.exp(-z*w0*t)*(Math.cos(wd*t)+(z*w0/wd)*Math.sin(wd*t));}return 1-Math.exp(-w0*t)*(1+w0*t);}
const SPR={snappy:[320,34],default:[170,26],heavy:[120,24],playful:[220,14]};
const sp=(t,p)=>{const s=SPR[p||'default'];return spring(t,s[0],s[1]);};
function bez(x1,y1,x2,y2){const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;const sx=s=>((ax*s+bx)*s+cx)*s,sy=s=>((ay*s+by)*s+cy)*s;return x=>{x=clamp(x);let s=x;for(let i=0;i<8;i++){const dx=(3*ax*s+2*bx)*s+cx;if(Math.abs(dx)<1e-6)break;s-=(sx(s)-x)/dx;}return sy(clamp(s));};}
const e9=bez(.4,0,.2,1);
const tw=(t,s,d)=>e9(clamp((t-s)/d));
const op=(el,a)=>{el.style.opacity=String(clamp(a));};
// pop in on the word: fade + small rise, spring with no overshoot on type
const pop=(el,t,s,p)=>{const k=sp(t-s,p||'snappy');op(el,clamp((t-s)*7));el.style.transform='translateY('+((1-k)*28).toFixed(1)+'px) scale('+(0.94+0.06*k).toFixed(4)+')';return k;};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
// typed reveal with the 9k caret; caret blinks once typed
function typed(el,txt,t,s,cps,keep){const n=Math.max(0,Math.min(txt.length,Math.floor((t-s)*(cps||20))));const typing=n<txt.length&&t>=s;const blink=((t-s)%1.06)<.53;const showCaret=t>=s&&(typing||(keep&&blink));el.innerHTML=esc(txt.slice(0,n))+(showCaret?'<span class="caret"></span>':'');return n;}
const NS='http://www.w3.org/2000/svg';
const mk=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;};
`;
// sfx library: name → [file, length, default gain]
const SFX = { pop: ['pop-hand', 0.348, 0.07], whoosh: ['fast-whoosh', 0.394, 0.09], swish: ['swish-whoosh-large', 0.789, 0.07], click: ['mouse-click-2', 0.186, 0.15],
  thud: ['dull-thud', 1.393, 0.17], tick: ['tick-sound', 0.557, 0.08], type: ['keyboard-typing-realistic', 3.39, 0.12], ding: ['notification-ding', 1.997, 0.07],
  msg: ['message-pop-reply', 0.882, 0.09], needle: ['sideways-record-needle', 0.58, 0.13], bass: ['bass-impact', 2.461, 0.18] };
// scene-time (old block time, or source time on a sped-up clip) → timeline time; null when that moment was cut
function sfxTime(t, p) {
  if (!p.warp) return t / (p.rate || 1);
  for (const [n, o, len] of p.warp) if (t >= o - 0.02 && t < o + len) return Math.max(n, n + t - o);
  return null;
}
function sfxTags(id, list) {
  return list.map(([t, name, len, gain], i) => {
    const [file, L, g] = SFX[name];
    const d = Math.min(L, len || L);
    return `<audio id="${id}-sfx-${i}" src="assets/sfx/${file}.wav" data-start="${r3(t)}" data-hf-media-start-basis="local" data-duration="${r3(d)}" data-volume="${gain ?? g}" data-track-index="${(id.startsWith('hook') ? 26 : 20) + (i % 4)}"></audio>`;
  }).join('\n  ');
}
function sceneFile({ id, w = W, h = TOP, css = '', html, js, sfx = [], d = 10, p = {} }) {
  return `<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
<style>
${fontFaces()}
${BASE_CSS}
${css}
</style>
<div id="root" data-composition-id="${id}" data-width="${w}" data-height="${h}">
 <div id="${id}-scene" class="k9">
${html}
 </div>
  ${sfxTags(id, sfx.map((x) => [sfxTime(x[0], p), ...x.slice(1)]).filter((x) => x[0] !== null))}
</div>
<script>
(function(){
${HELPERS}
const root=document.getElementById('${id}-scene');
const $=(r)=>root.querySelector('[data-role="'+r+'"]');
const R=${p.rate || 1};
const P=${JSON.stringify(p)};
const WP=P.warp||null;
const MAP=(t)=>{if(!WP)return t*R;let k=0;for(let i=0;i<WP.length;i++)if(WP[i][0]<=t+1e-6)k=i;return WP[k][1]+Math.min(t-WP[k][0],WP[k][2]);};
const DN=${r3(d)};
const D=MAP(DN);
${js}
const tl=gsap.timeline({paused:true}),clock={t:0};
tl.to(clock,{t:DN,duration:DN,ease:'none',onUpdate:()=>render(MAP(clock.t))},0);
render(MAP(0));
window.__timelines["${id}"]=tl;
})();
</script>
    </template>
  </body>
</html>
`;
}
const BG = `<div class="glow" data-layout-ignore style="left:-300px;top:-420px;background:#166434"></div><div class="glow" data-layout-ignore style="right:-360px;bottom:-480px;background:#E85A02;opacity:.12"></div>`;
const OUT = `const fade=1-tw(t,D-.28,.28);root.style.opacity=String(fade);`; // every scene fades out over its last 0.28 s

// ---------- the tree (shared by sb2 and sb4b) ----------
const TREE_JS = `
function buildTree(svg,levels,y0,dys,spreads){
  const nodes=[{x:540,y:y0,path:'',lvl:0}];const byLvl=[[nodes[0]]];
  for(let L=1;L<=levels;L++){byLvl[L]=[];const n=L===1?5:3;for(const p of byLvl[L-1]){for(let i=0;i<n;i++){const x=p.x+(i-(n-1)/2)*spreads[L-1],y=y0+dys[L-1];
    const nd={x,y,path:p.path+(p.path?'-':'')+i,lvl:L,parent:p};nd.line=mk('line',{x1:p.x,y1:p.y,x2:x,y2:y,stroke:'#404040','stroke-width':L<3?3:L<4?2:1.2},svg);byLvl[L].push(nd);nodes.push(nd);}}}
  for(const nd of nodes){if(nd.lvl===0)continue;const r=[0,13,8,4.5,2.2][nd.lvl];nd.dot=mk('circle',{cx:nd.x,cy:nd.y,r,fill:'#F5F5F5'},svg);}
  return byLvl;}
`;

// ---------- scenes ----------
const S = {};
S.sb1 = { // B1: which AI? car ≠ slop → Generative vs Optimization
  css: `
#sb1-scene .kick{top:28px;font-size:54px;font-weight:700}
#sb1-scene .lbl{position:absolute;font-size:30px;font-weight:600;color:#999999;text-align:center;width:340px}
#sb1-scene .neq{position:absolute;left:470px;top:190px;width:140px;text-align:center;font:700 130px/1 "IBM Plex Sans",sans-serif;color:#E85A02;direction:ltr}
#sb1-scene .card{position:absolute;top:128px;width:440px;height:440px;padding:26px 28px}
#sb1-scene .card .ttl{font:700 42px/1.1 "IBM Plex Sans",sans-serif;direction:ltr;text-align:center}
#sb1-scene .row{position:absolute;right:36px;left:36px;height:74px;border-radius:18px;background:#242424;border:2px solid #404040;display:flex;align-items:center;gap:18px;padding:0 22px;font-size:34px;font-weight:600}
#sb1-scene .row svg{flex:none}
#sb1-scene .bigc{position:absolute;left:310px;top:116px;width:460px;height:460px;border-radius:50%;border:3px solid #404040;background:rgba(36,36,36,.5);box-sizing:border-box}
#sb1-scene .bigc .ai{position:absolute;left:0;right:0;top:44px;text-align:center;font:700 64px/1 "IBM Plex Sans",sans-serif;direction:ltr}
#sb1-scene .smc{position:absolute;left:350px;top:278px;width:250px;height:250px;border-radius:50%;border:3px solid #2FB161;background:#1F3327;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
#sb1-scene .smc .chip{position:relative;height:56px;font:600 28px/1 "IBM Plex Sans",sans-serif;direction:ltr}
#sb1-scene .eq{position:absolute;left:30px;right:30px;top:110px;text-align:center;font:400 34px/1.5 "IBM Plex Mono",monospace;direction:ltr;color:#F5F5F5}
`,
  html: `${BG}
  <div class="center kick" data-role="kick"></div>
  <div class="bigc" data-role="bigc"><div class="ai">AI</div></div>
  <div class="smc" data-role="smc"><div class="chip" data-role="b1">ChatGPT</div><div class="chip" data-role="b2"><img src="assets/img/claude.svg" width="28" height="28" style="filter:invert(1)"/>Claude</div></div>
  <svg class="abs" data-role="car" viewBox="0 0 340 230" style="left:640px;top:150px;width:340px;height:230px;overflow:visible">
    <g data-role="rings" fill="none" stroke="#2FB161" stroke-width="3"><circle cx="170" cy="70" r="40"/><circle cx="170" cy="70" r="40"/><circle cx="170" cy="70" r="40"/></g>
    <path d="M40 150 L70 106 Q80 92 100 92 L235 92 Q255 92 268 106 L300 150 Q312 152 312 164 L312 182 L28 182 L28 164 Q28 152 40 150 Z" fill="#242424" stroke="#F5F5F5" stroke-width="4" stroke-linejoin="round"/>
    <path d="M92 104 L118 104 L118 144 L66 144 Z M130 104 L210 104 L210 144 L130 144 Z M222 104 L246 104 L276 144 L222 144 Z" fill="#0F0F0F" stroke="#F5F5F5" stroke-width="3"/>
    <circle cx="160" cy="72" r="12" fill="#2FB161"/>
    <circle cx="88" cy="184" r="26" fill="#0F0F0F" stroke="#F5F5F5" stroke-width="5"/><circle cx="252" cy="184" r="26" fill="#0F0F0F" stroke="#F5F5F5" stroke-width="5"/>
  </svg>
  <div class="lbl" data-role="carL" style="left:640px;top:410px">عربية ذاتية القيادة</div>
  <svg class="abs" data-role="feed" viewBox="0 0 240 330" style="left:110px;top:120px;width:240px;height:330px">
    <defs><clipPath id="sb1-clip"><rect x="14" y="14" width="212" height="302" rx="22"/></clipPath></defs>
    <rect x="4" y="4" width="232" height="322" rx="30" fill="#1A1A1A" stroke="#404040" stroke-width="4"/>
    <g clip-path="url(#sb1-clip)" data-role="tiles"></g>
  </svg>
  <div class="lbl lat" data-role="feedL" style="left:60px;top:470px">AI slop</div>
  <div class="neq" data-role="neq">≠</div>
  <div class="panel card" data-role="gen" style="right:60px">
    <div class="ttl">Generative AI</div>
    <div class="row" data-role="r1" style="top:120px"><svg width="44" height="44" viewBox="0 0 44 44"><g stroke="#F5F5F5" stroke-width="4" stroke-linecap="round"><line x1="6" y1="10" x2="38" y2="10"/><line x1="6" y1="22" x2="38" y2="22"/><line x1="6" y1="34" x2="26" y2="34"/></g></svg>كلام</div>
    <div class="row" data-role="r2" style="top:214px"><svg width="44" height="44" viewBox="0 0 44 44"><rect x="4" y="6" width="36" height="32" rx="6" fill="none" stroke="#F5F5F5" stroke-width="4"/><circle cx="15" cy="17" r="4" fill="#F5F5F5"/><path d="M6 34 L18 24 L26 30 L32 24 L40 32" fill="none" stroke="#F5F5F5" stroke-width="4"/></svg>صور</div>
    <div class="row" data-role="r3" style="top:308px"><span class="mono" style="font-size:34px;font-weight:700;color:#F5F5F5;width:44px;text-align:center">&lt;/&gt;</span>كود</div>
  </div>
  <div class="panel card" data-role="opt" style="left:60px">
    <div class="ttl">Optimization</div>
    <div class="eq">min f(x)<br/><span style="color:#999999;font-size:28px">s.t. g(x) ≤ 0</span></div>
    <svg class="abs" viewBox="0 0 380 170" style="left:30px;top:250px;width:380px;height:170px" data-role="grid"></svg>
  </div>
`,
  js: `
const kick=$('kick'),car=$('car'),carL=$('carL'),feed=$('feed'),feedL=$('feedL'),neq=$('neq'),gen=$('gen'),opt=$('opt'),rings=[...$('rings').children],tilesG=$('tiles'),grid=$('grid');
const rows=[$('r1'),$('r2'),$('r3')];const bigc=$('bigc'),smc=$('smc'),b1=$('b1'),b2=$('b2');
// slop tiles: seeded shapes that never quite make sense
let seed=21;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const tiles=[];for(let i=0;i<6;i++){const g=mk('g',{},tilesG);mk('rect',{x:24,y:0,width:192,height:128,rx:14,fill:'#242424'},g);
  mk('circle',{cx:70+rnd()*30,cy:52,r:22,fill:'#404040'},g);for(let f=0;f<6;f++)mk('line',{x1:120+f*13,y1:96,x2:118+f*15+rnd()*8,y2:46+rnd()*20,stroke:'#999999','stroke-width':5,'stroke-linecap':'round'},g);
  mk('rect',{x:34,y:104,width:50+rnd()*90,height:10,rx:5,fill:'#404040'},g);const tg=mk('g',{},g);mk('rect',{x:170,y:10,width:40,height:26,rx:8,fill:'#F39191'},tg);const tx=mk('text',{x:190,y:29,'text-anchor':'middle','font-size':16,'font-weight':700,'font-family':'IBM Plex Sans',fill:'#0F0F0F'},tg);tx.textContent='AI';tiles.push(g);}
// optimization grid: a small network
const pts=[];for(let r=0;r<3;r++)for(let c=0;c<6;c++)pts.push([20+c*68,20+r*64]);
pts.forEach((p,i)=>{if(i%6<5)mk('line',{x1:p[0],y1:p[1],x2:pts[i+1][0],y2:pts[i+1][1],stroke:'#404040','stroke-width':3},grid);if(i<12)mk('line',{x1:p[0],y1:p[1],x2:pts[i+6][0],y2:pts[i+6][1],stroke:'#404040','stroke-width':3},grid);});
const dots=pts.map(p=>mk('circle',{cx:p[0],cy:p[1],r:8,fill:'#F5F5F5'},grid));
const PATH=[0,1,7,8,14,15,16,17];
function render(t){
  typed(kick,'أنهي AI؟',t,P.kickAt||.1,14,true);
  const ph2=tw(t,12.25,.35);
  const ph0=1-tw(t,6.1,.35);pop(bigc,t,1.6,'default');bigc.style.opacity=String(clamp((t-1.6)*6)*ph0);pop(smc,t,3.7,'snappy');smc.style.opacity=String(clamp((t-3.7)*6)*ph0);pop(b1,t,4.1);pop(b2,t,4.6);
  // phase 1: car vs slop
  const kc=pop(car,t,6.5,'default');car.style.opacity=String(clamp((t-6.5)*6)*(1-ph2));op(carL,clamp((t-6.9)*5)*(1-ph2));
  rings.forEach((c,i)=>{const k=((t*.7+i/3)%1);c.setAttribute('r',String(40+k*150));c.setAttribute('opacity',String((1-k)*.8));});
  pop(feed,t,10.2,'default');feed.style.opacity=String(clamp((t-10.2)*6)*(1-ph2));op(feedL,clamp((t-10.5)*5)*(1-ph2));
  tiles.forEach((g,i)=>{const y=((i*146-t*70)%(6*146)+6*146)%(6*146)-140;g.setAttribute('transform','translate(0 '+y.toFixed(1)+')');});
  const nq=t<12.25?sp(t-11.1,'snappy'):sp(t-17.45,'snappy');neq.style.opacity=String(t<12.25?clamp((t-11.1)*7)*(1-ph2):clamp((t-17.45)*7));neq.style.transform='scale('+(0.6+0.4*nq).toFixed(3)+')';
  // phase 2: two cards
  pop(gen,t,12.4,'default');[13.0,13.6,14.3].forEach((s,i)=>pop(rows[i],t,s));
  pop(opt,t,14.9,'default');const lit=clamp((t-15.4)/1.6);dots.forEach((d,i)=>{const on=PATH.indexOf(i);d.setAttribute('fill',on>=0&&on/PATH.length<lit?'#2FB161':'#F5F5F5');});
  opt.style.borderColor=t>17.45?'#E85A02':'#404040';
  ${OUT}
}`,
  sfx: [[0.1, 'type', 0.6], [1.6, 'pop'], [3.7, 'pop'], [4.1, 'pop'], [4.6, 'pop'], [6.5, 'whoosh'], [10.2, 'pop'], [11.1, 'thud', 0.6, 0.1], [12.4, 'swish'], [13.0, 'pop'], [13.6, 'pop'], [14.3, 'pop'], [14.9, 'pop'], [17.45, 'click']],
};
S.sb2 = { // B2: Operations Research · chess tree explodes
  css: `
#sb2-scene .kick{top:24px;font:700 52px/1.1 "IBM Plex Sans",sans-serif;direction:ltr}
#sb2-scene .sub{top:92px;font-size:28px;color:#999999;font-weight:600}
#sb2-scene .big{position:absolute;left:290px;top:250px;width:500px;height:200px;border-radius:28px;background:rgba(15,15,15,.92);border:2px solid #E85A02;display:flex;flex-direction:column;align-items:center;justify-content:center}
#sb2-scene .big .n{font:700 104px/1 "IBM Plex Sans",sans-serif;color:#E85A02;direction:ltr}
#sb2-scene .big .l{font-size:26px;color:#999999;font-weight:600;margin-top:8px}
`,
  html: `${BG}
  <div class="center kick" data-role="kick"></div>
  <div class="center sub" data-role="sub">بحوث العمليات</div>
  <svg class="abs" data-role="tree" viewBox="0 0 1080 608" style="left:0;top:0;width:1080px;height:608px"></svg>
  <svg class="abs" data-role="board" viewBox="0 0 8 8" style="left:506px;top:136px;width:68px;height:68px;shape-rendering:crispEdges"></svg>
  <div class="big" data-role="big"><div class="n">10<sup style="font-size:.5em">120</sup></div><div class="l">تقدير عدد أدوار الشطرنج الممكنة</div></div>
`,
  js: `${TREE_JS}
const kick=$('kick'),sub=$('sub'),tree=$('tree'),board=$('board'),big=$('big');
for(let r=0;r<8;r++)for(let c=0;c<8;c++)mk('rect',{x:c,y:r,width:1,height:1,fill:(r+c)%2?'#2FB161':'#F5F5F5'},board);
const lv=buildTree(tree,4,170,[100,190,280,360],[190,58,19,6.3]);
const AT=[0,5.9,10.1,12.9,16.8];
function render(t){
  typed(kick,'Operations Research',t,.1,24,false);kick.innerHTML+=(t>.1&&t<2.2&&((t-.1)%1.06)<.53)?'':'';
  op(sub,clamp((t-1.3)*4));
  const kb=pop(board,t,4.4,'default');
  for(let L=1;L<=4;L++){const s=AT[L];lv[L].forEach((nd,i)=>{const st=s+(i/lv[L].length)*0.9;const k=clamp((t-st)/.35);nd.line.setAttribute('opacity',String(k));nd.dot.setAttribute('opacity',String(k));});}
  // the whole tree glows brighter as it floods
  const flood=tw(t,16.8,1.5);tree.style.filter='brightness('+(1+flood*.3)+')';
  const kbg=pop(big,t,18.9,'heavy');
  ${OUT}
}`,
  sfx: [[0.1, 'type', 1.0], [4.4, 'pop'], [5.9, 'tick'], [10.1, 'tick'], [12.9, 'tick'], [16.8, 'swish'], [18.9, 'thud', 0.8, 0.12]],
};
S.sb3 = { // B3: chessboard → factory with constraints
  css: `
#sb3-scene .chip{font-size:28px;height:58px}
#sb3-scene .chip i{width:14px;height:14px;border-radius:50%;background:#2FB161;display:inline-block}
`,
  html: `${BG}
  <svg class="abs" data-role="fac" viewBox="0 0 300 220" style="left:390px;top:150px;width:300px;height:220px;overflow:visible">
    <path d="M20 200 L20 110 L80 70 L80 110 L140 70 L140 110 L200 70 L200 40 L240 40 L240 200 Z" fill="#242424" stroke="#F5F5F5" stroke-width="5" stroke-linejoin="round" data-role="body"/>
    <g fill="#0F0F0F" stroke="#F5F5F5" stroke-width="3"><rect x="44" y="140" width="34" height="30"/><rect x="104" y="140" width="34" height="30"/><rect x="164" y="140" width="34" height="30"/></g>
    <g data-role="smoke" fill="#999999"><circle cx="220" cy="20" r="10"/><circle cx="220" cy="20" r="10"/><circle cx="220" cy="20" r="10"/></g>
  </svg>
  <div class="chip" data-role="k0" style="right:96px;top:120px"><i></i>تلاجات</div>
  <div class="chip" data-role="k1" style="right:60px;top:260px"><i></i>سيولة</div>
  <div class="chip" data-role="k2" style="right:120px;top:400px"><i></i>شحن</div>
  <div class="chip" data-role="k3" style="left:96px;top:120px"><i></i>مواعيد تسليم</div>
  <div class="chip" data-role="k4" style="left:60px;top:260px"><i></i>خطوط إنتاج</div>
  <div class="chip" data-role="k5" style="left:120px;top:400px"><i></i>عمالة</div>
`,
  js: `
const fac=$('fac'),smoke=[...$('smoke').children],ks=[0,1,2,3,4,5].map(i=>$('k'+i));
function render(t){
  pop(fac,t,1.9,'heavy');
  smoke.forEach((c,i)=>{const k=((t*.5+i/3)%1);c.setAttribute('cy',String(20-k*60));c.setAttribute('cx',String(220+k*20));c.setAttribute('r',String(8+k*16));c.setAttribute('opacity',String(t>2.2?(1-k)*.6:0));});
  ks.forEach((el,i)=>pop(el,t,2.4+i*.2));
  ${OUT}
}`,
  sfx: [[1.9, 'whoosh'], [2.4, 'pop'], [2.8, 'pop'], [3.2, 'pop'], [3.6, 'pop']],
};
S.q27 = { // over CLIP 3: the number rolls to 27 quadrillion
  css: `
#q27-scene .pill{position:absolute;left:60px;right:60px;top:392px;height:186px;border-radius:30px;background:rgba(15,15,15,.88);border:2px solid #E85A02;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
#q27-scene .num{font:700 60px/1 "IBM Plex Mono",monospace;color:#F5F5F5;direction:ltr;display:flex}
#q27-scene .num .d{display:inline-block;height:1em;overflow:hidden}
#q27-scene .num .s{display:grid}
#q27-scene .num .s span{height:1em;line-height:1em}
#q27-scene .lbl{font-size:38px;font-weight:700;color:#E85A02}
`,
  html: `<div class="pill" data-role="pill"><div class="num" data-role="num" data-layout-ignore></div><div class="lbl">احتمال حل</div></div>`,
  js: `
const pill=$('pill'),num=$('num');const V='27,000,000,000,000,000';const strips=[];
for(const ch of V){if(ch===','){const c=document.createElement('span');c.textContent=',';num.appendChild(c);continue;}const d=document.createElement('span');d.className='d';const s=document.createElement('span');s.className='s';const stops=10+ +ch;for(let i=0;i<=stops;i++){const x=document.createElement('span');x.textContent=String(i%10);s.appendChild(x);}d.appendChild(s);num.appendChild(d);strips.push({s,stops});}
const out3=x=>1-Math.pow(1-clamp(x),3);
function render(t){
  pop(pill,t,.6,'default');
  strips.forEach((d,i)=>{const k=out3((t-.7-i*.06)/(3.4-i*.06));d.s.style.transform='translateY('+(-d.stops*k)+'em)';});
  ${OUT}
}`,
  sfx: [[0.6, 'pop'], [0.8, 'tick'], [4.1, 'thud', 0.8, 0.12]],
};
S.sb4a = { // B4a: NP-Hard · no known fast algorithm · (curve) · but we can solve it
  css: `
#sb4a-scene .stamp{position:absolute;left:300px;top:70px;width:480px;height:170px;border:7px solid #E85A02;border-radius:26px;display:flex;align-items:center;justify-content:center;font:700 104px/1 "IBM Plex Sans",sans-serif;direction:ltr;color:#F5F5F5;background:rgba(15,15,15,.6)}
#sb4a-scene .lbl{position:absolute;font-size:30px;font-weight:600;color:#999999;text-align:center}
#sb4a-scene .ok{position:absolute;left:0;right:0;top:200px;display:flex;flex-direction:column;align-items:center;gap:14px}
#sb4a-scene .ok .t{font-size:52px;font-weight:700}
`,
  html: `${BG}
  <div class="stamp" data-role="stamp">NP-Hard</div>
  <svg class="abs" data-role="clock" viewBox="0 0 200 200" style="left:790px;top:300px;width:200px;height:200px">
    <circle cx="100" cy="100" r="80" fill="#1A1A1A" stroke="#F5F5F5" stroke-width="6"/>
    <path data-role="arc" fill="none" stroke="#F39191" stroke-width="10" stroke-linecap="round"/>
    <line data-role="hm" x1="100" y1="100" x2="100" y2="56" stroke="#F5F5F5" stroke-width="8" stroke-linecap="round"/>
    <line data-role="hh" x1="100" y1="100" x2="100" y2="40" stroke="#E85A02" stroke-width="5" stroke-linecap="round"/>
    <circle cx="100" cy="100" r="7" fill="#F5F5F5"/>
  </svg>
  <div class="lbl" data-role="clockL" style="left:760px;top:512px;width:260px">وقت قصير؟</div>
  <svg class="abs" data-role="chart" viewBox="0 0 520 300" style="left:90px;top:270px;width:520px;height:300px;overflow:visible">
    <line x1="40" y1="260" x2="500" y2="260" stroke="#404040" stroke-width="4"/><line x1="40" y1="260" x2="40" y2="10" stroke="#404040" stroke-width="4"/>
    <path data-role="curve" d="M40 256 C 260 250, 380 230, 440 120 S 480 20, 486 6" fill="none" stroke="#F4C871" stroke-width="7" stroke-linecap="round"/>
    <text x="270" y="296" text-anchor="middle" font-size="30" font-weight="600" fill="#999999" font-family="IBM Plex Sans Arabic">حجم المشكلة</text>
  </svg>
  <div class="ok" data-role="ok">
    <svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="68" fill="#166434"/><path data-role="tick" d="M42 78 L66 102 L110 52" fill="none" stroke="#FFFFFF" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="t">بس نقدر نحلها</div>
  </div>
`,
  js: `
const stamp=$('stamp'),clk=$('clock'),clockL=$('clockL'),arc=$('arc'),hm=$('hm'),hh=$('hh'),chart=$('chart'),curve=$('curve'),ok=$('ok'),tick=$('tick');
const CHECK=P.checkAt||12.93,CURVE=P.curveAt===undefined?7.89:P.curveAt;
const cl=curve.getTotalLength?curve.getTotalLength():700;curve.style.strokeDasharray=String(cl);
function render(t){
  // slam: scale 1.5 → 1 with a heavy spring, tilted
  const ks=sp(t-1.9,'heavy');op(stamp,clamp((t-1.9)*10));stamp.style.transform='rotate(-5deg) scale('+(1.5-.5*ks).toFixed(3)+')';
  pop(clk,t,3.3,'default');op(clockL,clamp((t-3.6)*5));
  const sp1=Math.max(0,t-3.3);hm.setAttribute('transform','rotate('+(sp1*720)+' 100 100)');hh.setAttribute('transform','rotate('+(sp1*60)+' 100 100)');
  const a=clamp((t-3.6)/3)*Math.PI*1.9,x=100+88*Math.sin(a),y=100-88*Math.cos(a);arc.setAttribute('d','M100 12 A88 88 0 '+(a>Math.PI?1:0)+' 1 '+x.toFixed(1)+' '+y.toFixed(1));
  const showC=CURVE<90;pop(chart,t,CURVE,'default');if(!showC)op(chart,0);
  curve.style.strokeDashoffset=String(cl*(1-tw(t,CURVE+.2,2.6)));curve.setAttribute('stroke',t>CURVE+3?'#F39191':'#F4C871');
  if(showC&&t>CURVE+3&&t<CURVE+3.6)chart.style.transform+=' translateX('+(Math.sin(t*80)*4).toFixed(1)+'px)';
  // the turn: everything dims, the check lands
  const dim=1-.8*tw(t,CHECK-.1,.3);[stamp,clk,clockL].forEach(e=>e.style.opacity=String(Math.min(+e.style.opacity||0,dim)));if(showC)chart.style.opacity=String(Math.min(+chart.style.opacity||0,dim));
  pop(ok,t,CHECK,'default');tick.style.strokeDasharray='120';tick.style.strokeDashoffset=String(120*(1-tw(t,CHECK+.15,.35)));
  ${OUT}
}`,
  sfx: null, // set per instance below (checkAt/curveAt move)
};
S.sb4b = { // B4b: best solution in reasonable time → Solver prunes the tree → optimal ✓
  css: `
#sb4b-scene .chip{top:40px;font-size:32px}
#sb4b-scene .solver{position:absolute;left:0;right:0;top:220px;display:flex;justify-content:center;font:700 96px/1 "IBM Plex Sans",sans-serif;direction:ltr}
#sb4b-scene .badge{position:absolute;height:60px;padding:0 22px;border-radius:999px;background:#166434;color:#FFFFFF;display:flex;align-items:center;gap:10px;font:700 30px/1 "IBM Plex Sans",sans-serif;direction:ltr;white-space:nowrap}
#sb4b-scene .note{position:absolute;font-size:28px;color:#999999;font-weight:600;white-space:nowrap}
`,
  html: `${BG}
  <div class="chip" data-role="c1" style="right:150px"><svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="14" fill="none" stroke="#2FB161" stroke-width="4"/><circle cx="17" cy="17" r="5" fill="#2FB161"/></svg>أفضل حل ممكن</div>
  <div class="chip" data-role="c2" style="left:150px"><svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="19" r="13" fill="none" stroke="#F4C871" stroke-width="4"/><line x1="17" y1="19" x2="17" y2="11" stroke="#F4C871" stroke-width="4" stroke-linecap="round"/><line x1="13" y1="3" x2="21" y2="3" stroke="#F4C871" stroke-width="4"/></svg>وقت منطقي</div>
  <div class="solver" data-role="solver"></div>
  <svg class="abs" data-role="tree" viewBox="0 0 1080 608" style="left:0;top:0;width:1080px;height:608px"></svg>
  <div class="badge" data-role="badge">Optimal <svg width="28" height="28" viewBox="0 0 28 28"><path d="M5 15 L11 21 L23 7" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
  <div class="note" data-role="note">أحيانًا بيثبت إنه الأفضل</div>
`,
  js: `${TREE_JS}
const c1=$('c1'),c2=$('c2'),solver=$('solver'),tree=$('tree'),badge=$('badge'),note=$('note');
const lv=buildTree(tree,3,150,[100,200,300],[190,58,19]);
const WIN='3-1-2';const all=[].concat(lv[1],lv[2],lv[3]);
// prune order: first the L1 branches that lose, then L2, then L3 siblings
const prune={};let k=0;lv[1].forEach(n=>{if(!WIN.startsWith(n.path))prune[n.path]=12.0+(k++)*.35;});
lv[2].forEach(n=>{if(n.path.startsWith('3-')&&!WIN.startsWith(n.path))prune[n.path]=13.6+(k++%3)*.3;});
lv[3].forEach(n=>{if(n.path.startsWith('3-1-')&&n.path!==WIN)prune[n.path]=14.4+(k++%3)*.2;});
const pruneAt=nd=>{let p=nd;while(p&&p.lvl>0){if(prune[p.path]!==undefined)return prune[p.path];p=p.parent;}return 99;};
const winNode=lv[3].find(n=>n.path===WIN);badge.style.left=(winNode.x-95)+'px';badge.style.top=(winNode.y+20)+'px';note.style.left=(winNode.x-150)+'px';note.style.top=(winNode.y+88)+'px';
function render(t){
  const up=tw(t,8.3,.4);
  pop(c1,t,1.7);pop(c2,t,5.9);[c1,c2].forEach(c=>c.style.opacity=String(Math.min(+c.style.opacity,1-up)));
  typed(solver,'Solver',t,8.6,14,false);const sv=tw(t,9.6,.4);solver.style.transform='translateY('+(-196*sv)+'px) scale('+(1-.45*sv)+')';
  all.forEach(nd=>{const st=9.7+(nd.lvl-1)*.45+(all.indexOf(nd)%15)*.02;const a=clamp((t-st)/.3);const pa=pruneAt(nd);const pk=clamp((t-pa)/.35);
    const onWin=WIN.startsWith(nd.path);const lit=onWin&&t>14.9?1:0;
    nd.line.setAttribute('opacity',String(a*(1-.85*pk)));nd.dot.setAttribute('opacity',String(a*(1-.85*pk)));
    nd.line.setAttribute('stroke',lit?'#2FB161':pk>0?'#5a2b2b':'#404040');nd.dot.setAttribute('fill',lit?'#2FB161':'#F5F5F5');if(lit)nd.line.setAttribute('stroke-width','6');});
  pop(badge,t,16.4,'default');op(note,clamp((t-16.8)*4));
  ${OUT}
}`,
  sfx: [[1.7, 'pop'], [5.9, 'pop'], [8.6, 'type', 0.5], [9.7, 'swish'], [12.0, 'click'], [12.35, 'click'], [12.7, 'click'], [13.05, 'click'], [13.6, 'click'], [14.4, 'click'], [14.9, 'tick'], [16.4, 'ding', 1.2]],
};
S.sb5a = { // B5a: same question, two chats, two different answers
  css: `
#sb5a-scene .hdr{top:22px;gap:18px}
#sb5a-scene .hdr .chip{position:relative;height:58px;font:600 28px/1 "IBM Plex Sans",sans-serif;direction:ltr}
#sb5a-scene .win{position:absolute;top:104px;width:450px;height:474px;padding:0}
#sb5a-scene .win .bar{height:52px;border-bottom:2px solid #404040;display:flex;align-items:center;justify-content:center;font-size:28px;color:#999999;font-weight:600}
#sb5a-scene .q{position:absolute;right:20px;top:76px;max-width:300px;padding:14px 22px;border-radius:22px 22px 6px 22px;background:#2A486F;font-size:28px;font-weight:600}
#sb5a-scene .a{position:absolute;left:20px;top:170px;width:330px;padding:18px 22px;border-radius:22px 22px 22px 6px;background:#242424;border:2px solid #404040}
#sb5a-scene .a .h{font:700 30px/1 "IBM Plex Sans Arabic";margin-bottom:12px}
#sb5a-scene .a i{display:block;height:12px;border-radius:6px;background:#404040;margin:10px 0}
#sb5a-scene .dots{position:absolute;left:20px;top:170px;padding:16px 22px;border-radius:22px;background:#242424;display:flex;gap:8px}
#sb5a-scene .dots b{width:12px;height:12px;border-radius:50%;background:#999999;display:block}
#sb5a-scene .tag2{position:absolute;left:20px;top:392px;font-size:28px;font-weight:600;color:#999999}
#sb5a-scene .neq{position:absolute;left:490px;top:250px;width:100px;text-align:center;font:700 110px/1 "IBM Plex Sans",sans-serif;color:#E85A02}
`,
  html: `${BG}
  <div class="center hdr" data-role="hdr"><div class="chip" data-role="g">ChatGPT</div><div class="chip" data-role="c"><img src="assets/img/claude.svg" width="30" height="30" style="filter:invert(1)"/>Claude</div></div>
  <div class="panel win" data-role="w1" style="right:40px"><div class="bar">محادثة 1</div>
    <div class="q" data-role="q1">نفس السؤال</div>
    <div class="dots" data-role="d1"><b></b><b></b><b></b></div>
    <div class="a" data-role="a1"><div class="h">الحل: A</div><i style="width:90%"></i><i style="width:70%"></i><i style="width:82%"></i></div>
    <div class="tag2" data-role="t1">منطقي… بس الأفضل؟</div>
  </div>
  <div class="panel win" data-role="w2" style="left:40px"><div class="bar">محادثة 2</div>
    <div class="q" data-role="q2">نفس السؤال</div>
    <div class="dots" data-role="d2"><b></b><b></b><b></b></div>
    <div class="a" data-role="a2" style="border-color:#F4C871"><div class="h">الحل: B</div><i style="width:60%"></i><i style="width:95%"></i><i style="width:40%"></i><i style="width:75%"></i></div>
  </div>
  <div class="neq" data-role="neq">≠</div>
`,
  js: `
const g=$('g'),c=$('c'),w1=$('w1'),w2=$('w2'),q1=$('q1'),q2=$('q2'),d1=$('d1'),d2=$('d2'),a1=$('a1'),a2=$('a2'),t1=$('t1'),neq=$('neq');
const dotsAnim=(d,t,s,e)=>{op(d,t>=s&&t<e?1:0);[...d.children].forEach((b,i)=>{b.style.transform='translateY('+(Math.sin((t-s)*9-i*.9)*-5).toFixed(1)+'px)';});};
function render(t){
  pop(g,t,.9);pop(c,t,1.7);
  pop(w1,t,2.3,'default');pop(q1,t,4.4);dotsAnim(d1,t,4.9,5.7);pop(a1,t,5.7);op(t1,clamp((t-8.4)*4));
  pop(w2,t,10.4,'default');pop(q2,t,12.6);dotsAnim(d2,t,13.2,15.8);pop(a2,t,15.8);
  const n=sp(t-16.4,'snappy');op(neq,clamp((t-16.4)*7));neq.style.transform='scale('+(.6+.4*n).toFixed(3)+')';
  ${OUT}
}`,
  sfx: [[0.9, 'pop'], [1.7, 'pop'], [2.3, 'whoosh'], [4.4, 'msg'], [5.7, 'msg'], [10.4, 'whoosh'], [12.6, 'msg'], [15.8, 'msg'], [16.4, 'thud', 0.6, 0.1]],
};
S.sb5b = { // B5b: same solution every time → suggests vs proven (+ the green band)
  css: `
#sb5b-scene .io{position:absolute;top:60px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:22px;direction:rtl}
#sb5b-scene .inp{height:120px;width:230px;border-radius:24px;background:#242424;border:2px solid #404040;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:600;text-align:center;line-height:1.25}
#sb5b-scene .box{height:120px;width:200px;border-radius:24px;background:#1F3327;border:2px solid #2FB161;display:flex;align-items:center;justify-content:center;font:700 44px/1 "IBM Plex Sans",sans-serif;direction:ltr}
#sb5b-scene .outs{display:flex;flex-direction:column;gap:12px}
#sb5b-scene .o{height:64px;width:210px;border-radius:18px;background:#242424;border:2px solid #2FB161;display:flex;align-items:center;justify-content:center;gap:10px;font-size:28px;font-weight:700}
#sb5b-scene .det{position:absolute;left:0;right:0;top:500px;display:flex;justify-content:center}
#sb5b-scene .half{position:absolute;top:96px;width:460px;height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
#sb5b-scene .half .t{font-size:46px;font-weight:700}
#sb5b-scene .band{position:absolute;left:0;right:0;top:214px;height:180px;background:#166434;display:flex;align-items:center;justify-content:center}
#sb5b-scene .band .bt{position:relative;font-size:84px;font-weight:700;color:#FFFFFF}
#sb5b-scene .band .ul{position:absolute;left:0;bottom:-6px;height:9px;background:#E85A02;border-radius:5px}
`,
  html: `${BG}
  <div class="io" data-role="io">
    <div class="inp" data-role="inp">نفس<br/>المدخلات</div>
    <svg width="60" height="30" viewBox="0 0 60 30"><path d="M58 15 L6 15 M18 4 L6 15 L18 26" fill="none" stroke="#999999" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="box" data-role="box">Solver</div>
    <svg width="60" height="30" viewBox="0 0 60 30"><path d="M58 15 L6 15 M18 4 L6 15 L18 26" fill="none" stroke="#999999" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="outs"><div class="o" data-role="o0">الحل ★ ✓</div><div class="o" data-role="o1">الحل ★ ✓</div><div class="o" data-role="o2">الحل ★ ✓</div></div>
  </div>
  <div class="det" data-role="det"><span class="tag mono" style="font-family:'IBM Plex Mono';font-size:30px">deterministic</span></div>
  <div class="half" data-role="sug" style="right:40px">
    <svg width="200" height="150" viewBox="0 0 200 150"><path d="M20 20 Q20 6 34 6 L166 6 Q180 6 180 20 L180 96 Q180 110 166 110 L70 110 L36 140 L40 110 L34 110 Q20 110 20 96 Z" fill="#242424" stroke="#404040" stroke-width="4"/><text x="100" y="80" text-anchor="middle" font-size="70" font-weight="700" fill="#E85A02" font-family="IBM Plex Sans">?</text></svg>
    <div class="t">بيقترح حل</div>
  </div>
  <div class="half" data-role="prv" style="left:40px">
    <svg width="230" height="150" viewBox="0 0 230 150"><rect x="6" y="6" width="218" height="138" rx="20" fill="#1F3327" stroke="#2FB161" stroke-width="4"/><text x="100" y="66" text-anchor="middle" font-size="34" fill="#F5F5F5" font-family="IBM Plex Mono">min f(x)</text><text x="100" y="110" text-anchor="middle" font-size="26" fill="#999999" font-family="IBM Plex Mono">gap = 0</text><circle cx="196" cy="34" r="20" fill="#166434"/><path d="M186 35 L193 42 L206 27" fill="none" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="t">مثبت رياضيًا</div>
  </div>
  <div class="band" data-role="band"><div class="bt">مثبت <span style="position:relative">رياضيًا<span class="ul" data-role="ul"></span></span></div></div>
`,
  js: `
const io=$('io'),box=$('box'),os=[$('o0'),$('o1'),$('o2')],det=$('det'),sug=$('sug'),prv=$('prv'),band=$('band'),ul=$('ul');
const BAND=!!P.band;
function render(t){
  const gone=tw(t,7.5,.35);
  pop(io,t,.2,'default');io.style.opacity=String(Math.min(+io.style.opacity,1-gone));
  pop(os[0],t,.9);pop(os[1],t,4.2);pop(os[2],t,6.6);op(det,clamp((t-6.9)*5)*(1-gone));
  box.style.boxShadow=(t>.9&&t<7.5&&((t%1.2)<.15))?'0 0 0 6px rgba(47,177,97,.35)':'none';
  pop(sug,t,7.85,'default');pop(prv,t,9.25,'default');
  const bOn=BAND&&t>=9.55&&t<10.75;op(band,bOn?1:0);band.style.transform='scaleY('+(bOn?sp(t-9.55,'snappy'):0).toFixed(3)+')';
  ul.style.width=(100*tw(t,9.85,.3))+'%';
  ${OUT}
}`,
  sfx: [[0.2, 'whoosh'], [0.9, 'tick'], [4.2, 'tick'], [6.6, 'tick'], [7.85, 'pop'], [9.25, 'pop']],
};
S.six = { // over CLIP 4: 600 people on the planet → 3 / 600
  css: `
#six-scene .pill{position:absolute;left:250px;right:250px;top:436px;height:136px;border-radius:30px;background:rgba(15,15,15,.88);border:2px solid #404040;direction:ltr;display:flex;align-items:center;justify-content:center;gap:20px}
#six-scene .n{font:700 84px/1 "IBM Plex Sans",sans-serif;color:#F5F5F5;direction:ltr;min-width:150px;text-align:center}
#six-scene .three{font:700 84px/1 "IBM Plex Sans",sans-serif;color:#E85A02;direction:ltr}
`,
  html: `<div class="pill" data-role="pill">
    <svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="36" fill="none" stroke="#2FB161" stroke-width="5"/><ellipse cx="42" cy="42" rx="15" ry="36" fill="none" stroke="#2FB161" stroke-width="4"/><line x1="6" y1="42" x2="78" y2="42" stroke="#2FB161" stroke-width="4"/></svg>
    <div class="three" data-role="three">3 /</div><div class="n" data-role="n">0</div></div>`,
  js: `
const pill=$('pill'),n=$('n'),three=$('three');const out3=x=>1-Math.pow(1-clamp(x),3);
function render(t){
  pop(pill,t,.5,'default');n.textContent=String(Math.round(600*out3((t-.6)/2.2)));
  const k=sp(t-7.65,'snappy');op(three,clamp((t-7.65)*7));three.style.display=t>=7.65?'block':'none';three.style.transform='scale('+(.6+.4*k).toFixed(3)+')';
  ${OUT}
}`,
  sfx: [[0.5, 'pop'], [2.8, 'tick'], [7.65, 'thud', 0.7, 0.12]],
};
S.sb6 = { // B6: 600 based on what? → no data → universities → OR-Tools → circles → not nuclear science
  css: `
#sb6-scene .six{position:absolute;left:0;right:0;top:120px;display:flex;justify-content:center;align-items:baseline;gap:10px;font:700 170px/1 "IBM Plex Sans",sans-serif;direction:ltr}
#sb6-scene .six .q{color:#E85A02}
#sb6-scene .item{position:absolute;display:flex;flex-direction:column;align-items:center;gap:14px;width:300px}
#sb6-scene .item .t{font-size:30px;font-weight:700;text-align:center}
#sb6-scene .ort{position:absolute;left:390px;top:150px;width:300px;display:flex;flex-direction:column;align-items:center;gap:14px}
#sb6-scene .ort .t{font:700 44px/1 "IBM Plex Sans",sans-serif;direction:ltr}
#sb6-scene .circ{position:absolute;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:700}
#sb6-scene .band{position:absolute;left:0;right:0;top:214px;height:180px;background:#166434;display:flex;align-items:center;justify-content:center;font-size:76px;font-weight:700;color:#FFF}
#sb6-scene .strike{position:absolute;height:10px;background:#E85A02;border-radius:5px;transform-origin:right center}
`,
  html: `${BG}
  <div class="six" data-role="six"><span>600</span><span class="q">?</span><div class="strike" data-role="st6" style="left:-10px;right:-10px;top:50%"></div></div>
  <div class="item" data-role="srch" style="right:40px;top:150px">
    <svg width="150" height="150" viewBox="0 0 150 150" style="overflow:visible"><rect x="10" y="20" width="100" height="14" rx="7" fill="#404040"/><rect x="10" y="56" width="80" height="14" rx="7" fill="#404040"/><rect x="10" y="92" width="94" height="14" rx="7" fill="#404040"/><g data-role="mag"><circle cx="0" cy="0" r="28" fill="rgba(15,15,15,.6)" stroke="#F5F5F5" stroke-width="7"/><line x1="20" y1="20" x2="42" y2="42" stroke="#F5F5F5" stroke-width="9" stroke-linecap="round"/></g></svg>
    <div class="t">مفيش أرقام دقيقة</div></div>
  <div class="item" data-role="uni" style="left:40px;top:150px">
    <svg width="160" height="150" viewBox="0 0 160 150"><path d="M10 50 L80 12 L150 50 Z" fill="#242424" stroke="#F5F5F5" stroke-width="5" stroke-linejoin="round"/><g fill="#F5F5F5"><rect x="26" y="58" width="12" height="62"/><rect x="58" y="58" width="12" height="62"/><rect x="90" y="58" width="12" height="62"/><rect x="122" y="58" width="12" height="62"/></g><rect x="10" y="124" width="140" height="14" rx="4" fill="#F5F5F5"/></svg>
    <div class="t">بيتدرّس في الجامعات</div></div>
  <div class="ort" data-role="ort">
    <img src="assets/img/google.svg" width="84" height="84" style="filter:invert(1)"/>
    <div class="t">OR-Tools</div>
    <span class="tag lat" data-role="os">Open Source</span>
    <span class="tag" data-role="free" style="background:#242424;color:#F5F5F5">أي حد يستخدمها</span>
  </div>
  <div class="circ" data-role="big" style="left:300px;top:64px;width:480px;height:480px;border:3px solid #404040;background:rgba(36,36,36,.6);align-items:flex-start;padding-top:60px;box-sizing:border-box;font-size:34px">فاهمين المجال</div>
  <div class="circ" data-role="small" style="left:455px;top:300px;width:170px;height:170px;background:#E85A02;color:#000;font-size:28px;line-height:1.2;padding:14px;box-sizing:border-box">بيبنوا Solver<br/>من الصفر</div>
  <div class="item" data-role="atom" style="left:390px;top:130px">
    <svg width="220" height="220" viewBox="0 0 220 220"><g fill="none" stroke="#F5F5F5" stroke-width="6"><ellipse cx="110" cy="110" rx="96" ry="36"/><ellipse cx="110" cy="110" rx="96" ry="36" transform="rotate(60 110 110)"/><ellipse cx="110" cy="110" rx="96" ry="36" transform="rotate(-60 110 110)"/></g><circle cx="110" cy="110" r="14" fill="#F5F5F5"/><line data-role="x" x1="20" y1="200" x2="200" y2="20" stroke="#F39191" stroke-width="14" stroke-linecap="round"/></svg>
    <div class="t" style="font-size:40px">مش علم نووي</div></div>
  <div class="band" data-role="band">600 بناءً على إيه؟</div>
`,
  js: `
const six=$('six'),st6=$('st6'),srch=$('srch'),mag=$('mag'),uni=$('uni'),ort=$('ort'),os=$('os'),free=$('free'),big=$('big'),small=$('small'),atom=$('atom'),x=$('x'),band=$('band');
const BAND=!!P.band;x.style.strokeDasharray='260';
function render(t){
  // 600 lands big, then shrinks to the top as the kicker and gets struck
  const k=pop(six,t,.15,'heavy');const sh=tw(t,2.1,.45);six.style.transform='translateY('+(-150*sh)+'px) scale('+(1-.62*sh)+')';
  st6.style.transform='scaleX('+tw(t,5.0,.35)+')';
  const ph=(s,e)=>clamp((t-s)*6)*(1-tw(t,e,.3));
  pop(srch,t,2.4,'default');srch.style.opacity=String(ph(2.4,11.9));mag.setAttribute('transform','translate('+(78+34*Math.sin((t-2.4)*2.2)).toFixed(1)+' '+(60+30*Math.cos((t-2.4)*1.7)).toFixed(1)+')');
  pop(uni,t,6.3,'default');uni.style.opacity=String(ph(6.3,11.9));
  pop(ort,t,9.4,'default');ort.style.opacity=String(ph(9.4,11.9));pop(os,t,8.0>9.4?8:9.7);pop(free,t,11.0);
  six.style.opacity=String(Math.min(+six.style.opacity,1-tw(t,11.9,.3)));
  pop(big,t,12.3,'default');big.style.opacity=String(ph(12.3,17.9));pop(small,t,16.9,'snappy');small.style.opacity=String(ph(16.9,17.9));
  pop(atom,t,18.2,'default');x.style.strokeDashoffset=String(260*(1-tw(t,19.0,.3)));
  const bOn=BAND&&t>=.25&&t<1.45;op(band,bOn?1:0);band.style.transform='scaleY('+(bOn?sp(t-.25,'snappy'):0).toFixed(3)+')';
  ${OUT}
}`,
  sfx: null, // per instance (needle on the band)
};
S.sb7 = { // B7: freeze the last show frame, "to be continued"
  css: `
#sb7-scene img{position:absolute;left:0;top:0;width:1080px;height:608px;object-fit:cover;filter:brightness(.4)}
#sb7-scene .t{position:absolute;left:0;right:0;top:250px;display:flex;justify-content:center;font-size:72px;font-weight:700}
`,
  html: `<img src="assets/img/c5b-last.jpg"/><div class="t" data-role="t"></div>`,
  js: `const tt=$('t');function render(t){typed(tt,'يتبع…',t,.4,8,true);}`,
  sfx: [[0.4, 'type', 0.5]],
};
// hooks: full frame, sitting on the seam between the panels
const HOOK_CSS = `
.hk .stamp{position:absolute;left:60px;right:60px;top:${PY + 280}px;display:flex;flex-direction:column;align-items:center;gap:12px}
.hk .line{padding:18px 40px;border-radius:30px;background:#0F0F0F;border:3px solid #E85A02;font-size:76px;font-weight:700;line-height:1.15;text-align:center}
.hk .sub{padding:10px 26px;border-radius:20px;background:#E85A02;color:#000;font-size:40px;font-weight:700}
`;
const hook = (id, line, sub, end) => ({ w: W, h: H, css: HOOK_CSS,
  html: `<div class="hk"><div class="stamp" data-role="st"><div class="line" data-role="line"></div>${sub ? '<div class="sub" data-role="sub"></div>' : ''}</div></div>`,
  js: `const st=$('st'),line=$('line'),sub=$('sub');
function render(t){const k=sp(t-.1,'heavy');op(st,clamp((t-.1)*8));st.style.transform='scale('+(1.25-.25*k).toFixed(3)+')';
  typed(line,${JSON.stringify(line)},t,.15,16,true);if(sub)typed(sub,${JSON.stringify(sub || '')},t,${line.length / 16 + .4},18,false);
  ${OUT}}`,
  sfx: [[0.1, 'thud', 0.8, 0.13], [0.15, 'type', line.length / 16]],
});
S.hookA = hook('hookA', '700 مليون جنيه؟', 'والـAI يعملها بسهولة؟');
S.hookB = hook('hookB', '600 شخص بس في العالم؟', null);
S.hookC = hook('hookC', 'أنهي AI بالظبط؟', null);

// ---------- captions ----------
const CONNECT = new Set(['و', 'في', 'من', 'على', 'عن', 'اللي', 'إن', 'لو', 'بس', 'ده', 'دي', 'هو', 'هي', 'أو', 'مش', 'إنه', 'الـ', 'بـ', 'لـ']);
function chunkSeg(s, e, ar) {
  const words = ar.split(' ').filter(Boolean).map((w) => ({ star: w.includes('*'), w: w.replace(/\*/g, '').replace(/~/g, ' ') }));
  const wt = words.map((x) => x.w.length + 2); const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0; const span = Math.max(0.3, e - s - 0.08);
  words.forEach((x, i) => { x.t = r3(s + (acc / tot) * span); acc += wt[i]; });
  const chunks = []; let cur = [];
  const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
  words.forEach((x, i) => {
    cur.push(x);
    const chars = cur.reduce((a, y) => a + y.w.length + 1, 0);
    const last = i === words.length - 1;
    const endsOnConnector = CONNECT.has(x.w) || x.w.endsWith('الـ');
    if (!last && !endsOnConnector && (cur.length >= 4 || chars >= 22)) flush();
  });
  flush();
  // a chunk is on screen from its first word to the next chunk (or the line end)
  return chunks.map((c, i) => ({ s: c[0].t, e: r3(i < chunks.length - 1 ? chunks[i + 1][0].t : e), w: c.map((x) => [x.w, x.t, x.star ? 1 : 0]) }));
}
function captionsFile(id, ar, en, D, mid = []) {
  return `<!doctype html>
<html><head><meta charset="UTF-8" /></head><body><template>
<style>
${fontFaces()}
#${id}-cap{position:absolute;inset:0;pointer-events:none}
#${id}-cap .stack{position:absolute;left:140px;right:140px;top:${BY + 22}px;display:flex;flex-direction:column;align-items:center;gap:8px}
#${id}-cap .ar{display:flex;justify-content:center;flex-wrap:wrap;gap:0 .26em;direction:rtl;font:700 60px/1.3 "IBM Plex Sans Arabic","IBM Plex Sans",sans-serif;color:#F5F5F5;-webkit-text-stroke:9px rgba(10,17,26,.9);paint-order:stroke fill;text-align:center}
#${id}-cap .ar span{display:inline-block;unicode-bidi:isolate}
#${id}-cap .ar span.k{background:#E85A02;color:#000;-webkit-text-stroke:0;border-radius:14px;padding:0 .2em}
#${id}-cap .en{text-align:center;direction:ltr;font:500 34px/1.3 "IBM Plex Sans",sans-serif;color:rgba(245,245,245,.94);-webkit-text-stroke:6px rgba(10,17,26,.9);paint-order:stroke fill}
</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
  <div id="${id}-cap"><div class="stack"><div class="ar" data-role="ar"></div><div class="en" data-role="en"></div></div></div>
</div>
<script>
(function(){
const AR=${JSON.stringify(ar)};
const EN=${JSON.stringify(en)};
const cap=document.getElementById('${id}-cap'),ar=cap.querySelector('[data-role="ar"]'),en=cap.querySelector('[data-role="en"]');
const MID=${JSON.stringify(mid)},stack=cap.querySelector('.stack');
let curA=-1,curE=-1,curM=-1,spans=[];
function render(t){
  const m=MID.some(w=>t>=w[0]&&t<w[1])?1:0;
  if(m!==curM){curM=m;stack.style.top=m?'auto':'';stack.style.bottom=m?'${H - MY + 24}px':'';}
  let a=-1;for(let i=0;i<AR.length;i++){if(t>=AR[i].s&&t<AR[i].e){a=i;break;}}
  if(a!==curA){curA=a;ar.innerHTML='';spans=[];if(a>=0){AR[a].w.forEach(w=>{const s=document.createElement('span');s.textContent=w[0];ar.appendChild(s);spans.push(s);});}}
  if(a>=0)AR[a].w.forEach((w,i)=>{const on=t>=w[1];spans[i].style.opacity=on?'1':'0';spans[i].className=(w[2]&&on)?'k':'';});
  let e=-1;for(let i=0;i<EN.length;i++){if(t>=EN[i].s&&t<EN[i].e){e=i;break;}}
  if(e!==curE){curE=e;en.textContent=e>=0?EN[e].x:'';}
}
const tl=gsap.timeline({paused:true}),clock={t:0};
tl.to(clock,{t:${D},duration:${D},ease:'none',onUpdate:()=>render(clock.t)},0);
render(0);
window.__timelines["${id}"]=tl;
})();
</script>
</template></body></html>
`;
}

// ---------- build one variant ----------
function build(name) {
  const V = VARIANTS[name];
  const dir = path.join(HERE, name);
  fs.rmSync(path.join(dir, 'compositions'), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'compositions'), { recursive: true });
  // 9k registry blocks (installed once in shared/ with `npx hyperframes add 9k`), copied so Studio edits stay per version
  for (const sub of ['compositions', 'compositions/components']) { const from = path.join(SH, sub); if (!fs.existsSync(from)) continue; fs.mkdirSync(path.join(dir, sub), { recursive: true }); for (const f of fs.readdirSync(from)) if (f.endsWith('.html')) fs.copyFileSync(path.join(from, f), path.join(dir, sub, f)); }
  // assets: hard links to shared
  const link = (rel) => { const s = path.join(SH, rel), d = path.join(dir, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); if (fs.existsSync(d) && fs.statSync(d).ino === fs.statSync(s).ino) return; fs.rmSync(d, { force: true }); fs.linkSync(s, d); }; // relink when shared/ was replaced
  for (const sub of ['assets', 'assets/fonts', 'assets/sfx', 'assets/img']) for (const f of fs.readdirSync(path.join(SH, sub))) if (fs.statSync(path.join(SH, sub, f)).isFile()) link(path.join(sub, f));
  fs.writeFileSync(path.join(dir, 'hyperframes.json'), JSON.stringify({ $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', registry: 'https://raw.githubusercontent.com/ismail9k/motion/main/registry', paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' }, media: { autoProxy: true } }, null, 2));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'shark-or-' + name.toLowerCase(), private: true, type: 'module', scripts: { dev: 'npx --yes hyperframes@0.9.77 preview', check: 'npx --yes hyperframes@0.9.77 check', render: 'npx --yes hyperframes@0.9.77 render' } }, null, 2));

  const topEls = [], botEls = [], midEls = [], midWin = [], hosts = [], arCaps = [], enCaps = [];
  let T = 0, listenCur = 0, vid = 0;
  const seg = (s, e) => ({ s: r3(s), e: r3(e) });
  for (const it of V.items) {
    if (it.t === 'clip') {
      const c = CLIPS[it.id], cd = r3(c.d / SHOW_RATE), R = SHOW_RATE;
      const showV = `<video id="v${vid++}" class="clip ${V.center ? 'midv' : 'topv'}" data-layout-ignore src="assets/${c.file}" playsinline data-has-audio="true" data-start="${r3(T)}" data-duration="${cd}" data-media-start="0" data-playback-rate="${R}" data-track-index="1" data-volume="${clipGain(it.id)}"></video>`;
      if (V.center) {
        // the show alone, centred on a dark frame
        midEls.push(`<div id="cov${vid}" class="clip cov" data-start="${r3(T)}" data-duration="${cd}" data-track-index="7"></div>`, showV);
        midWin.push([r3(T), r3(T + cd)]);
      } else topEls.push(showV);
      // listening shot below (normal speed)
      if (listenCur + cd > LISTEN_D) listenCur = 0;
      if (!V.center) botEls.push(`<video id="v${vid++}" class="clip botv" data-layout-ignore src="assets/listen.mp4" muted playsinline data-start="${r3(T)}" data-duration="${cd}" data-media-start="${r3(listenCur)}" data-track-index="2" style="transform:${V.mirror ? 'scaleX(-1) ' : ''}scale(1.0)"></video>`);
      listenCur += cd;
      if (it.over) hosts.push({ scene: it.over, start: T, d: r3((it.id === 'c4a' ? CLIPS.c4a.d + CLIPS.c4b.d : c.d) / R), p: { ...it.p, rate: R }, track: 4, mid: !!V.center });
      for (const [s, e, ar, en] of CL[it.id]) { const ss = T + s / R, ee = T + Math.min(e, c.d) / R; arCaps.push(...chunkSeg(ss, ee, ar)); enCaps.push({ s: r3(ss), e: r3(ee), x: en }); }
      T += cd;
    } else {
      const blockStart = T;
      for (const [a, b] of it.parts) {
        // split at jump cuts → alternate punch
        const cuts = [a, ...EDGES.filter((x) => x > a + 0.05 && x < b - 0.05), b];
        for (let i = 0; i < cuts.length - 1; i++) {
          const ms = cuts[i], me = cuts[i + 1];
          const idx = EDGES.findIndex((x) => x >= ms - 0.05); const sc = idx % 2 ? V.punch : 1;
          botEls.push(`<video id="v${vid++}" class="clip botv" data-layout-ignore src="assets/vo.mp4" playsinline data-has-audio="true" data-start="${r3(T + (ms - a))}" data-duration="${r3(me - ms)}" data-media-start="${r3(ms)}" data-track-index="0" style="transform:${V.mirror ? 'scaleX(-1) ' : ''}scale(${sc})"></video>`);
        }
        for (const [s, e, ar, en] of VO_NEW) {
          const ov = Math.min(e, b) - Math.max(s, a);
          if (ov < 0.3) continue;
          const ss = T + Math.max(s, a) - a, ee = T + Math.min(e, b) - a;
          arCaps.push(...chunkSeg(ss, ee, ar)); enCaps.push({ s: r3(ss), e: r3(ee), x: en });
        }
        T += b - a;
      }
      hosts.push({ scene: it.scene, start: blockStart, d: T - blockStart, p: it.p, track: 3 });
    }
  }
  const TOTAL = r3(T);
  const MIDW = midWin.reduce((a, w) => { const l = a[a.length - 1]; if (l && w[0] - l[1] < 0.01) l[1] = w[1]; else a.push([...w]); return a; }, []);
  // english line holds through tiny gaps
  enCaps.forEach((c, i) => { const n = enCaps[i + 1]; if (n && n.s - c.e < 0.35) c.e = n.s; });
  hosts.push({ scene: V.hook, start: 0, d: name === 'A' ? r3(CLIPS.c1a.d / SHOW_RATE) : name === 'B' ? 2.8 : 3.4, p: {}, track: 5, full: true });

  // scene files
  const used = new Set(hosts.map((h) => h.scene));
  for (const id of used) {
    const sc = S[id];
    const host = hosts.find((h) => h.scene === id);
    let sfx = sc.sfx;
    if (id === 'sb4a') { const c = host.p.checkAt, cv = host.p.curveAt; sfx = [[1.9, 'thud', 1.0, 0.17], [3.3, 'tick'], [c, 'ding', 1.2], ...(cv < 90 ? [[cv, 'whoosh'], [cv + 3, 'bass', 1.2, 0.12]] : [])]; }
    if (id === 'sb6') sfx = [...(host.p.band ? [[0.25, 'needle']] : [[0.15, 'thud', 0.8, 0.12]]), [2.4, 'pop'], [5.0, 'click'], [6.3, 'pop'], [9.4, 'pop'], [9.7, 'pop'], [11.0, 'pop'], [12.3, 'whoosh'], [16.9, 'pop'], [18.2, 'pop'], [19.0, 'needle', 0.5, 0.08]];
    if (id === 'sb1' && host.p.kickAt) sfx = sfx.map((x, i) => (i === 0 ? [host.p.kickAt, ...x.slice(1)] : x));
    if (id === 'sb5b' && host.p.band) sfx = [...sfx, [9.55, 'bass', 1.4]];
    fs.writeFileSync(path.join(dir, 'compositions', id + '.html'), sceneFile({ id, w: sc.w || W, h: sc.h || TOP, css: id.startsWith('hook') && V.center ? sc.css.replace('top:280px;', `top:${MY + TOP + 48}px;`) : sc.css, html: sc.html, js: sc.js, sfx, d: host.d, p: host.p || {} }));
  }
  const capId = 'cap' + name;
  fs.writeFileSync(path.join(dir, 'compositions', capId + '.html'), captionsFile(capId, arCaps, enCaps, TOTAL, MIDW));

  const hostTag = (h) => `<div id="h-${h.scene}" data-composition-id="${h.scene}" data-composition-src="compositions/${h.scene}.html" data-start="${r3(h.start)}" data-duration="${r3(h.d)}" data-track-index="${h.track}" data-width="${h.full ? W : W}" data-height="${h.full ? H : TOP}" data-p='${JSON.stringify(h.p || {})}' style="position:absolute;left:0;top:${h.mid ? MY : 0}px;width:${W}px;height:${h.full ? H : TOP}px"></div>`;
  const html = `<!doctype html>
<html lang="ar" data-resolution="portrait">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0F0F0F}
#root{position:relative;width:100%;height:100%;overflow:hidden;background:#0F0F0F}
#top{position:absolute;left:0;top:${PY}px;width:${W}px;height:${TOP}px;overflow:hidden;background:#0F0F0F}
#bot{position:absolute;left:0;top:${BY}px;width:${W}px;height:${H - BY}px;overflow:hidden;background:#000}
#top video{position:absolute;left:0;top:0;width:${W}px;height:${TOP}px;object-fit:cover}
#bot video{position:absolute;left:0;top:${VOY}px;width:${W}px;height:${H}px;transform-origin:540px 660px}
#seam{position:absolute;left:0;top:${BY - 2}px;width:${W}px;height:4px;background:#0F0F0F}
#mid{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
#mid .cov{position:absolute;left:0;top:0;width:${W}px;height:${H}px;background:#0F0F0F}
#mid video{position:absolute;left:0;top:${MY}px;width:${W}px;height:${TOP}px;object-fit:cover}
#shade{position:absolute;left:0;top:${BY}px;width:${W}px;height:300px;background:linear-gradient(to bottom,rgba(10,17,26,.62),rgba(10,17,26,.38) 60%,rgba(10,17,26,0))}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="${W}" data-height="${H}" data-duration="${TOTAL}">
 <div id="top">
  ${topEls.join('\n  ')}
  ${hosts.filter((h) => !h.full && !h.mid).map(hostTag).join('\n  ')}
 </div>
 <div id="bot">
  ${botEls.join('\n  ')}
 </div>
 <div id="seam"></div>
 <div id="shade"></div>
 <div id="mid">
  ${midEls.join('\n  ')}
  ${hosts.filter((h) => h.mid).map(hostTag).join('\n  ')}
 </div>
 ${hosts.filter((h) => h.full).map(hostTag).join('\n ')}
 <div id="h-${capId}" data-composition-id="${capId}" data-composition-src="compositions/${capId}.html" data-start="0" data-duration="${TOTAL}" data-track-index="6" data-width="${W}" data-height="${H}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px"></div>
</div>
<script>
const tl=gsap.timeline({paused:true});
window.__timelines["main"]=tl;
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(dir, 'index.html'), html.replaceAll('CLIPVOL', String(VARIANTS.clipVol ?? 1)));
  console.log(`${name}: ${TOTAL}s · ${hosts.length} scenes · ${arCaps.length} caption chunks · ${botEls.length + topEls.length} video clips`);
}
const only = process.argv[2];
for (const n of ['A', 'B', 'C']) if (!only || only === n) build(n);
