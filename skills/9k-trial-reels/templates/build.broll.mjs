// EXAMPLE generator for a TALK WITH B-ROLL (no reference video), from a real film (Claude Code /insights, Nov 2026).
// Copy to <project>/hf/build.mjs and rewrite VO, B, BROLL, LISTS, TAGS, PROMPT and VARIANTS; keep the machinery
// (cut remap, layouts full/broll/card/split/tags, captions, asset relink). See references/build.md → "A talk with b-roll".
// Three trial-reel versions of "Claude Code /insights" from one spec.   node build.mjs [A|B|C]
// Layout: him full frame with captions on his chest; the screen recordings as full-frame cutaways under his voice
// (pre-cropped onto the dark frame in shared/assets/br-*.mp4); the prompt as a full-frame card; the two lists in the
// split layout (list scene in the 1080x608 top panel); small tag pills above his head.
// Every time below is written in the cut it was built against (work/keep.built.json) and remapped through raw-take
// time onto the current cut (work/keep.json), so a later trim moves captions and beats with the words.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SH = path.join(HERE, 'shared');
const PIN = '0.9.104';
const W = 1080, H = 1920, TOP = 608, SPLIT_Y = 404;
const r3 = (x) => Math.round(x * 1000) / 1000;
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();

// ---------- the cut ----------
const readKeep = (f) => JSON.parse(fs.readFileSync(path.join(HERE, '../work', f), 'utf8'));
const KEEP = readKeep('keep.json'), KEEP_OLD = readKeep('keep.built.json');
const edgesOf = (k) => { const e = [0]; for (const [a, b] of k) e.push(e.at(-1) + b - a); return e; };
const EDGES = edgesOf(KEEP), OLD_EDGES = edgesOf(KEEP_OLD);
// built-cut time → raw-take time → current-cut time (null when that moment was cut out)
const srcOf = (t) => { for (let i = 0; i < KEEP_OLD.length; i++) if (t < OLD_EDGES[i + 1] - 1e-6) return KEEP_OLD[i][0] + Math.max(0, t - OLD_EDGES[i]); return KEEP_OLD.at(-1)[1]; };
const outOf = (x) => { for (let i = 0; i < KEEP.length; i++) if (x >= KEEP[i][0] - 0.02 && x <= KEEP[i][1] + 0.02) return EDGES[i] + Math.min(Math.max(0, x - KEEP[i][0]), KEEP[i][1] - KEEP[i][0]); return null; };
const now = (t) => outOf(srcOf(t));
const nowEnd = (t) => outOf(srcOf(t - 0.005)) ?? null; // an end time belongs to the piece before it
const T = (t) => { const v = now(t); if (v === null) throw new Error('time ' + t + ' was cut: fix build.mjs'); return v; };

