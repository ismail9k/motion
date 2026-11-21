// The 9k registry items. Each block is one reusable moment from the 9k edit style, with its text and timing as
// variables, so an edit changes values and never restyles. Pixel values are for a 1080×1920 film with a 1080×608 top panel.
import { T, PANEL_BG } from './shared.mjs';

const num = (id, label, def, extra = {}) => ({ id, type: 'number', label, default: def, ...extra });
const str = (id, label, def, extra = {}) => ({ id, type: 'string', label, default: def, ...extra });
const bool = (id, label, def) => ({ id, type: 'boolean', label, default: def });

export const BLOCKS = [
  {
    name: '9k-captions',
    title: '9k bilingual captions',
    description: 'Arabic word-by-word captions (≤ 4 words, orange keyword pill) with one English line per sentence, in the 9k style. Cues are [start, end, "arabic with *keyword", "english"].',
    tags: ['captions', 'arabic', 'bilingual', '9k'],
    w: 1080, h: 1920, duration: 8,
    vars: [
      str('cues', 'Cues JSON: [[s, e, "arabic *kw a~b", "english"], …]', JSON.stringify([[0.2, 3.4, 'بس هو أنهي *AI بالظبط؟', 'But which AI, exactly?'], [3.5, 7.6, 'الـAI مش كله *ChatGPT وClaude', 'AI is not all ChatGPT and Claude.']])),
      num('top', 'Stack top (px)', 630, { min: 0, max: 1800, step: 2 }),
      num('arSize', 'Arabic size (px)', 60, { min: 40, max: 96 }),
      num('enSize', 'English size (px)', 34, { min: 24, max: 56 }),
      bool('english', 'Show English line', true),
    ],
    css: `
.9k-captions .stack{position:absolute;left:140px;right:140px;display:flex;flex-direction:column;align-items:center;gap:8px}
.9k-captions .ar{display:flex;justify-content:center;flex-wrap:wrap;gap:0 .26em;direction:rtl;font-weight:700;line-height:1.3;color:${T.text};-webkit-text-stroke:9px rgba(10,17,26,.9);paint-order:stroke fill;text-align:center}
.9k-captions .ar span{display:inline-block;unicode-bidi:isolate}
.9k-captions .ar span.k{background:${T.orange};color:#000;-webkit-text-stroke:0;border-radius:14px;padding:0 .2em}
.9k-captions .en{text-align:center;direction:ltr;font-family:"IBM Plex Sans",sans-serif;font-weight:500;line-height:1.3;color:rgba(245,245,245,.94);-webkit-text-stroke:6px rgba(10,17,26,.9);paint-order:stroke fill}
`.replace(/\.9k-captions/g, '[data-k9="9k-captions"]'),
    html: `<div class="stack" data-role="stack"><div class="ar" data-role="ar"></div><div class="en" data-role="en"></div></div>`,
    js: `
// words that never end a chunk: they belong with the next word
const CONNECT=new Set(['و','في','من','على','عن','اللي','إن','لو','بس','ده','دي','هو','هي','أو','مش','إنه','الـ','بـ','لـ']);
let CUES=[];try{CUES=JSON.parse(V.cues);}catch(e){CUES=[];}
const AR=[],EN=[];
for(const [s,e,ar,en] of CUES){
  const words=String(ar).split(' ').filter(Boolean).map(w=>({k:w.includes('*'),w:w.replace(/\\*/g,'').replace(/~/g,' ')}));
  const wt=words.map(x=>x.w.length+2),tot=wt.reduce((a,b)=>a+b,0)||1;let acc=0;const span=Math.max(.3,e-s-.08);
  words.forEach((x,i)=>{x.t=s+(acc/tot)*span;acc+=wt[i];});
  const chunks=[];let cur=[];
  words.forEach((x,i)=>{cur.push(x);const chars=cur.reduce((a,y)=>a+y.w.length+1,0);const last=i===words.length-1;const conn=CONNECT.has(x.w)||x.w.endsWith('الـ');if(!last&&!conn&&(cur.length>=4||chars>=22)){chunks.push(cur);cur=[];}});
  if(cur.length)chunks.push(cur);
  chunks.forEach((c,i)=>AR.push({s:c[0].t,e:i<chunks.length-1?chunks[i+1][0].t:e,w:c}));
  if(en)EN.push({s,e,x:en});
}
const LEN=CUES.reduce((m,c)=>Math.max(m,+c[1]||0),0);
const stack=$('stack'),ar=$('ar'),en=$('en');
stack.style.top=V.top+'px';ar.style.fontSize=V.arSize+'px';en.style.fontSize=V.enSize+'px';en.style.display=V.english?'':'none';
let curA=-1,curE=-1,spans=[];
function render(t){
  let a=-1;for(let i=0;i<AR.length;i++){if(t>=AR[i].s&&t<AR[i].e){a=i;break;}}
  if(a!==curA){curA=a;ar.textContent='';spans=[];if(a>=0)AR[a].w.forEach(w=>{const s=document.createElement('span');s.textContent=w.w;ar.appendChild(s);spans.push(s);});}
  if(a>=0)AR[a].w.forEach((w,i)=>{const on=t>=w.t;spans[i].style.opacity=on?'1':'0';spans[i].className=(w.k&&on)?'k':'';});
  let e=-1;for(let i=0;i<EN.length;i++){if(t>=EN[i].s&&t<EN[i].e){e=i;break;}}
  if(e!==curE){curE=e;en.textContent=e>=0?EN[e].x:'';}
}`,
    length: 'LEN',
  },
  {
    name: '9k-hook-stamp',
    title: '9k hook stamp',
    description: 'The opening stamp: a typed headline in an orange-bordered pill that lands with a heavy spring, and an optional black-on-orange sub line typed after it.',
    tags: ['hook', 'title-card', 'social', '9k'],
    w: 1080, h: 1920, duration: 3.6,
    vars: [str('line', 'Headline', 'أنهي AI بالظبط؟'), str('sub', 'Sub line (empty = none)', ''), num('top', 'Top (px)', 280, { min: 0, max: 1700, step: 2 }), num('cps', 'Typing speed (chars/s)', 16, { min: 6, max: 40 })],
    css: `
[data-k9="9k-hook-stamp"] .stamp{position:absolute;left:60px;right:60px;display:flex;flex-direction:column;align-items:center;gap:12px;transform-origin:50% 50%}
[data-k9="9k-hook-stamp"] .line{padding:18px 40px;border-radius:30px;background:${T.bg};border:3px solid ${T.orange};font-size:76px;font-weight:700;line-height:1.15;text-align:center}
[data-k9="9k-hook-stamp"] .sub{padding:10px 26px;border-radius:20px;background:${T.orange};color:#000;font-size:40px;font-weight:700}
`,
    html: `<div class="stamp" data-role="st"><div class="line" data-role="line"></div><div class="sub" data-role="sub"></div></div>`,
    js: `
const st=$('st'),line=$('line'),sub=$('sub');st.style.top=V.top+'px';if(!V.sub)sub.style.display='none';
const subAt=String(V.line).length/V.cps+.4;
function render(t){const k=sp(t-.1,'heavy');op(st,clamp((t-.1)*8));st.style.transform='scale('+(1.25-.25*k).toFixed(3)+')';
  typed(line,String(V.line),t,.15,V.cps,true);if(V.sub){typed(sub,String(V.sub),t,subAt,18,false);op(sub,t>=subAt?1:0);}}`,
    length: '3.6',
  },
  {
    name: '9k-band',
    title: '9k climax band',
    description: 'The once-per-film climax band: a full-width brand-green strip that snaps open with one big line, and an orange underline drawing under the key word. Hold ≤ 1.2 s.',
    tags: ['emphasis', 'title-card', '9k'],
    w: 1080, h: 608, duration: 1.2,
    vars: [str('text', 'Line', 'مثبت رياضيًا'), str('underline', 'Word to underline (must be in the line)', 'رياضيًا'), num('top', 'Top (px)', 214, { min: 0, max: 1700 }), num('size', 'Text size (px)', 84, { min: 48, max: 120 })],
    css: `
[data-k9="9k-band"] .band{position:absolute;left:0;right:0;height:180px;background:${T.green};display:flex;align-items:center;justify-content:center;transform-origin:50% 50%}
[data-k9="9k-band"] .bt{position:relative;font-weight:700;color:#FFFFFF;white-space:nowrap}
[data-k9="9k-band"] .uw{position:relative}
[data-k9="9k-band"] .ul{position:absolute;left:0;bottom:-6px;height:9px;width:0;background:${T.orange};border-radius:5px}
`,
    html: `<div class="band" data-role="band"><div class="bt" data-role="bt"></div></div>`,
    js: `
const band=$('band'),bt=$('bt');band.style.top=V.top+'px';bt.style.fontSize=V.size+'px';
const txt=String(V.text),u=String(V.underline||''),i=u?txt.indexOf(u):-1;
if(i>=0){bt.append(txt.slice(0,i));const w=document.createElement('span');w.className='uw';w.textContent=u;const l=document.createElement('span');l.className='ul';w.appendChild(l);bt.appendChild(w);bt.append(txt.slice(i+u.length));}else bt.textContent=txt;
const ul=root.querySelector('.ul');
function render(t){band.style.transform='scaleY('+sp(t,'snappy').toFixed(3)+')';op(band,t>0?1:0);if(ul)ul.style.width=(100*tw(t,.3,.3))+'%';}`,
    length: '1.2',
  },
  {
    name: '9k-kicker',
    title: '9k kicker title',
    description: 'A panel title: a typed Latin term (the field or product name) with its Arabic name under it, on the dark 9k panel. Use at the start of an explainer block.',
    tags: ['title-card', 'lower-third', '9k'],
    w: 1080, h: 608, duration: 3,
    vars: [str('title', 'Title (Latin)', 'Operations Research'), str('sub', 'Arabic name', 'بحوث العمليات'), bool('panel', 'Dark 9k panel behind', true), num('top', 'Top (px)', 24, { min: 0, max: 560 })],
    css: `
[data-k9="9k-kicker"] .kick{font:700 52px/1.1 "IBM Plex Sans",sans-serif;direction:ltr}
[data-k9="9k-kicker"] .sub{font-size:28px;color:${T.muted};font-weight:600}
`,
    html: `<div data-role="bg">${PANEL_BG}</div><div class="center kick" data-role="kick"></div><div class="center sub" data-role="sub"></div>`,
    js: `
const kick=$('kick'),sub=$('sub');if(!V.panel)$('bg').style.display='none';kick.style.top=V.top+'px';sub.style.top=(V.top+68)+'px';sub.textContent=String(V.sub);
const subAt=.1+String(V.title).length/24+.1;
function render(t){typed(kick,String(V.title),t,.1,24,false);pop(sub,t,subAt);}`,
    length: '3',
  },
  {
    name: '9k-number-roll',
    title: '9k number roll',
    description: 'A big number that rolls into place digit by digit (odometer) in a pill, with an orange label: for the one stat a sentence turns on.',
    tags: ['data-viz', 'stat', 'counter', '9k'],
    w: 1080, h: 608, duration: 4.6,
    vars: [str('value', 'Value (digits and commas)', '27,000,000,000,000,000'), str('label', 'Label', 'احتمال حل'), num('at', 'Pill lands at (s)', .6, { min: 0, max: 10, step: .05 }), num('roll', 'Roll length (s)', 3.4, { min: .5, max: 8, step: .1 }), num('top', 'Top (px)', 392, { min: 0, max: 1700 }), bool('panel', 'Dark 9k panel behind', false)],
    css: `
[data-k9="9k-number-roll"] .pill{position:absolute;left:60px;right:60px;height:186px;border-radius:30px;background:rgba(15,15,15,.88);border:2px solid ${T.orange};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
[data-k9="9k-number-roll"] .num{font:700 60px/1 "IBM Plex Mono",monospace;color:${T.text};direction:ltr;display:flex}
[data-k9="9k-number-roll"] .num .d{display:inline-block;height:1em;overflow:hidden}
[data-k9="9k-number-roll"] .num .s{display:grid}
[data-k9="9k-number-roll"] .num .s span{height:1em;line-height:1em}
[data-k9="9k-number-roll"] .lbl{font-size:38px;font-weight:700;color:${T.orange}}
`,
    html: `<div data-role="bg">${PANEL_BG}</div><div class="pill" data-role="pill"><div class="num" data-role="num" data-layout-ignore></div><div class="lbl" data-role="lbl"></div></div>`,
    js: `
const pill=$('pill'),num=$('num');if(!V.panel)$('bg').style.display='none';pill.style.top=V.top+'px';$('lbl').textContent=String(V.label);
const strips=[];
for(const ch of String(V.value)){if(!/[0-9]/.test(ch)){const c=document.createElement('span');c.textContent=ch;num.appendChild(c);continue;}const d=document.createElement('span');d.className='d';const s=document.createElement('span');s.className='s';const stops=10+ +ch;for(let i=0;i<=stops;i++){const x=document.createElement('span');x.textContent=String(i%10);s.appendChild(x);}d.appendChild(s);num.appendChild(d);strips.push({s,stops});}
const out3=x=>1-Math.pow(1-clamp(x),3);
function render(t){pop(pill,t,V.at,'default');strips.forEach((d,i)=>{const k=out3((t-V.at-.1-i*.06)/Math.max(.2,V.roll-i*.06));d.s.style.transform='translateY('+(-d.stops*k)+'em)';});}`,
    length: 'V.at+V.roll+.6',
  },
  {
    name: '9k-verdict',
    title: '9k verdict split',
    description: 'Two answers side by side: a chat bubble with "?" (one suggests) against a green equation card with ✓ (the other proves). Each side pops in on its word.',
    tags: ['comparison', 'split', 'data-viz', '9k'],
    w: 1080, h: 608, duration: 4,
    vars: [str('rightLabel', 'Right label (the guess)', 'بيقترح حل'), str('leftLabel', 'Left label (the proof)', 'مثبت رياضيًا'), str('code', 'Equation line', 'min f(x)'), str('note', 'Equation note', 'gap = 0'),
      num('rightAt', 'Right pops at (s)', .2, { min: 0, max: 10, step: .05 }), num('leftAt', 'Left pops at (s)', 1.6, { min: 0, max: 10, step: .05 }), bool('panel', 'Dark 9k panel behind', true)],
    css: `
[data-k9="9k-verdict"] .half{position:absolute;top:96px;width:460px;height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
[data-k9="9k-verdict"] .half .t{font-size:46px;font-weight:700}
`,
    html: `<div data-role="bg">${PANEL_BG}</div>
  <div class="half" data-role="r" style="right:40px">
    <svg width="200" height="150" viewBox="0 0 200 150"><path d="M20 20 Q20 6 34 6 L166 6 Q180 6 180 20 L180 96 Q180 110 166 110 L70 110 L36 140 L40 110 L34 110 Q20 110 20 96 Z" fill="${T.surface2}" stroke="${T.border}" stroke-width="4"/><text x="100" y="80" text-anchor="middle" font-size="70" font-weight="700" fill="${T.orange}" font-family="IBM Plex Sans">?</text></svg>
    <div class="t" data-role="rt"></div>
  </div>
  <div class="half" data-role="l" style="left:40px">
    <svg width="230" height="150" viewBox="0 0 230 150"><rect x="6" y="6" width="218" height="138" rx="20" fill="${T.greenSel}" stroke="${T.greenText}" stroke-width="4"/><text data-role="code" x="100" y="66" text-anchor="middle" font-size="34" fill="${T.text}" font-family="IBM Plex Mono"></text><text data-role="note" x="100" y="110" text-anchor="middle" font-size="28" fill="${T.muted}" font-family="IBM Plex Mono"></text><circle cx="196" cy="34" r="20" fill="${T.green}"/><path d="M186 35 L193 42 L206 27" fill="none" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="t" data-role="lt"></div>
  </div>`,
    js: `
if(!V.panel)$('bg').style.display='none';$('rt').textContent=String(V.rightLabel);$('lt').textContent=String(V.leftLabel);$('code').textContent=String(V.code);$('note').textContent=String(V.note);
const r=$('r'),l=$('l');
function render(t){pop(r,t,V.rightAt,'default');pop(l,t,V.leftAt,'default');}`,
    length: 'Math.max(V.rightAt,V.leftAt)+1.2',
  },
];

export const COMPONENTS = [
  {
    name: '9k-tokens',
    title: '9k tokens and fonts',
    description: 'The 9k design tokens as CSS custom properties plus the IBM Plex Sans Arabic / Sans / Mono font faces (OFL, shipped as assets). Every 9k block depends on it.',
    tags: ['tokens', 'fonts', 'arabic', '9k'],
    fonts: true,
  },
  {
    name: '9k-split-layout',
    title: '9k split layout',
    description: 'The host layout for reaction shorts: a 1080×608 top panel for the reference clip or a picture scene, the talking head below it, a seam and shade where they meet, and alternating punch-in framing for jump cuts.',
    tags: ['layout', 'split-screen', 'social', '9k'],
  },
];
