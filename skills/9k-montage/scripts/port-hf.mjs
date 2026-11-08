// Port a canvas montage (edit.json + work/*) to an editable HyperFrames project in studio/.
// Run from the montage root after `bash scripts/studio.sh` has staged studio/ (fonts, sfx, footage): node scripts/port-hf.mjs
// After the port, the HTML in studio/ is the source of truth (he edits it in HyperFrames Studio). Re-running OVERWRITES it:
// never re-run once he or you have edited studio/ by hand. Every scene is a pure function of time (render(t)), driven by one
// GSAP clock, so the look matches the canvas original frame for frame (verify with `snapshot --against out/final-*.mp4`).
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { events, at as camAt } from '../lib/camera.mjs';

const E = JSON.parse(fs.readFileSync('edit.json', 'utf8'));
const CAPS = JSON.parse(fs.readFileSync('work/captions.json', 'utf8'));
const KEEP = JSON.parse(fs.readFileSync('work/keep.json', 'utf8'));
const CUTS = JSON.parse(fs.readFileSync('work/cuts.json', 'utf8'));
const CUES = JSON.parse(fs.readFileSync('work/cues.auto.json', 'utf8'));
const OUT = 'studio';
const W = 1080, H = 1920, FPS = 30;
const r1 = (v) => Math.round(v * 10) / 10, r3 = (v) => +(+v).toFixed(3);
const DUR = r3(KEEP.reduce((a, [s, e]) => a + (e - s), 0));

// ---- 9k layout constants (portrait, same maths as lib/overlay.js) ----------------------------------------
const R = 32, rem = (n) => n * R;
const CX = W * 0.47, SW = W * 0.84, FACE = E.faceBottom * H, DYPX = 0.07 * H;
const KSIZE = Math.max(28, rem(0.85)), KICK = KSIZE * 2 + rem(0.5);
const CAPY = (E.captions.y ?? 0.72) * H, CAPSIZE = rem(E.captions.size ?? 2.05);
const top = (g) => FACE + (g.dy ? g.dy * H : 0) + (g.kicker ? KICK : 0); // zoneY for every graphic in this film
const kickTop = (g) => FACE + (g.dy ? g.dy * H : 0);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isAr = (s) => /[؀-ۿ]/.test(s);

// ---- fonts + shared CSS (inlined in every file so each file stands alone) --------------------------------
const AR_RANGE = 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC';
const LAT_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
function fontFaces(base) {
  const f = (fam, file, w, range) => `@font-face{font-family:"${fam}";src:url("${base}fonts/${file}") format("woff2");font-weight:${w};font-display:block${range ? `;unicode-range:${range}` : ''}}`;
  const out = [];
  for (const w of [400, 600, 700]) {
    out.push(f('IBM Plex Sans Arabic', `ibm-plex-sans-arabic-arabic-${w}-normal.woff2`, w, AR_RANGE));
    out.push(f('IBM Plex Sans Arabic', `ibm-plex-sans-arabic-latin-${w}-normal.woff2`, w, LAT_RANGE));
    out.push(f('IBM Plex Sans', `ibm-plex-sans-latin-${w}-normal.woff2`, w));
    out.push(f('IBM Plex Mono', `ibm-plex-mono-latin-${w}-normal.woff2`, w));
  }
  return out.join('\n');
}
const BASE_CSS = `
.k9{position:absolute;inset:0;overflow:hidden;pointer-events:none;direction:rtl;color:#F5F5F5;
  font-family:"IBM Plex Sans Arabic","IBM Plex Sans",sans-serif;-webkit-font-smoothing:antialiased}
.k9 .abs{position:absolute}
.k9 .lat{font-family:"IBM Plex Sans",sans-serif}
.k9 .mono{font-family:"IBM Plex Mono",monospace}
.k9 .panel{position:absolute;box-sizing:border-box;background:#1A1A1A;border:2px solid #404040;border-radius:24px}
.k9 .panel.feature{background:#242424;border-color:#E85A02;border-radius:32px;box-shadow:0 16px 50px rgba(0,0,0,.1)}
.k9 .tag{display:inline-block;height:2em;line-height:2.08em;padding:0 .75em;border-radius:16px;background:#1F3327;color:#2FB161;
  font-weight:600;letter-spacing:.06em;white-space:nowrap;text-transform:uppercase}
.k9 .kick{position:absolute;left:0;width:${r1(CX * 2)}px;display:flex;justify-content:center;font-size:${r1(KSIZE)}px}
.k9 .caret{display:inline-block;position:relative;width:0;height:0}
.k9 .caret::after{content:"";position:absolute;width:.08em;height:.95em;bottom:-.15em;left:-.16em;background:#E85A02}
.k9 .caret.ltr::after{left:.08em}
.k9 .rest{color:transparent}
`;

// ---- runtime inlined into every scene: springs, easing, typing — a pure function of time, like the canvas original ----
const RUNTIME = `
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
function spring(t,k,d){if(t<=0)return 0;const w0=Math.sqrt(k),z=d/(2*w0);if(z<1){const wd=w0*Math.sqrt(1-z*z);return 1-Math.exp(-z*w0*t)*(Math.cos(wd*t)+(z*w0/wd)*Math.sin(wd*t));}return 1-Math.exp(-w0*t)*(1+w0*t);}
const SPR={snappy:[320,34],default:[170,26],heavy:[120,24],playful:[220,14]};
const sp=(t,p='default')=>spring(t,SPR[p][0],SPR[p][1]);
function bez(x1,y1,x2,y2){const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;const sx=s=>((ax*s+bx)*s+cx)*s,sy=s=>((ay*s+by)*s+cy)*s;return x=>{x=clamp(x);let s=x;for(let i=0;i<8;i++){const dx=(3*ax*s+2*bx)*s+cx;if(Math.abs(dx)<1e-6)break;s-=(sx(s)-x)/dx;}return sy(clamp(s));};}
const e9=bez(.4,0,.2,1),eCss=bez(.25,.1,.25,1);
const tw=(t,s,d,f=e9)=>f(clamp((t-s)/d));
const env=(t,dur,p='default')=>{const k=sp(t,p),o=tw(t,dur-.25,.25);return{k,a:Math.min(clamp(t*6),1-o),y:(1-k)*${rem(1.4)}+o*${rem(0.5)}};};
const caretOn=(t,typing)=>typing||(t%1.06)<.53;
// Typed text: <span class="ty" data-cps="24">full text</span> becomes typed + caret + transparent rest,
// so the layout (wrapping, panel height) is the full text's from the first frame.
function typer(el){const full=[...el.textContent],cps=+el.dataset.cps||18,caret=el.dataset.caret!=='off';
  el.textContent='';const a=document.createElement('span'),c=document.createElement('i'),b=document.createElement('span');
  c.className='caret'+(/[\\u0600-\\u06FF]/.test(full.join(''))?'':' ltr');b.className='rest';el.append(a,c,b);
  return{len:full.length/cps,set(lt,hold=1.2){const n=clamp(Math.floor(lt*cps),0,full.length),s=full.slice(0,n).join(''),r=full.slice(n).join('');
    if(a.textContent!==s)a.textContent=s;if(b.textContent!==r)b.textContent=r;const typing=n<full.length;
    c.style.visibility=caret&&lt>=0&&caretOn(Math.max(0,lt),typing)&&lt<full.length/cps+hold?'visible':'hidden';return typing;}};}
const op=(el,a)=>{el.style.opacity=String(Math.max(0,Math.min(1,a)));};
`;

