// Shared 9k pieces every registry item is built from: fonts, tokens, base CSS, motion helpers, and the block shell.
// Edit here, then `node registry/build.mjs` regenerates every item, so all blocks stay identical in type and motion.

export const T = { // 9k design tokens (dark theme)
  bg: '#0F0F0F', surface: '#1A1A1A', surface2: '#242424', border: '#404040', text: '#F5F5F5', muted: '#999999',
  green: '#166434', greenText: '#2FB161', greenSel: '#1F3327', orange: '#E85A02', warning: '#F4C871', error: '#F39191', ink: '#0A111A',
};

const AR_RANGE = 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC';
const LAT_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
// [family, file stem, weights, unicode-range]
export const FONT_FILES = [
  ['IBM Plex Sans Arabic', 'ibm-plex-sans-arabic-arabic', [400, 600, 700], AR_RANGE],
  ['IBM Plex Sans Arabic', 'ibm-plex-sans-arabic-latin', [400, 600, 700], LAT_RANGE],
  ['IBM Plex Sans', 'ibm-plex-sans-latin', [400, 500, 600, 700], null],
  ['IBM Plex Mono', 'ibm-plex-mono-latin', [400, 700], null],
];
export const fontList = () => FONT_FILES.flatMap(([, stem, ws]) => ws.map((w) => `${stem}-${w}-normal.woff2`));
export const fontFaces = () => FONT_FILES.flatMap(([fam, stem, ws, range]) => ws.map((w) =>
  `@font-face{font-family:"${fam}";src:url("assets/fonts/${stem}-${w}-normal.woff2") format("woff2");font-weight:${w};font-display:block${range ? ';unicode-range:' + range : ''}}`)).join('\n');

// Base classes, scoped under .k9 so a block never leaks styles into the host.
export const BASE_CSS = `
.k9{position:absolute;inset:0;overflow:hidden;pointer-events:none;direction:rtl;color:${T.text};font-family:"IBM Plex Sans Arabic","IBM Plex Sans",sans-serif;-webkit-font-smoothing:antialiased}
.k9 .abs{position:absolute}
.k9 .lat{font-family:"IBM Plex Sans",sans-serif;direction:ltr;unicode-bidi:isolate}
.k9 .mono{font-family:"IBM Plex Mono",monospace;direction:ltr;unicode-bidi:isolate}
.k9 .center{position:absolute;left:0;right:0;display:flex;justify-content:center}
.k9 .caret{display:inline-block;width:.08em;height:.9em;margin:0 .04em;background:${T.orange};vertical-align:-.1em}
.k9 .glow{position:absolute;width:760px;height:760px;border-radius:50%;filter:blur(90px);opacity:.22}
.k9 .panelbg{position:absolute;inset:0;background:${T.bg}}
`;
// The dark scene panel: near-black with a green glow top-left and an orange glow bottom-right.
export const PANEL_BG = `<div class="panelbg"></div><div class="glow" data-layout-ignore style="left:-300px;top:-420px;background:${T.green}"></div><div class="glow" data-layout-ignore style="right:-360px;bottom:-480px;background:${T.orange};opacity:.12"></div>`;

// Motion: 9k springs (snappy/default/heavy, no overshoot on type), the 9k ease, pop-on-the-word, typed reveal with caret.
export const HELPERS = `
const clamp=(x,a,b)=>Math.min(b===undefined?1:b,Math.max(a===undefined?0:a,x));
function spring(t,k,d){if(t<=0)return 0;const w0=Math.sqrt(k),z=d/(2*w0);if(z<1){const wd=w0*Math.sqrt(1-z*z);return 1-Math.exp(-z*w0*t)*(Math.cos(wd*t)+(z*w0/wd)*Math.sin(wd*t));}return 1-Math.exp(-w0*t)*(1+w0*t);}
const SPR={snappy:[320,34],default:[170,26],heavy:[120,24]};
const sp=(t,p)=>{const s=SPR[p||'default'];return spring(t,s[0],s[1]);};
function bez(x1,y1,x2,y2){const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;const sx=s=>((ax*s+bx)*s+cx)*s,sy=s=>((ay*s+by)*s+cy)*s;return x=>{x=clamp(x);let s=x;for(let i=0;i<8;i++){const dx=(3*ax*s+2*bx)*s+cx;if(Math.abs(dx)<1e-6)break;s-=(sx(s)-x)/dx;}return sy(clamp(s));};}
const e9=bez(.4,0,.2,1);
const tw=(t,s,d)=>e9(clamp((t-s)/d));
const op=(el,a)=>{el.style.opacity=String(clamp(a));};
const pop=(el,t,s,p)=>{const k=sp(t-s,p||'snappy');op(el,clamp((t-s)*7));el.style.transform='translateY('+((1-k)*28).toFixed(1)+'px) scale('+(0.94+0.06*k).toFixed(4)+')';return k;};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
function typed(el,txt,t,s,cps,keep){const n=Math.max(0,Math.min(txt.length,Math.floor((t-s)*(cps||20))));const typing=n<txt.length&&t>=s;const blink=((t-s)%1.06)<.53;const show=t>=s&&(typing||(keep&&blink));el.innerHTML=esc(txt.slice(0,n))+(show?'<span class="caret"></span>':'');return n;}
const NS='http://www.w3.org/2000/svg';
const mk=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;};
`;

// A block = one sub-composition with declared variables, one paused timeline that drives render(t).
// Per instance: the host sets data-variable-values; window.__hyperframes.getVariables() returns that instance's values.
export function blockHtml({ name, w, h, vars, css, html, js, length }) {
  const decl = JSON.stringify(vars).replace(/'/g, '&#39;');
  const defaults = Object.fromEntries(vars.map((v) => [v.id, v.default]));
  return `<!doctype html>
<html data-composition-variables='${decl}'>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
<style>
${fontFaces()}
${BASE_CSS}
${css}
</style>
<div id="root" data-composition-id="${name}" data-width="${w}" data-height="${h}">
  <div class="k9 ${name}" data-k9="${name}">
${html}
  </div>
</div>
<script>
(function(){
${HELPERS}
const V=Object.assign(${JSON.stringify(defaults)},(window.__hyperframes&&window.__hyperframes.getVariables&&window.__hyperframes.getVariables())||{});
const all=document.querySelectorAll('[data-k9="${name}"]:not([data-k9-on])');
const root=all[all.length-1];root.setAttribute('data-k9-on','1');
const $=(r)=>root.querySelector('[data-role="'+r+'"]');
${js}
const D=Math.max(0.1,${length});
const tl=gsap.timeline({paused:true}),clock={t:0};
tl.to(clock,{t:D,duration:D,ease:'none',onUpdate:()=>render(clock.t)},0);
render(0);
window.__timelines["${name}"]=tl;
})();
</script>
    </template>
  </body>
</html>
`;
}