// ---------- his lines (built-cut time, from whisper word times on vo.mp4): * = orange keyword pill, ~ = keep together ----------
const VO = [
  [0.00, 1.95, 'لو بتصلّح نفس *الغلطة لـClaude كل يوم', 'If you fix the same Claude mistake every day,'],
  [1.95, 3.60, 'فغالبًا إنت اللي بتستخدمه *غلط', "you're probably the one using it wrong."],
  [3.63, 5.50, 'بالطريقة دي هتخلّي Claude *يغلط~أقل', 'This way Claude makes fewer mistakes,'],
  [5.50, 6.50, 'يوفّرلك *توكنز', 'saves you tokens,'],
  [6.50, 8.50, 'وكمان يطلّعلك نتيجة *أحسن~بكتير', 'and gives you much better results.'],
  [8.53, 10.75, 'هتفتح Claude~Code وتكتب */insights', 'Open Claude Code and type /insights.'],
  [10.77, 13.75, 'الكوماند ده بيحلّلك كل *المحادثات~السابقة مع Claude', 'It analyzes all your past chats with Claude'],
  [13.75, 16.85, 'وبيطلّعلك *تقرير~شامل عن طريقة شغلك معاه', 'and gives you a full report on how you work with it:'],
  [16.87, 19.28, 'إيه اللي مشي *كويس، وفين Claude فهم غلط', 'what went well, where Claude got it wrong,'],
  [19.30, 21.15, 'وإيه اللي ممكن *تحسّنه في طريقة شغلك معاه', 'and what you can improve in how you work with it'],
  [21.15, 22.90, 'بحيث إنه يطلّعلك *نتيجة~أفضل', 'so it gives you better results.'],
  [22.93, 23.87, 'التقرير ده *كنز', 'This report is a treasure.'],
  [23.87, 24.75, 'اقراه *كويس~أوي', 'Read it carefully.'],
  [24.77, 26.90, 'بعد كده هتاخد *البرومت اللي هتلاقيها على الشاشة دي', 'Then take the prompt on this screen'],
  [26.90, 27.70, 'وديها لـ*Claude', 'and give it to Claude.'],
  [27.73, 29.20, 'البرومت دي باختصار *بتقوله', 'In short, it tells it:'],
  [29.20, 31.70, 'استخرج من التقرير ده *التعليمات', '"Pull the instructions out of this report'],
  [31.70, 32.48, 'اللي هتساعدنا نوفّر في *التوكنز', 'that help us save tokens'],
  [32.48, 34.05, 'ونقلّل في تكرار *الأخطاء', 'and repeat fewer mistakes."'],
  [34.07, 37.55, 'بعد كده هتاخد التعليمات دي وهتضيفها في *CLAUDE.md الجلوبال', 'Then add those instructions to your global CLAUDE.md.'],
  [37.57, 39.50, 'فبكده كل ما تبدأ *سيشن~جديدة مع Claude', 'So every time you start a new session with Claude,'],
  [39.50, 42.30, 'هيبقى عنده التعليمات دي وهيلتزم بيها *من~البداية', 'it already has these instructions and follows them from the start.'],
  [42.33, 44.00, 'ولو إنت بقى *9K~developer', "And if you're a 9K developer,"],
  [44.03, 46.30, 'قوله بقى حوّل كل اللي إحنا عملناه ده *لسكيل', 'tell it to turn everything we just did into a skill'],
  [46.33, 48.28, 'وترَن السكيل دي *كل~شهر', 'and run that skill every month,'],
  [48.30, 50.90, 'بحيث إن Claude يتعلّم كل مرة من *طريقة~شغلك', 'so Claude learns from how you work every time'],
  [50.93, 52.00, 'وما يكررش *الأخطاء', "and doesn't repeat mistakes."],
  [52.03, 53.40, 'ولو عايز بقى السكيل *جاهزة', 'If you want the skill ready-made,'],
  [53.43, 55.60, 'فاكتب *9K في الكومنتس وهبعتهالك', "write 9K in the comments and I'll send it."],
  [55.62, 58.20, 'بس برضو لازم تقرا *التقرير بتاع الإنسايتس', 'But you still have to read the Insights report.'],
  [58.20, 59.40, '*سلام', 'Bye!'],
];
// ---------- blocks (built-cut time): one idea each, the unit the versions reorder ----------
const B = { h1: [0, 3.63], h2: [3.63, 8.53], open: [8.53, 10.77], report: [10.77, 16.87], what: [16.87, 22.93], gem: [22.93, 24.77],
  prompt: [24.77, 34.07], md: [34.07, 37.57], session: [37.57, 42.33], skill: [42.33, 52.03], skillShort: [44.03, 46.33], cta: [52.03, 59.43] };
// b-roll cutaways (pre-cropped 1080x1920, sped to fit): file per block
const BROLL = { open: 'br-insights.mp4', report: 'br-report.mp4', md: 'br-claudemd.mp4' };
// beats (built-cut time) for each block's graphic
const LISTS = {
  what: { title: 'Insights report', rows: [[16.80, 'ok', 'إيه اللي مشي كويس'], [17.92, 'x', 'فين Claude فهم غلط'], [19.31, 'up', 'إيه اللي تقدر تحسّنه']] },
  skill: { title: '9K developer', at: 42.59, rows: [[45.40, 'code', 'حوّل كل ده لـskill'], [47.70, 'loop', 'شغّلها كل شهر'], [49.19, 'ok', 'Claude يتعلّم من شغلك']] },
};
const TAGS = {
  session: [[37.70, 'CLAUDE.md', 'Claude بيقراه في أول كل سيشن']],
  skillShort: [[45.40, '/insights → skill', 'حوّل كل ده لسكيل']],
  cta: [[53.75, '9K', 'اكتبها في الكومنتس'], [56.30, '/insights', 'بس اقرا التقرير بنفسك']],
};
const PROMPT = "this is my Claude Insights file. It describes, at a high level, a few of the obvious design patterns in my thinking and then a couple of the issues that I've had communicating with you and other versions of you. I'd like you to distill this into a list of high-information-density snippets that I can paste into a global Claude.md to be both token-conservative but also avoid most of the mistakes that you typically make.";
const PROMPT_HI = [[29.24, 'distill this into a list of high-information-density snippets'], [31.76, 'token-conservative'], [32.51, 'avoid most of the mistakes']];