// ---- SFX: the cues each graphic asked for, as <audio> clips inside that graphic (they move with it) -------------
const PACK = E.audio.sfx.pack, SFXGAIN = E.audio.sfx.gain ?? 1;
const file = (src) => src.split('/').pop();
const LEN = {};
const lenOf = (f) => LEN[f] ??= +execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${OUT}/assets/sfx/${f}"`).toString().trim();
// lanes: each sound gets the first audio row that is free at its start, so no row holds two overlapping sounds
function lanes(items, base) { const ends = []; return items.map((x) => { let k = ends.findIndex((e) => e <= x.t0 + 1e-6); if (k < 0) k = ends.length; ends[k] = x.t0 + x.len; return base + k; }); }
function sfxFor(g, id) {
  const mine = CUES.filter((c) => c.t >= g.t - 1e-6 && c.t < g.t + g.dur);
  const xs = mine.filter((c) => PACK[c.type]).map((c) => {
    const p = PACK[c.type], f = file(p.src);
    const local = c.t - g.t, lead = p.lead || 0, start = p.start || 0;
    const t0 = Math.max(0, local - lead), mstart = start + Math.max(0, lead - local);
    const typed = c.type === 'type' ? (c.text ? [...c.text].length : c.count || 4) / (c.cps || 16) + 0.04 : Infinity;
    const len = Math.max(0.05, Math.min(typed, lenOf(f) - mstart, g.dur - t0));
    const vol = (p.gain ?? 1) * (c.gain ?? 0.4) * SFXGAIN * 0.25; // he halved the first port's 0.5: SFX sit well under his voice
    return { f, t0, mstart, len, vol };
  });
  const ln = lanes(xs, 10);
  return xs.map((x, k) => `  <audio id="${id}-sfx-${k + 1}" src="assets/sfx/${x.f}" data-start="${r3(x.t0)}" data-hf-media-start-basis="local" data-duration="${r3(x.len)}"${x.mstart ? ` data-media-start="${r3(x.mstart)}"` : ''} data-volume="${r3(x.vol)}" data-track-index="${ln[k]}"></audio>`).join('\n');
}

// ---- components: each returns { css, html, js } — js is the body of render(t) plus setup --------------------
const kickerHtml = (g) => g.kicker ? `<div class="kick" data-role="kicker" style="top:${r1(kickTop(g))}px"><span class="tag">#${esc(g.kicker)}</span></div>` : '';
const kickerJs = (g) => g.kicker ? `{const k=root.querySelector('[data-role=kicker]');op(k,Math.min(clamp(t*6),1-tw(t,D-.25,.25)));k.style.transform='translateY('+((1-sp(t,'snappy'))*${rem(0.6)})+'px)';}` : '';

const C = {};
// Title line breaks: the browser and the canvas measure Arabic differently, so a title that wrapped on the canvas can wrap
// elsewhere in HTML. Give the title its lines in edit.json (`lines: ["…", "…"]`, copied from the canvas stills); one div per line.

C.stamp = (g) => {
  const y = (g.y ?? 0.415) * H, ks = rem(2), big = rem(g.size || 6), yL = y + big * 1.12;
  const bw = rem(17), rs = rem(0.95), rh = rs * 1.75, bh = rs * 2.6 + g.bill.length * rh + rs * 2.4, sz = rem(2.6);
  const head = g.line.slice(0, g.line.length - (g.accent || '').length);
  const rows = g.bill.map(([l, v], i) => `<div class="row" style="top:${r1(rs * 2.6 + (i + 0.75) * rh - rs * 0.82)}px"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join('');
  const ty = rs * 2.6 + g.bill.length * rh + rs * 0.5;
  return {
    css: `
.scrim{left:0;width:${W}px;top:${r1(y - 0.055 * H)}px;height:${r1(0.38 * H)}px;background:linear-gradient(rgba(10,10,10,0),rgba(10,10,10,.62) 25%,rgba(10,10,10,.62) 75%,rgba(10,10,10,0))}
.kline{left:0;width:${r1(CX * 2)}px;top:${r1(y - ks * 0.98)}px;text-align:center;font-weight:700;font-size:${ks}px;line-height:1.2;color:rgba(245,245,245,.86)}
.big{left:0;width:${r1(CX * 2)}px;top:${r1(yL - big * 0.93)}px;text-align:center;direction:ltr;font-weight:700;font-size:${big}px;line-height:1.1;transform-origin:${r1(CX)}px ${r1(big * 0.62)}px}
.big b{color:#E85A02;font-weight:700}
.bill{left:${r1(CX - bw / 2)}px;top:${r1(yL + big * 0.28)}px;width:${bw}px;height:${r1(bh)}px;direction:ltr}
.bill .hd,.bill .row,.bill .tot{position:absolute;left:${r1(rs * 1.1)}px;right:${r1(rs * 1.1)}px;display:flex;justify-content:space-between;white-space:nowrap}
.bill .hd{top:${r1(rs * 1.7 - rs * 0.8 * 0.95)}px;font:600 ${r1(rs * 0.8)}px "IBM Plex Mono",monospace;color:#999}
.bill .row{font:400 ${r1(rs)}px/1.2 "IBM Plex Mono",monospace;color:#F5F5F5}
.bill .rule{position:absolute;left:${r1(rs * 1.1)}px;right:${r1(rs * 1.1)}px;top:${r1(ty)}px;height:2px;background:#404040}
.bill .tot{top:${r1(ty + rs * 1.55 - rs * 1.15 * 0.95)}px;font:700 ${r1(rs * 1.15)}px/1.2 "IBM Plex Mono",monospace;color:#F5F5F5}
.stamp{left:${r1(bw * 0.66)}px;top:${r1(bh * 0.52)}px;width:0;height:0}
.stamp span{position:absolute;transform:translate(-50%,-50%);display:block;white-space:nowrap;direction:rtl;font-weight:700;font-size:${r1(sz)}px;line-height:1;
  color:#E85A02;padding:${r1(sz * 0.275)}px ${r1(sz * 0.5)}px;border:${r1(sz * 0.1)}px solid #E85A02;border-radius:16px}
.stamp span::after{content:"";position:absolute;inset:${r1(sz * 0.06)}px;border:${r1(sz * 0.04)}px solid #E85A02;border-radius:12px}`,
    html: `
  <div class="abs scrim" data-role="scrim"></div>
  <div class="abs kline" data-role="kline"><span class="ty" data-cps="16">${esc(g.kicker)}</span></div>
  <div class="abs big" data-role="big" data-at="${g.lineAt}">${esc(head)}<b>${esc(g.accent || '')}</b></div>
  <div class="panel bill" data-role="bill">
    <div class="hd" data-layout-ignore><span>${esc(g.billTitle ?? 'INVOICE')}</span><span>${esc(g.billUnit ?? '/ month')}</span></div>
    ${rows}
    <div class="rule"></div>
    <div class="tot"><span>TOTAL</span><span>${esc(g.total || '$0.00')}</span></div>
    <div class="abs stamp" data-layout-allow-overlap data-role="stamp" data-at="${g.stampAt}"><span>${esc(g.stamp)}</span></div>
  </div>`,
    js: `
const scrim=$('scrim'),kl=$('kline'),big=$('big'),bill=$('bill'),stamp=$('stamp'),ty=typer(kl.querySelector('.ty'));
const lineAt=+big.dataset.at,stampAt=+stamp.dataset.at;
render=(t)=>{const a=1-tw(t,D-.3,.3);op(root,a);op(scrim,clamp(t*5));ty.set(t,lineAt-t+${'0'});
  kl.querySelector('.caret').style.visibility=(t<lineAt&&caretOn(t,t<ty.len))?'visible':'hidden';
  const lt=t-lineAt;if(lt>0){const s=1.18-.18*sp(lt,'heavy');op(big,clamp(lt*8));big.style.transform='scale('+s+')';}else op(big,0);
  const bt=lt-.12;if(bt>0){const k=sp(bt,'default');op(bill,clamp(bt*6));bill.style.transform='translateY('+((1-k)*${rem(2)})+'px) rotate(-3.5deg)';}else op(bill,0);
  const st=t-stampAt;if(st>0){const sk=sp(st,'heavy'),ss=1.7-.7*Math.min(1,sk*1.15);op(stamp,clamp(st*10)*.95);stamp.style.transform='rotate(-14deg) scale('+ss+')';}else op(stamp,0);};`,
  };
};

C.chips = (g) => {
  const size = rem(g.size || 1.7), h = size * 2.6, gap = size * 0.6;
  const items = g.items.map((it, i) => `<div class="chip${it.pick ? ' pick' : ''}${isAr(it.label) ? '' : ' lat'}" data-at="${g.at?.[i] ?? i * 0.18}">${esc(it.label)}</div>`).join('');
  return {
    css: `
.row{left:0;width:${r1(CX * 2)}px;top:${r1(top(g))}px;display:flex;justify-content:center;gap:${r1(gap)}px}
.chip{height:${r1(h)}px;line-height:${r1(h)}px;padding:0 ${r1(size)}px;border-radius:9999px;box-sizing:border-box;white-space:nowrap;
  font-weight:700;font-size:${r1(size)}px;background:rgba(26,26,26,.94);border:2px solid #404040}
.chip.pick{background:#166434;border-color:#166434}`,
    html: `${kickerHtml(g)}\n  <div class="abs row">${items}</div>`,
    js: `
const chips=[...root.querySelectorAll('.chip')];
render=(t)=>{${kickerJs(g)}
  for(const c of chips){const at=+c.dataset.at,lt=t-at;if(lt<0){op(c,0);continue;}const e=env(lt,D-at,'snappy');op(c,e.a);c.style.transform='translateY('+(e.y*.6)+'px)';}};`,
  };
};

C.card = (g) => {
  const size = rem(g.size || 1.9), w = SW;
  return {
    css: `
.card{left:${r1(CX - w / 2)}px;top:${r1(top(g))}px;width:${r1(w)}px;padding:${r1(size * 0.6)}px ${r1(size * 0.8)}px ${r1(size * 0.55)}px}
.card .tag{font-size:${r1(Math.max(28, size * 0.42))}px;margin-bottom:${r1(size * 0.3)}px}
.card .title{font-weight:700;font-size:${r1(size)}px;line-height:1.25}
.card .body{font-weight:400;font-size:${r1(size * 0.72)}px;line-height:1.3;color:#999;margin-top:${r1(size * 0.1)}px;unicode-bidi:plaintext;text-align:right}`,
    html: `
  <div class="panel feature card" data-role="card">
    ${g.badge ? `<div><span class="tag">#${esc(g.badge)}</span></div>` : ''}
    <div class="title"><span class="ty" data-cps="${g.cps || 24}" data-at="${g.at ?? 0.15}">${esc(g.title)}</span></div>
    ${g.body ? `<div class="body" data-role="body" data-at="${g.bodyAt ?? ''}">${esc(g.body)}</div>` : ''}
  </div>`,
    js: `
const card=$('card'),tEl=card.querySelector('.ty'),ty=typer(tEl),at=+tEl.dataset.at,body=$('body');
render=(t)=>{const e=env(t,D);op(card,e.a);card.style.transform='translateY('+e.y+'px)';ty.set(t-at);
  if(body){const b=body.dataset.at!==''?t-(+body.dataset.at):t-at-ty.len;op(body,clamp(b*5));}};`,
  };
};

C.stat = (g) => {
  const size = rem(g.size || 5.2), h = size * 1.9, w = SW * 0.64;
  return {
    css: `
.stat{left:${r1(CX - w / 2)}px;top:${r1(top(g))}px;width:${r1(w)}px;height:${r1(h)}px;text-align:center}
.stat .v{position:absolute;left:0;right:0;top:${r1(size * 1.05 - size * 0.93)}px;direction:ltr;font:700 ${r1(size)}px/1.1 "IBM Plex Sans",sans-serif}
.stat .l{position:absolute;left:0;right:0;top:${r1(size * 1.55 - size * 0.27 * 1.05)}px;font-weight:400;font-size:${r1(size * 0.27)}px;line-height:1.3;color:#999}`,
    html: `
  <div class="panel feature stat" data-role="stat">
    <div class="v" data-role="v" data-value="${esc(g.value)}">${esc(g.value)}</div>
    <div class="l">${esc(g.label || '')}</div>
  </div>`,
    js: `
const st=$('stat'),v=$('v'),m=String(v.dataset.value).match(/^([^\\d]*)([\\d.,]+)(.*)$/);
render=(t)=>{const e=env(t,D,'heavy');op(st,e.a);st.style.transform='translateY('+e.y+'px)';
  if(m){const n=parseFloat(m[2].replace(/,/g,'')),d=(m[2].split('.')[1]||'').length;v.textContent=m[1]+(n*tw(t,.1,.9)).toFixed(d)+m[3];}};`,
  };
};

C.versus = (g) => {
  const size = rem(g.size || 2), gapX = rem(3.2), w = (SW - gapX) / 2, h = size * 4.4, y = top(g);
  const side = (s, i) => {
    const x = CX + gapX / 2 + (i ? -(w + gapX) : 0);
    return `<div class="panel vside" data-role="side${i}" data-at="${(g.at || [0, 0.15])[i]}"${g.pick === (i ? 'b' : 'a') ? ` data-pick-at="${g.pickAt ?? 1.2}"` : ''} style="left:${r1(x)}px"><div class="lab">${esc(s.label)}</div></div>`;
  };
  return {
    css: `
.vside{top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;display:flex;align-items:center;justify-content:center}
.vside .lab{font-weight:700;font-size:${r1(size)}px;white-space:nowrap;unicode-bidi:plaintext}
.vside.on{background:#242424;border-color:#E85A02;border-radius:32px}
.vs{left:${r1(CX - 60)}px;width:120px;top:${r1(y + h / 2 - size * 0.5)}px;text-align:center;direction:ltr;font:600 ${r1(size * 0.75)}px/${r1(size)}px "IBM Plex Mono",monospace;color:#E85A02}`,
    html: `${kickerHtml(g)}\n  ${side(g.a, 0)}\n  ${side(g.b, 1)}\n  <div class="abs vs" data-role="vs">vs</div>`,
    js: `
const sides=[$('side0'),$('side1')],vs=$('vs');
for(const s of sides){const l=s.querySelector('.lab'),fs=parseFloat(getComputedStyle(l).fontSize),max=s.clientWidth-fs*.8;let z=fs;while(l.scrollWidth>max&&z>fs*.6){z*=.94;l.style.fontSize=z+'px';}}
render=(t)=>{${kickerJs(g)}
  for(const s of sides){const at=+s.dataset.at,lt=t-at;if(lt<0){op(s,0);continue;}const e=env(lt,D-at);op(s,e.a);s.style.transform='translateY('+e.y+'px)';
    s.classList.toggle('on',s.dataset.pickAt!=null&&t>+s.dataset.pickAt);}
  const a1=+sides[1].dataset.at+.1,lv=t-a1;if(lv<0)op(vs,0);else{const e=env(lv,D-a1,'snappy');op(vs,e.a);vs.style.transform='translateY('+e.y+'px)';}};`,
  };
};

C.title = (g) => {
  const size = rem(g.size || 3.2), ks = rem(0.8), ss = size * 0.4;
  return {
    css: `
.shade{inset:0;background:rgb(15,15,15)}
.tbox{left:${r1(W * 0.05)}px;width:${r1(W * 0.9)}px;top:0;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.tbox .tag{font-size:${r1(Math.max(28, ks))}px;margin-bottom:${r1(ks * 1.4)}px}
.tbox .tt{font-weight:700;font-size:${r1(size)}px;line-height:1.2;white-space:nowrap}
.tbox .sub{font-weight:400;font-size:${r1(ss)}px;line-height:1.3;color:#999;margin-top:${r1(ss * 0.7)}px;direction:ltr}`,
    html: `
  <div class="abs shade" data-role="shade"></div>
  <div class="abs tbox" data-role="tbox">
    ${g.kicker ? `<div><span class="tag">#${esc(g.kicker)}</span></div>` : ''}
    <div class="tt" data-at="0.25">${(g.lines || [g.text]).map((l) => `<div><span class="ty" data-cps="${g.cps || 26}">${esc(l)}</span></div>`).join('')}</div>
    ${g.sub ? `<div class="sub${isAr(g.sub) ? '' : ' lat'}" data-role="sub">${esc(g.sub)}</div>` : ''}
  </div>`,
    js: `
const shade=$('shade'),box=$('tbox'),at=+box.querySelector('.tt').dataset.at,sub=$('sub'),lines=[...box.querySelectorAll('.ty')].map(typer);
render=(t)=>{const a=Math.min(clamp(t*5),1-tw(t,D-.3,.3));op(shade,${g.shade ?? 0.9}*a);op(box,a);
  let lt=t-at;lines.forEach((ty,i)=>{ty.set(lt,i===lines.length-1?99:0);lt-=ty.len;});if(sub)op(sub,clamp((lt-.1)*4));};`,
  };
};

C.list = (g) => {
  const size = rem(g.size || 1.8), w = SW, head = g.title ? size * 1.9 : size * 0.5, row = size * 1.55, pad = size * 0.5, y = top(g);
  const items = g.items.map((it, i) => `<div class="it" data-at="${g.at ? g.at[i] : 0.3 + i * (g.every || 0.6)}" style="top:${r1(head + size * 0.4 + size * 0.2 - size * 0.6 + i * row + row - size * 1.15 + size * 0.2)}px"><i></i><span>${esc(it)}</span></div>`).join('');
  return {
    css: `
.lst{left:${r1(CX - w / 2)}px;top:${r1(y)}px;width:${r1(w)}px}
.lst .panel{left:0;top:0;width:100%}
.lst .ttl{position:absolute;right:${r1(size)}px;top:${r1(size * 0.4 + size * 1.15 - size * 1.1 * 0.95)}px;font-weight:700;font-size:${r1(size * 1.1)}px;line-height:1.2;color:#2FB161}
.lst .it{position:absolute;right:${r1(size)}px;height:${r1(size * 1.3)}px;display:flex;align-items:center;gap:${r1(size * 0.45)}px;font-weight:600;font-size:${r1(size)}px;white-space:nowrap}
.lst .it i{display:block;width:${r1(size * 0.55)}px;height:${r1(size * 0.55)}px;background:#166434;flex:none}`,
    html: `${kickerHtml(g)}
  <div class="abs lst" data-role="lst" data-head="${r1(head)}" data-row="${r1(row)}" data-pad="${r1(pad)}" data-empty="${g.title ? 0 : 1}">
    <div class="panel" data-role="panel"></div>
    ${g.title ? `<div class="ttl">${esc(g.title)}</div>` : ''}
    ${items}
  </div>`,
    js: `
const lst=$('lst'),panel=$('panel'),its=[...lst.querySelectorAll('.it')],HEAD=+lst.dataset.head,ROW=+lst.dataset.row,PAD=+lst.dataset.pad,MIN=+lst.dataset.empty;
render=(t)=>{${kickerJs(g)}const e=env(t,D);op(lst,e.a);lst.style.transform='translateY('+e.y+'px)';
  const grown=its.reduce((a,it)=>a+sp(t-(+it.dataset.at)+.08,'snappy'),0);panel.style.height=(HEAD+Math.max(MIN,grown)*ROW+PAD)+'px';
  for(const it of its){const at=+it.dataset.at;if(t<at){op(it,0);continue;}op(it,clamp((t-at)*6));it.style.transform='translateX('+(-(1-sp(t-at,'snappy'))*${rem(1)})+'px)';}};`,
  };
};

C.tracker = (g) => {
  const size = rem(g.size || 1.45), ch = size * 2.2, row = ch * 1.32, y0 = top(g);
  const SC = [[0.27, 0, -4], [-0.22, 0.12, 3], [0.2, 1.05, 2.5], [-0.27, 1.0, -3], [0.24, 2.05, -2], [-0.2, 2.1, 3.5]];
  const r = size * 0.48;
  const items = g.items.map((it, i) => {
    const [dx, dy, tilt] = SC[i % SC.length], xC = CX + dx * SW, yC = y0 + dy * row + ch / 2;
    return `<div class="trk" data-at="${g.at?.[i] ?? i * 0.15}"${g.checkAt ? ` data-check="${g.checkAt[i]}"` : ''} data-tilt="${tilt}" style="left:${r1(xC)}px;top:${r1(yC)}px"><div class="chip"><svg viewBox="-1 -1 2 2" width="${r1(r * 2)}" height="${r1(r * 2)}"><circle class="ring" r="${r3(1 - 0.07)}"/><circle class="fill" r="1"/><polyline class="tick" points="-0.45,0.02 -0.12,0.34 0.48,-0.32"/></svg><span>${esc(it.label)}</span></div></div>`;
  }).join('');
  return {
    css: `
.trk{position:absolute;width:0;height:0}
.trk .chip{position:absolute;left:0;top:0;transform:translate(-50%,-50%);height:${r1(ch)}px;box-sizing:border-box;display:flex;align-items:center;direction:ltr;
  padding:0 ${r1(size * 1.05)}px 0 ${r1(size * 1.05 - r)}px;gap:${r1(size * 0.95 - r)}px;border-radius:24px;background:rgba(26,26,26,.95);border:2px solid #404040;
  font:700 ${r1(size)}px/1 "IBM Plex Sans",sans-serif;white-space:nowrap}
.trk.on .chip{border-color:#E85A02}
.trk svg{overflow:visible;flex:none}
.trk .ring{fill:none;stroke:#404040;stroke-width:.14}
.trk.on .ring{stroke:#E85A02}
.trk .fill{fill:#E85A02}
.trk .tick{fill:none;stroke:#000;stroke-width:.26;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1.2;stroke-dashoffset:1.2}`,
    html: `${kickerHtml(g)}\n  ${items}`,
    js: `
const its=[...root.querySelectorAll('.trk')];
render=(t)=>{${kickerJs(g)}const out=tw(t,D-.25,.25);
  for(const it of its){const at=+it.dataset.at,lt=t-at;if(lt<0){op(it,0);continue;}const k=sp(lt,'snappy'),ck=it.dataset.check?clamp((t-(+it.dataset.check))/.3):0;
    op(it,clamp(lt*7)*(1-out));const s=.9+.1*k+.06*Math.sin(Math.PI*ck);
    it.style.transform='translateY('+(-(1-k)*${rem(1.6)})+'px) rotate('+it.dataset.tilt+'deg) scale('+s+')';
    it.classList.toggle('on',ck>0);const f=it.querySelector('.fill');f.setAttribute('r',String(ck>0?Math.min(1,ck*1.2):0));
    it.querySelector('.tick').style.strokeDashoffset=String(1.2*(1-clamp((ck-.3)/.7)));}};`,
  };
};

// Nino, the 9k pixel mascot (geometry from lib/brand.js / the 9k design system's I9kNino)
const NINO_FACES = {
  worried: { eyes: [[20, 22, 8, 8], [36, 22, 8, 8]], brows: ['M18 18H22V16H28V18H22V20H18Z', 'M36 16H42V18H46V20H42V18H36Z'], mouth: 'M20 40V36H24V34H40V36H44V40H40V38H24V40Z' },
  happy: { eyes: [{ d: 'M20 20H28V22H30V28H26V24H22V28H18V22H20Z' }, { d: 'M36 20H44V22H46V28H42V24H38V28H34V22H36Z' }], cheeks: true, mouth: 'M18 32H46V34H44V38H40V40H24V38H20V34H18Z' },
  thinking: { eyes: [[18, 22, 12, 4], [34, 16, 12, 12]], brows: ['M18 18H28V20H18Z', 'M34 12H46V14H34Z'], mouth: 'M32 34H42V38H32Z' },
  idle: { eyes: [[18, 16, 12, 12], [34, 16, 12, 12]], mouth: 'M18 32H22V34H42V32H46V36H44V38H40V40H24V38H20V36H18Z' },
};
function ninoSvg(expr, look) {
  const f = NINO_FACES[expr] || NINO_FACES.idle, rect = ([x, y, w, h], c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const shape = (s, c) => (Array.isArray(s) ? rect(s, c) : `<path d="${s.d}" fill="${c}"/>`);
  const body = '#2FB161', acc = '#E85A02';
  return `<svg viewBox="0 0 64 64" width="100%" height="100%" shape-rendering="crispEdges"><g data-role="ninobody">
${[[20, 48, 4, 2], [40, 48, 4, 2], [16, 50, 12, 6], [36, 50, 12, 6], [2, 24, 6, 14], [56, 24, 6, 14], [30, 4, 4, 4]].map((r) => rect(r, body)).join('')}${rect([28, 0, 8, 4], acc)}
<path d="M10 8H54V10H56V46H54V48H10V46H8V10H10Z" fill="${body}"/><path d="M14 12H50V14H52V42H50V44H14V42H12V14H14Z" fill="#0A111A"/><path d="M14 14H18V16H16V18H14V14Z" fill="rgba(255,255,255,0.22)"/>
${f.cheeks ? rect([14, 32, 4, 2], 'rgba(232,90,2,0.45)') + rect([46, 32, 4, 2], 'rgba(232,90,2,0.45)') : ''}${(f.brows || []).map((d) => `<path d="${d}" fill="${acc}"/>`).join('')}
<g data-role="eyes" transform="translate(${look[0]} ${look[1]})">${f.eyes.map((e) => shape(e, acc)).join('')}</g>
<path d="${f.mouth}" fill="${body}"/></g></svg>`;
}
C.nino = (g) => {
  const size = rem(g.size || 6), end = (g.corner || 'end') === 'end', right = end !== (E.dir === 'rtl');
  const x = right ? W * 0.78 - size : W * 0.08, y = Math.max(FACE, Math.min(0.58 * H, (CAPY / H - 0.065) * H - size - rem(0.6)));
  const lookKey = g.look || (right ? 'start' : 'end'), rtl = E.dir === 'rtl';
  const look = { center: [0, 0], up: [0, -4], down: [0, 4], start: [rtl ? 4 : -4, 0], end: [rtl ? -4 : 4, 0] }[lookKey] || [0, 0];
  return {
    css: `.nino{left:${r1(x)}px;top:${r1(y)}px;width:${r1(size)}px;height:${r1(size)}px}`,
    html: `<div class="abs nino" data-role="nino" data-expression="${g.expression || 'happy'}">${ninoSvg(g.expression || 'happy', look)}</div>`,
    js: `
const n=$('nino'),bodyG=n.querySelector('[data-role=ninobody]'),eyes=n.querySelector('[data-role=eyes]'),ex=n.dataset.expression,eyeT=eyes.getAttribute('transform');
render=(t)=>{const k=sp(t,'playful'),o=tw(t,D-.25,.25);op(n,1-o);n.style.transform='translateY('+((1-k)*${rem(5)}+o*${rem(5)})+'px)';
  let dx=0,dy=0;if(ex==='thinking')dy=-2*(.5-.5*Math.cos(2*Math.PI*(t%2.4)/2.4));if(ex==='worried')dx=[0,-1,0,1][Math.floor(((t%.6)/.6)*4)];
  bodyG.setAttribute('transform','translate('+dx+' '+dy+')');const bp=(t%5.4)/5.4,blink=bp>=.94&&bp<.97;
  eyes.setAttribute('transform',eyeT+(blink?' translate(0 22) scale(1 .15) translate(0 -22)':''));};`,
  };
};

C.band = (g) => {
  const size = rem(g.size || 3.4), by = (g.y ?? 0.6) * H, bh = Math.max(size * 2.2, H * (g.height ?? 0.15));
  const txt = g.underline && g.text.includes(g.underline)
    ? esc(g.text.slice(0, g.text.indexOf(g.underline))) + `<span class="u">${esc(g.underline)}<i data-role="ul" data-at="${g.underlineAt ?? 0.3}"></i></span>` + esc(g.text.slice(g.text.indexOf(g.underline) + g.underline.length))
    : esc(g.text);
  return {
    css: `
.band{left:0;width:${W}px;background:#166434}
.btxt{left:0;width:${W}px;top:${r1(by - size * 0.7)}px;height:${r1(size * 1.4)}px;display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:${r1(size)}px;white-space:nowrap;color:#fff}
.btxt .u{position:relative}
.btxt .u i{position:absolute;right:0;top:1.22em;height:.1em;width:0;background:#E85A02}`,
    html: `
  <div class="abs band" data-role="band" data-y="${r1(by)}" data-h="${r1(bh)}"></div>
  <div class="abs btxt" data-role="btxt"><span>${txt}</span></div>`,
    js: `
const band=$('band'),bt=$('btxt'),ul=$('ul'),BY=+band.dataset.y,BH=+band.dataset.h;
{const sp0=bt.firstElementChild,fs=parseFloat(getComputedStyle(bt).fontSize);let z=fs;while(sp0.offsetWidth>${r1(W * 0.86)}&&z>fs*.6){z*=.94;bt.style.fontSize=z+'px';}} // long lines shrink to fit, like the canvas
render=(t)=>{const wipe=sp(t,'heavy'),out=tw(t,D-.2,.2),hh=BH*wipe*(1-out);band.style.top=(BY-hh/2)+'px';band.style.height=hh+'px';
  op(bt,clamp((t-.12)*6)*(1-out));if(ul)ul.style.width=(100*tw(t,+ul.dataset.at,.3))+'%';};`,
  };
};

C.cta = (g) => {
  const size = rem(g.size || 1.9), y = FACE + (g.dy ? g.dy * H : 0); // captions:false → zoneY isn't lifted
  const parts = g.text.split(g.pill);
  return {
    css: `
.dim{inset:0;background:#000}
.cta{left:0;width:${r1(CX * 2)}px;top:${r1(y)}px}
.cta .line{text-align:center;font-weight:700;font-size:${r1(size * 0.8)}px;line-height:1.2;color:#999;height:${r1(size * 1.2)}px}
.cta .btnrow{position:absolute;left:0;right:0;top:${r1(size * 2.0)}px;display:flex;justify-content:center}
.cta .btn{height:${r1(size * 2.6)}px;padding:0 ${r1(size * 1.2)}px;border-radius:24px;background:#166434;display:flex;align-items:center;gap:${r1(size * 0.25)}px;
  font-weight:700;font-size:${r1(size)}px;color:#fff;white-space:nowrap}
.cta .pill{font-family:"IBM Plex Sans",sans-serif;direction:ltr;padding:0 ${r1(size * 0.3)}px;height:${r1(size * 1.44)}px;line-height:${r1(size * 1.44)}px;border-radius:16px;position:relative}
.cta .pill b{position:absolute;inset:0;border-radius:16px;background:#E85A02;opacity:0}
.cta .pill span{position:relative}`,
    html: `
  <div class="abs dim" data-role="dim" data-dim="${g.dim || 0}"></div>
  <div class="abs cta" data-role="cta">
    <div class="line"><span class="ty" data-cps="20" data-caret="off" data-at="0.1">${esc(g.line || '')}</span></div>
    <div class="btnrow" data-role="btnrow" data-at="${g.buttonAt ?? 0.6}"><div class="btn">${parts[0].trim() ? `<span>${esc(parts[0].trim())}</span>` : ''}<span class="pill" data-role="pill" data-at="${g.pillAt ?? 1.2}"><b></b><span>${esc(g.pill)}</span></span>${(parts[1] || '').trim() ? `<span>${esc(parts[1].trim())}</span>` : ''}</div></div>
  </div>`,
    js: `
const dim=$('dim'),cta=$('cta'),tEl=cta.querySelector('.ty'),ty=typer(tEl),row=$('btnrow'),pill=$('pill'),DIM=+dim.dataset.dim;
render=(t)=>{op(dim,DIM*Math.min(clamp(t*5),clamp((D-t)*5)));const e=env(t,D);op(cta,e.a);cta.style.transform='translateY('+e.y+'px)';
  ty.set(t-(+tEl.dataset.at));const bt=t-(+row.dataset.at);if(bt<0)op(row,0);else{op(row,clamp(bt*6));row.style.transform='translateY('+((1-sp(bt,'snappy'))*${rem(1)})+'px)';}
  const pa=+pill.dataset.at,on=t>pa;pill.querySelector('b').style.opacity=on?String(.4+.6*sp(t-pa,'snappy')):'0';pill.querySelector('span').style.color=on?'#000':'#fff';};`,
  };
};

// ---- write one sub-composition per graphic ---------------------------------------------------------------
const NAMES = { stamp: 'hook', chips: 'chips', card: 'card', stat: 'stat', versus: 'versus', title: 'title', list: 'list', tracker: 'tracker', nino: 'nino', band: 'band', cta: 'cta' };
function scope(css, id) { // prefix every rule with the scene's root so scenes never style each other
  return css.trim().split('\n').map((l) => l.replace(/^([^{@][^{]*)\{/, (m, sel) => sel.split(',').map((s) => `#${id}-scene ${s.trim()}`).join(',') + '{')).join('\n');
}
function writeScene(g, i) {
  const id = `g${String(i + 1).padStart(2, '0')}`, name = `${id}-${NAMES[g.type] || g.type}`;
  const c = C[g.type](g);
  const html = `<!doctype html>
<!-- ${name}: ${g.type} graphic, ported from the canvas montage. Text and word timings (data-at, seconds from this clip's start) are editable here. -->
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
<style>
${fontFaces('assets/')}
${BASE_CSS.trim()}
${scope(c.css, id)}
</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
 <div id="${id}-scene" class="k9">
  ${c.html.trim()}
 </div>
${sfxFor(g, id)}
</div>
<script>
(function(){
${RUNTIME.trim()}
const root=document.getElementById('${id}-scene'),$=(r)=>root.querySelector('[data-role='+r+']');
const host=root.closest('[data-duration]'),D=host?+host.dataset.duration:${r3(g.dur)};
let render=()=>{};
${c.js.trim()}
const tl=gsap.timeline({paused:true}),clock={t:0};
tl.to(clock,{t:D,duration:D,ease:'none',onUpdate:()=>render(clock.t)},0);
render(0);
window.__timelines["${id}"]=tl;
})();
</script>
    </template>
  </body>
</html>
`;
  fs.writeFileSync(`${OUT}/compositions/${name}.html`, html);
  return { id, name, g };
}

// ---- captions: one track, every chunk, word-by-word like overlay.js -------------------------------------------
function writeCaptions(scenes) {
  const off = E.graphics.filter((g) => g.captions === false || ['band', 'title', 'quote', 'endcard'].includes(g.type)).map((g) => [g.t, g.t + g.dur]);
  const size = CAPSIZE, gap = size * 0.28;
  const chunks = CAPS.map((c, i) => {
    const toks = c.tokens.map((tk) => `<span class="w${tk.latin ? ' lat' : ''}${tk.kw ? ' kw' : ''}" data-s="${tk.s}" data-e="${tk.e}">${esc(tk.w)}</span>`).join('');
    return `  <div class="ch" data-s="${r3(c.s)}" data-until="${r3(c.end)}"><div class="box">${toks}</div></div>`;
  }).join('\n');
  const html = `<!doctype html>
<!-- captions: every caption chunk on one track. Edit a word's text in place; data-s / data-e are its spoken times (seconds). -->
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
<style>
${fontFaces('assets/')}
${BASE_CSS.trim()}
#captions-scene .ch{position:absolute;left:0;width:${r1(CX * 2)}px;top:${r1(CAPY)}px;height:0;display:flex;justify-content:center;align-items:center}
#captions-scene .box{max-width:${r1(SW * 0.92 + size)}px;box-sizing:border-box;padding:${r1(size * 0.3)}px ${r1(size * 0.5)}px;border-radius:24px;
  background:rgba(15,15,15,.86);border:2px solid #404040;text-align:center;font-weight:700;font-size:${r1(size)}px;line-height:${r1(size * 1.32)}px;white-space:normal}
#captions-scene .w{display:inline-block;margin:0 ${r1(gap / 2)}px;padding:0 ${r1(size * 0.16)}px;margin-inline:${r1(gap / 2 - size * 0.16)}px;border-radius:16px;color:rgba(245,245,245,.42);line-height:${r1(size * 1.12)}px}
#captions-scene .w.lat{font-family:"IBM Plex Sans",sans-serif;font-size:${r1(size * 0.92)}px}
</style>
<div id="root" data-composition-id="captions" data-width="${W}" data-height="${H}">
 <div id="captions-scene" class="k9" data-off='${JSON.stringify(off.map(([a, b]) => [r3(a), r3(b)]))}'>
${chunks}
 </div>
</div>
<script>
(function(){
${RUNTIME.trim()}
const root=document.getElementById('captions-scene'),chs=[...root.querySelectorAll('.ch')],OFF=JSON.parse(root.dataset.off);
const ws=chs.map(c=>[...c.querySelectorAll('.w')]);
function render(t){const hidden=OFF.some(([a,b])=>t>=a&&t<b);
  const cur=hidden?-1:chs.findIndex(c=>t>=+c.dataset.s-.05&&t<+c.dataset.until);
  chs.forEach((c,i)=>{const s=+c.dataset.s,end=+c.dataset.until,on=i===cur;c.style.display=on?'flex':'none';if(!on)return;
    const lt=t-(s-.05),out=tw(t,end-.1,.1),k=sp(lt,'snappy');op(c,clamp(lt*10)*(1-out));c.style.transform='translateY('+((1-k)*${rem(0.5)})+'px)';
    for(const w of ws[i]){const ws0=+w.dataset.s,spoken=t>=ws0,active=spoken&&t<+w.dataset.e+.05,kw=w.classList.contains('kw');
      if(kw&&active){const pk=sp(t-ws0,'snappy');w.style.background='rgba(232,90,2,'+(.4+.6*pk)+')';w.style.color='#000';}
      else{w.style.background='transparent';w.style.color=kw&&spoken?'#E85A02':'rgba(245,245,245,'+(.42+.58*tw(t,ws0,.16,eCss))+')';}}});}
const tl=gsap.timeline({paused:true}),clock={t:0};
tl.to(clock,{t:${DUR},duration:${DUR},ease:'none',onUpdate:()=>render(clock.t)},0);
render(0);
window.__timelines["captions"]=tl;
})();
</script>
    </template>
  </body>
</html>
`;
  fs.writeFileSync(`${OUT}/compositions/captions.html`, html);
}

// ---- root: footage segments with their camera, graphics, captions, extra sounds --------------------------------
function writeIndex(scenes) {
  // video clips: the kept source ranges, split again at framing cuts inside them (the camera toggles on every cut)
  const segs = []; let o = 0;
  for (const [s, e] of KEEP) {
    const inner = CUTS.filter((c) => c > o + 0.05 && c < o + (e - s) - 0.05);
    let a = s, oa = o;
    for (const c of inner) { segs.push({ out: oa, src: a, dur: c - oa }); a += c - oa; oa = c; }
    segs.push({ out: oa, src: a, dur: o + (e - s) - oa });
    o += e - s;
  }
  const cam = events(E.camera, CUTS);
  const vids = segs.map((s, i) => `      <video id="v${String(i + 1).padStart(2, '0')}" class="clip" src="assets/footage.mp4" data-start="${r3(s.out)}" data-duration="${r3(s.dur)}" data-media-start="${r3(s.src)}" data-track-index="0" playsinline data-has-audio="true"></video>`).join('\n');
  // camera: each clip holds its own framing; pushes are tweens on the wrapper of the clip they play over
  const camJs = [];
  segs.forEach((s, i) => {
    const sel = `#v${String(i + 1).padStart(2, '0')}`, a = s.out, b = s.out + s.dur;
    camJs.push(`tl.set("${sel}",{scale:${r3(camAt(cam, a + 0.001).z)}},0);`);
    for (const e of cam.ev.filter((e) => e.ease === 'push')) {
      const p0 = Math.max(a, e.t), p1 = Math.min(b, e.t + e.dur); if (p1 <= p0) continue;
      camJs.push(`tl.fromTo("${sel}",{scale:${r3(camAt(cam, p0 + 0.0005).z)}},{scale:${r3(camAt(cam, p1 - 0.0005).z)},duration:${r3(p1 - p0)},ease:"sine.inOut",immediateRender:false},${r3(p0)});`);
    }
  });
  const hosts = scenes.map(({ id, name, g }) => `      <div id="${id}" class="clip graphic" data-composition-id="${id}" data-composition-src="compositions/${name}.html" data-start="${r3(g.t)}" data-duration="${r3(Math.min(g.dur, DUR - g.t))}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}" data-label="${esc(g.type)}${g.title ? ' · ' + esc(g.title) : g.text ? ' · ' + esc(g.text) : g.value ? ' · ' + esc(g.value) : ''}"></div>`).join('\n');
  const ex = E.audio.extra.map((x) => ({ f: file(x.src), t0: x.t, len: Math.min(lenOf(file(x.src)), DUR - x.t), vol: x.gain * 0.5 }));
  const exl = lanes(ex, 3);
  const extra = ex.map((x, i) => `      <audio id="fx-${x.f.replace(/\.\w+$/, '')}" src="assets/sfx/${x.f}" data-start="${r3(x.t0)}" data-duration="${r3(x.len)}" data-volume="${r3(x.vol)}" data-track-index="${exl[i]}"></audio>`).join('\n');
  const html = `<!doctype html>
<!-- ${E.title || 'AI Engineer · White Friday'} — ported from the 9k canvas montage. Tracks: 0 footage · 1 graphics · 2 captions · 3 sound. -->
<html lang="ar" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #000; }
      /* footage clips: the camera (script below) scales each clip from the top centre: 1.0 / punch-in on jump cuts, pushes on key words */
      #root > video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform-origin: 50% 0%; filter: saturate(${E.grade?.saturation ?? 1}); }
      #captions { z-index: 1; }
      .graphic { z-index: 2; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}">
${vids}
${hosts}
      <div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${DUR}" data-track-index="2" data-track-kind="captions" data-width="${W}" data-height="${H}"></div>
${extra}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      // camera: jump-cut framing per clip (1.0 / ${E.camera.punch}) and eased pushes
      ${camJs.join('\n      ')}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
  fs.writeFileSync(`${OUT}/index.html`, html);
  return segs;
}

fs.mkdirSync(`${OUT}/compositions`, { recursive: true });
const scenes = E.graphics.filter((g) => C[g.type]).map(writeScene);
const skipped = E.graphics.filter((g) => !C[g.type]).map((g) => g.type);
writeCaptions(scenes);
const segs = writeIndex(scenes);
console.log(`→ ${OUT}/index.html (${DUR} s, ${segs.length} footage clips) · ${scenes.length} graphics · captions (${CAPS.length} chunks)${skipped.length ? ' · NOT PORTED: ' + skipped.join(', ') : ''}`);