const vo = (name, p = {}) => ({ t: 'vo', name, ...p });
const VARIANTS = {
  // A: the full story. Opens on the problem hook, everything in order.
  A: { punch: 1.06, hook: { line: 'نفس الغلطة كل يوم؟', d: 3.4 }, items: [vo('h1'), vo('open', { broll: 1 }), vo('report', { broll: 1 }), vo('what', { split: 1 }),
    vo('gem', { band: 1 }), vo('prompt', { card: 1 }), vo('md', { broll: 1 }), vo('session', { tags: 1 }), vo('skill', { split: 1 }), vo('cta', { tags: 1 })] },
  // B: payoff first. Opens on the promise hook, drops the "what went well" detail.
  B: { punch: 1.10, hook: { line: 'خلّي Claude يغلط أقل', d: 3.4 }, items: [vo('h2'), vo('open', { broll: 1 }), vo('report', { broll: 1 }),
    vo('gem', { band: 1 }), vo('prompt', { card: 1 }), vo('md', { broll: 1 }), vo('session', { tags: 1 }), vo('skill', { split: 1 }), vo('cta', { tags: 1 })] },
  // C: the short one. Straight to the command with a typed title, the lesson, one line of the skill, the CTA.
  C: { punch: 1.06, hook: { line: 'أهم أمر في Claude Code', d: 2.2 }, items: [vo('open'), vo('report', { broll: 1 }), vo('gem', { band: 1 }),
    vo('prompt', { card: 1 }), vo('md', { broll: 1 }), vo('session', { tags: 1 }), vo('skillShort', { tags: 1 }), vo('cta', { tags: 1 })] },
};

// ---------- scene pieces ----------
const FONTS = [['IBM Plex Sans Arabic', 'ibm-plex-sans-arabic-arabic', 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'],
  ['IBM Plex Sans Arabic', 'ibm-plex-sans-arabic-latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ['IBM Plex Sans', 'ibm-plex-sans-latin', null]];
const fontFaces = () => FONTS.flatMap(([fam, file, range]) => [400, 600, 700].map((w) =>
  `@font-face{font-family:"${fam}";src:url("assets/fonts/${file}-${w}-normal.woff2") format("woff2");font-weight:${w};font-display:block${range ? ';unicode-range:' + range : ''}}`)).join('\n') +
  '\n@font-face{font-family:"IBM Plex Mono";src:url("assets/fonts/ibm-plex-mono-latin-400-normal.woff2") format("woff2");font-weight:400;font-display:block}' +
  '\n@font-face{font-family:"IBM Plex Mono";src:url("assets/fonts/ibm-plex-mono-latin-700-normal.woff2") format("woff2");font-weight:700;font-display:block}';
const HELPERS = `
const clamp=(x,a,b)=>Math.min(b===undefined?1:b,Math.max(a===undefined?0:a,x));
function spring(t,k,d){if(t<=0)return 0;const w0=Math.sqrt(k),z=d/(2*w0);if(z<1){const wd=w0*Math.sqrt(1-z*z);return 1-Math.exp(-z*w0*t)*(Math.cos(wd*t)+(z*w0/wd)*Math.sin(wd*t));}return 1-Math.exp(-w0*t)*(1+w0*t);}
const SPR={snappy:[320,34],default:[170,26],heavy:[120,24]};
const sp=(t,p)=>{const s=SPR[p||'default'];return spring(t,s[0],s[1]);};
function bez(x1,y1,x2,y2){const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;const sx=s=>((ax*s+bx)*s+cx)*s,sy=s=>((ay*s+by)*s+cy)*s;return x=>{x=clamp(x);let s=x;for(let i=0;i<8;i++){const dx=(3*ax*s+2*bx)*s+cx;if(Math.abs(dx)<1e-6)break;s-=(sx(s)-x)/dx;}return sy(clamp(s));};}
const e9=bez(.4,0,.2,1);
const tw=(t,s,d)=>e9(clamp((t-s)/d));
const op=(el,a)=>{el.style.opacity=String(clamp(a));};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
function typed(el,txt,t,s,cps,keep){const n=Math.max(0,Math.min(txt.length,Math.floor((t-s)*(cps||20))));const typing=n<txt.length&&t>=s;const blink=((t-s)%1.06)<.53;const show=t>=s&&(typing||(keep&&blink));el.innerHTML=esc(txt.slice(0,n))+(show?'<span class="caret"></span>':'');return n;}
const pop=(el,t,s,p)=>{const k=sp(t-s,p||'snappy');op(el,clamp((t-s)*7));el.style.transform='translateY('+((1-k)*24).toFixed(1)+'px) scale('+(0.94+0.06*k).toFixed(4)+')';return k;};
`;
// sfx: name → [file, length, gain]. Gains sit 10–14 dB under his voice (-24.3 LUFS).
const SFX = { pop: ['pop-hand', 0.348, 0.05], whoosh: ['fast-whoosh', 0.394, 0.06], click: ['mouse-click-2', 0.186, 0.1], thud: ['dull-thud', 1.393, 0.1],
  type: ['keyboard-typing-realistic', 3.39, 0.08], ding: ['notification-ding', 1.997, 0.05], needle: ['sideways-record-needle', 0.58, 0.09], bass: ['bass-impact', 2.461, 0.12] };
let sfxN = 0;
const sfxTag = (t, name, len) => { const [file, L, g] = SFX[name]; const i = sfxN++; return `<audio id="sfx${i}" class="clip" src="assets/sfx/${file}.wav" data-start="${r3(t)}" data-duration="${r3(Math.min(L, len || L))}" data-volume="${g}" data-track-index="${20 + (i % 5)}"></audio>`; };

// one scene file: a paused timeline drives render(t) over DN seconds (block-local time)
function sceneFile(id, w, h, D, css, html, js) {
  return `<!doctype html>
<html><head><meta charset="UTF-8" /></head><body><template>
<style>
${fontFaces()}
#${id}-scene{position:absolute;inset:0;overflow:hidden;color:#F5F5F5;font-family:"IBM Plex Sans Arabic","IBM Plex Sans",sans-serif;-webkit-font-smoothing:antialiased}
#${id}-scene .caret{display:inline-block;width:.08em;height:.9em;margin:0 .04em;background:#E85A02;vertical-align:-.1em}
#${id}-scene .glow{position:absolute;width:760px;height:760px;border-radius:50%;filter:blur(90px);opacity:.2;left:-300px;top:-420px;background:#166434}
${css}
</style>
<div id="root" data-composition-id="${id}" data-width="${w}" data-height="${h}">
 <div id="${id}-scene">
${html}
 </div>
</div>
<script>
(function(){
${HELPERS}
const root=document.getElementById('${id}-scene');
const $=(r)=>root.querySelector('[data-role="'+r+'"]');
const DN=${r3(D)};
${js}
const tl=gsap.timeline({paused:true}),clock={t:0};
tl.to(clock,{t:DN,duration:DN,ease:'none',onUpdate:()=>render(clock.t)},0);
render(0);
window.__timelines["${id}"]=tl;
})();
</script>
</template></body></html>
`;
}
const ICON = { ok: ['#2FB161', 'M12 25l8 8l16-18'], x: ['#F39191', 'M14 14l20 20M34 14l-20 20'], up: ['#E85A02', 'M24 36V12M13 23l11-11l11 11'],
  code: ['#F5F5F5', 'M17 14l-9 10l9 10M31 14l9 10l-9 10'], loop: ['#F4C871', 'M36 20a13 13 0 1 0 1 9M36 10v10h-10'] };
// a list he walks through: title typed, each row lands on its word (top panel, 1080x608)
function listFile(id, D, title, titleAt, rows) {
  const css = `
#${id}-scene{background:#0F0F0F}
#${id}-scene .ttl{position:absolute;left:0;right:0;top:44px;text-align:center;direction:ltr;font:700 54px/1 "IBM Plex Sans",sans-serif}
#${id}-scene .row{position:absolute;right:110px;left:110px;height:118px;border-radius:28px;background:#1A1A1A;border:2px solid #404040;display:flex;align-items:center;gap:28px;padding:0 30px;direction:rtl;font-size:46px;font-weight:700}
#${id}-scene .ic{flex:none;width:74px;height:74px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#242424}
#${id}-scene .ic svg{width:46px;height:46px}`;
  const html = `  <div class="glow" data-layout-ignore></div>
  <div class="ttl" data-role="ttl"></div>
${rows.map(([, ic, label], i) => `  <div class="row" data-role="r${i}" style="top:${150 + i * 142}px"><div class="ic" style="border:3px solid ${ICON[ic][0]}"><svg viewBox="0 0 48 48" fill="none" stroke="${ICON[ic][0]}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[ic][1]}"/></svg></div><span>${label.replace(/(skill|Claude)/g, '<span style="font-family:IBM Plex Sans">$1</span>')}</span></div>`).join('\n')}`;
  const js = `const AT=${JSON.stringify(rows.map((r) => r[0]))},TA=${r3(titleAt)};
function render(t){
  typed($('ttl'),${JSON.stringify(title)},t,TA,24,true);
  AT.forEach((a,i)=>pop($('r'+i),t,a));
  op(root,Math.min(clamp(t*6),1-tw(t,DN-.25,.25)));
}`;
  return sceneFile(id, W, TOP, D, css, html, js);
}
// the prompt, typed into a 9k card full frame; his paraphrase lights its phrases
function promptFile(id, D, typeAt, hi) {
  let body = PROMPT.replace(/&/g, '&amp;');
  hi.forEach(([, ph], i) => { body = body.replace(ph, `\u0001${i}\u0002${ph}\u0003`); });
  const css = `
#${id}-scene{background:#0F0F0F}
#${id}-scene .card{position:absolute;left:56px;right:56px;top:210px;border-radius:32px;background:#1A1A1A;border:2px solid #404040;padding:34px 40px 44px;direction:ltr}
#${id}-scene .hd{display:flex;align-items:center;gap:16px;margin-bottom:26px}
#${id}-scene .tag{padding:6px 18px;border-radius:14px;background:#1F3327;color:#2FB161;font:700 30px/1.2 "IBM Plex Mono",monospace;letter-spacing:.06em}
#${id}-scene .hd .r{margin-left:auto;font:600 28px/1 "IBM Plex Sans",sans-serif;color:#999999}
#${id}-scene .tx{font:500 39px/1.42 "IBM Plex Sans",sans-serif;color:#F5F5F5;min-height:${Math.ceil(PROMPT.length / 41) * 56}px}
#${id}-scene .tx .h{border-radius:8px;transition:none}
#${id}-scene .tx .h.on{background:#E85A02;color:#000}`;
  const html = `  <div class="glow" data-layout-ignore></div>
  <div class="card" data-role="card"><div class="hd"><span class="tag">PROMPT</span><span class="r">→ Claude</span></div><div class="tx" data-role="tx"></div></div>`;
  const js = `const SRC=${JSON.stringify(body)},HI=${JSON.stringify(hi.map((h) => r3(h[0])))},TA=${r3(typeAt)},tx=$('tx'),card=$('card');
const plain=SRC.replace(/\\u0001\\d\\u0002|\\u0003/g,'');
function render(t){
  pop(card,t,.05,'default');
  const n=Math.max(0,Math.min(plain.length,Math.floor((t-TA)*130)));
  // rebuild the typed prefix, keeping the highlight spans
  let out='',k=0,i=0,cur=-1;
  while(i<SRC.length&&k<n){const c=SRC[i];
    if(c==='\\u0001'){cur=+SRC[i+1];out+='<span class="h'+(t>=HI[cur]?' on':'')+'">';i+=3;continue;}
    if(c==='\\u0003'){out+='</span>';cur=-1;i++;continue;}
    out+=c==='<'?'&lt;':c;k++;i++;}
  if(cur>=0)out+='</span>';
  tx.innerHTML=out+(t>=TA&&(n<plain.length||((t-TA)%1.06)<.53)?'<span class="caret"></span>':'');
  op(root,Math.min(clamp(t*8),1-tw(t,DN-.2,.2)));
}`;
  return sceneFile(id, W, H, D, css, html, js);
}
// tag pills above his head: each lands on its word and replaces the one before
function tagFile(id, D, tags) {
  const css = `
#${id}-scene .tg{position:absolute;left:0;right:0;top:236px;display:flex;flex-direction:column;align-items:center;gap:12px}
#${id}-scene .t{padding:14px 36px;border-radius:28px;background:#0F0F0F;border:3px solid #2FB161;direction:ltr;font:700 64px/1.1 "IBM Plex Mono",monospace;color:#F5F5F5;white-space:nowrap}
#${id}-scene .s{padding:8px 24px;border-radius:18px;background:#1A1A1A;border:2px solid #404040;font-size:36px;font-weight:700;white-space:nowrap}`;
  const html = tags.map(([, t, s], i) => `  <div class="tg" data-role="g${i}"><div class="t">${t.replace(/&/g, '&amp;')}</div><div class="s">${s.replace(/(Claude)/g, '<span style="font-family:IBM Plex Sans">$1</span>')}</div></div>`).join('\n');
  const js = `const AT=${JSON.stringify(tags.map((x) => r3(x[0])))};
function render(t){
  AT.forEach((a,i)=>{const g=$('g'+i),nx=i<AT.length-1?AT[i+1]:1e9;pop(g,t,a);if(t>=nx-.12)op(g,1-clamp((t-nx+.12)/.12));});
  op(root,1-tw(t,DN-.2,.2));
}`;
  return sceneFile(id, W, H, D, css, html, js);
}

// ---------- captions: Arabic word by word (≤ 4 words, connectors stay with the next word) + one English line ----------
const CONNECT = new Set(['و', 'في', 'من', 'على', 'عن', 'اللي', 'إن', 'لو', 'بس', 'ده', 'دي', 'هو', 'هي', 'أو', 'مش', 'إنه', 'الـ', 'بـ', 'لـ', 'لما', 'يا', 'كل', 'ما', 'ولا', 'مع']);
function chunkSeg(s, e, ar, y) {
  const words = ar.split(' ').filter(Boolean).map((w) => ({ star: w.includes('*'), w: w.replace(/\*/g, '').replace(/~/g, ' ') }));
  const wt = words.map((x) => x.w.length + 2); const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0; const span = Math.max(0.3, e - s - 0.08);
  words.forEach((x, i) => { x.t = r3(s + (acc / tot) * span); acc += wt[i]; });
  const chunks = []; let cur = [];
  words.forEach((x, i) => {
    cur.push(x);
    const chars = cur.reduce((a, c) => a + c.w.length + 1, 0);
    if (i < words.length - 1 && !CONNECT.has(x.w) && !x.w.endsWith('الـ') && (cur.length >= 4 || chars >= 22)) { chunks.push(cur); cur = []; }
  });
  if (cur.length) chunks.push(cur);
  return chunks.map((c, i) => ({ s: c[0].t, e: r3(i < chunks.length - 1 ? chunks[i + 1][0].t : e), y, w: c.map((x) => [x.w, x.t, x.star ? 1 : 0]) }));
}
function captionsFile(id, ar, en, D) {
  return `<!doctype html>
<html><head><meta charset="UTF-8" /></head><body><template>
<style>
${fontFaces()}
#${id}-cap{position:absolute;inset:0;pointer-events:none}
#${id}-cap .stack{position:absolute;left:60px;right:60px;display:flex;flex-direction:column;align-items:center;gap:8px}
#${id}-cap .ar{display:flex;justify-content:center;flex-wrap:nowrap;white-space:nowrap;gap:0 .26em;direction:rtl;font:700 52px/1.3 "IBM Plex Sans Arabic","IBM Plex Sans",sans-serif;color:#F5F5F5;-webkit-text-stroke:9px rgba(10,17,26,.9);paint-order:stroke fill;text-align:center}
#${id}-cap .ar span{display:inline-block;unicode-bidi:isolate}
#${id}-cap .ar span.k{background:#E85A02;color:#000;-webkit-text-stroke:0;border-radius:14px;padding:0 .2em}
#${id}-cap .stack.bg{left:auto;right:auto;left:50%;transform:translateX(-50%);width:max-content;max-width:1000px;padding:14px 34px 18px;border-radius:28px;background:rgba(15,15,15,.94);border:2px solid #404040}
#${id}-cap .stack.bg .ar,#${id}-cap .stack.bg .en{-webkit-text-stroke:0}
#${id}-cap .en{text-align:center;direction:ltr;font:500 34px/1.3 "IBM Plex Sans",sans-serif;color:rgba(245,245,245,.94);-webkit-text-stroke:6px rgba(10,17,26,.9);paint-order:stroke fill}
</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
  <div id="${id}-cap"><div class="stack"><div class="ar" data-role="ar"></div><div class="en" data-role="en"></div></div></div>
</div>
<script>
(function(){
const AR=${JSON.stringify(ar)};
const EN=${JSON.stringify(en)};
const cap=document.getElementById('${id}-cap'),ar=cap.querySelector('[data-role="ar"]'),en=cap.querySelector('[data-role="en"]'),stack=cap.querySelector('.stack');
let curA=-1,curE=-1,spans=[];
function render(t){
  let a=-1;for(let i=0;i<AR.length;i++){if(t>=AR[i].s&&t<AR[i].e){a=i;break;}}
  if(a!==curA){curA=a;ar.innerHTML='';spans=[];stack.style.visibility=a>=0?'visible':'hidden';if(a>=0){stack.style.top=AR[a].y+'px';stack.className=AR[a].y===1185?'stack bg':'stack';AR[a].w.forEach(w=>{const s=document.createElement('span');s.textContent=w[0];ar.appendChild(s);spans.push(s);});}}
  if(a>=0)AR[a].w.forEach((w,i)=>{const on=t>=w[1];spans[i].style.opacity=on?'1':'.38';spans[i].className=(w[2]&&on)?'k':'';});
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
// caption stack top per layout: on his chest · under the b-roll / card · on the wall above his head (split)
const CAP_Y = { full: 1050, broll: 1185, card: 1185, split: TOP + 22 };

// ---------- build one version ----------
function build(name) {
  const V = VARIANTS[name]; sfxN = 0;
  const dir = path.join(HERE, name);
  fs.rmSync(path.join(dir, 'compositions'), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'compositions'), { recursive: true });
  for (const sub of ['compositions', 'compositions/components']) { const from = path.join(SH, sub); if (!fs.existsSync(from)) continue; fs.mkdirSync(path.join(dir, sub), { recursive: true }); for (const f of fs.readdirSync(from)) if (f.endsWith('.html')) fs.copyFileSync(path.join(from, f), path.join(dir, sub, f)); }
  const link = (rel) => { const s = path.join(SH, rel), d = path.join(dir, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); if (fs.existsSync(d) && fs.statSync(d).ino === fs.statSync(s).ino) return; fs.rmSync(d, { force: true }); fs.linkSync(s, d); }; // relink when shared/ was replaced
  for (const sub of ['assets', 'assets/fonts', 'assets/sfx']) for (const f of fs.readdirSync(path.join(SH, sub))) if (fs.statSync(path.join(SH, sub, f)).isFile()) link(path.join(sub, f));
  fs.writeFileSync(path.join(dir, 'hyperframes.json'), JSON.stringify({ $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', registry: 'https://raw.githubusercontent.com/ismail9k/motion/main/registry', paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' }, media: { autoProxy: true } }, null, 2));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'cc-insights-' + name.toLowerCase(), private: true, type: 'module', scripts: { dev: `npx --yes hyperframes@${PIN} preview`, check: `npx --yes hyperframes@${PIN} check`, render: `npx --yes hyperframes@${PIN} render` } }, null, 2));

  const vids = [], over = [], hosts = [], sfx = [], arCaps = [], enCaps = [];
  let t = 0, vid = 0, piece = 0;
  const host = (id, src, start, d, track, h, vars, top = 0) => `<div id="h-${id}" data-composition-id="${src}" data-composition-src="compositions/${src}.html" data-start="${r3(start)}" data-duration="${r3(d)}" data-track-index="${track}" data-width="${W}" data-height="${h}"${vars ? ` data-variable-values='${JSON.stringify(vars)}'` : ''} style="position:absolute;left:0;top:${top}px;width:${W}px;height:${h}px"></div>`;
  for (const it of V.items) {
    const snap = (x) => EDGES.find((e) => Math.abs(e - x) < 0.03) ?? x;
    const a = snap(T(B[it.name][0])), b = snap(nowEnd(B[it.name][1])), start = t, D = b - a;
    const layout = it.split ? 'split' : it.broll ? 'broll' : it.card ? 'card' : 'full';
    // his footage: one clip per kept piece, alternate punch-in on every jump cut
    const cuts = [a, ...EDGES.filter((x) => x > a + 0.05 && x < b - 0.05), b];
    for (let i = 0; i < cuts.length - 1; i++) {
      const sc = piece++ % 2 ? V.punch : 1;
      vids.push(`<video id="v${vid++}" class="clip vo${it.split ? ' sp' : ''}" data-layout-ignore src="assets/vo.mp4" playsinline data-has-audio="true" data-start="${r3(t + cuts[i] - a)}" data-duration="${r3(cuts[i + 1] - cuts[i])}" data-media-start="${r3(cuts[i])}" data-track-index="0" style="transform:${V.mirror ? 'scaleX(-1) ' : ''}scale(${sc})"></video>`);
    }
    for (const [s0, e0, ar, en] of VO) {
      const s = now(s0), e = nowEnd(e0); if (s === null || e === null) continue;
      const ov = Math.min(e, b) - Math.max(s, a); if (ov < 0.3) continue;
      const ss = t + Math.max(s, a) - a, ee = t + Math.min(e, b) - a;
      arCaps.push(...chunkSeg(ss, ee, ar, CAP_Y[layout])); enCaps.push({ s: r3(ss), e: r3(ee), x: en });
    }
    const L = (x) => Math.max(0, T(x) - a); // built-cut time → block-local time
    if (it.broll) {
      const bd = Math.min(r3(dur(path.join(SH, 'assets', BROLL[it.name]))), r3(D));
      over.push(`<video id="v${vid++}" class="clip brollv" data-layout-ignore src="assets/${BROLL[it.name]}" muted playsinline data-start="${r3(t)}" data-duration="${bd}" data-media-start="0" data-track-index="9"></video>`);
      sfx.push(sfxTag(t, 'whoosh'));
      if (it.name === 'open') sfx.push(sfxTag(t + L(9.32), 'type', 0.6), sfxTag(t + L(10.0), 'click'));
    }
    if (it.split) {
      const id = it.name + name, li = LISTS[it.name];
      fs.writeFileSync(path.join(dir, 'compositions', id + '.html'), listFile(id, D, li.title, li.at ? L(li.at) : 0.1, li.rows.map(([x, ic, lb]) => [r3(L(x)), ic, lb])));
      hosts.push(host(id, id, start, D, 3, TOP), `<div id="seam-${it.name}" class="clip seam" data-start="${r3(start)}" data-duration="${r3(D)}" data-track-index="4"></div>`);
      sfx.push(sfxTag(start + (li.at ? L(li.at) : 0.1), 'type', li.title.length / 24), ...li.rows.map(([x]) => sfxTag(start + L(x), 'pop')));
    }
    if (it.card) {
      const id = 'prompt' + name, typeAt = 0.25;
      fs.writeFileSync(path.join(dir, 'compositions', id + '.html'), promptFile(id, D, typeAt, PROMPT_HI.map(([x, ph]) => [L(x), ph])));
      hosts.push(host(id, id, start, D, 8, H));
      sfx.push(sfxTag(start, 'whoosh'), sfxTag(start + typeAt, 'type', PROMPT.length / 130), ...PROMPT_HI.map(([x]) => sfxTag(start + L(x), 'click')));
    }
    if (it.tags) {
      const id = 'tags-' + it.name + name, tg = TAGS[it.name].filter(([x]) => now(x) !== null && T(x) < b);
      fs.writeFileSync(path.join(dir, 'compositions', id + '.html'), tagFile(id, D, tg.map(([x, a1, a2]) => [L(x), a1, a2])));
      hosts.push(host(id, id, start, D, 5, H));
      sfx.push(...tg.map(([x]) => sfxTag(start + L(x), 'pop')));
    }
    if (it.band) {
      // the one climax band: "التقرير ده كنز", over the wall above his head
      const bt = start + L(22.97);
      hosts.push(host('band', '9k-band', bt, 1.2, 5, TOP, { text: 'التقرير ده كنز', underline: 'كنز', top: 214, size: 84 }));
      sfx.push(sfxTag(bt, 'needle'), sfxTag(bt + 0.02, 'bass', 1.3));
    }
    t += D;
  }
  const TOTAL = r3(t);
  enCaps.forEach((c, i) => { const n = enCaps[i + 1]; if (n && n.s - c.e < 0.35) c.e = n.s; });
  // hook stamp (9k registry block) above his head
  hosts.push(host('hook', '9k-hook-stamp', 0, V.hook.d, 6, H, { line: V.hook.line, sub: '', top: 250, cps: V.hook.cps || 18 }));
  sfx.push(sfxTag(0.1, 'thud', 0.8), sfxTag(0.15, 'type', V.hook.line.length / (V.hook.cps || 18)));
  const capId = 'cap' + name;
  fs.writeFileSync(path.join(dir, 'compositions', capId + '.html'), captionsFile(capId, arCaps, enCaps, TOTAL));

  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="ar" data-resolution="portrait">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0F0F0F}
#root{position:relative;width:100%;height:100%;overflow:hidden;background:#0F0F0F}
video.vo{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:540px 690px}
video.vo.sp{top:${SPLIT_Y}px}
video.brollv{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
.seam{position:absolute;left:0;top:${TOP}px;width:${W}px;height:300px;background:linear-gradient(to bottom,rgba(10,17,26,.62),rgba(10,17,26,.38) 60%,rgba(10,17,26,0));border-top:4px solid #0F0F0F}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="${W}" data-height="${H}" data-duration="${TOTAL}">
 ${vids.join('\n ')}
 ${over.join('\n ')}
 ${hosts.join('\n ')}
 <div id="h-${capId}" data-composition-id="${capId}" data-composition-src="compositions/${capId}.html" data-start="0" data-duration="${TOTAL}" data-track-index="7" data-width="${W}" data-height="${H}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px"></div>
 ${sfx.join('\n ')}
</div>
<script>
const tl=gsap.timeline({paused:true});
window.__timelines["main"]=tl;
</script>
</body>
</html>
`);
  console.log(`${name}: ${TOTAL}s · ${vids.length} voice clips · ${arCaps.length} caption chunks`);
}
const only = process.argv[2];
for (const n of ['A', 'B', 'C']) if (!only || only === n) build(n);
