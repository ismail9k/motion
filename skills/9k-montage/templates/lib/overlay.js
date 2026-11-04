// Montage overlay: captions + 9k graphic components drawn over footage. Pure function of t.
// Classic script — exposes window.O. Depends on M (motion.js) and B (brand.js).
// Every graphic is { type, t, dur, ...props } in OUTPUT time. Optional on any graphic:
//   zone: 'top' | 'mid' | 'center' | 'low'   (portrait) — or y: 0..1 (centre of the graphic, fraction of H)
//   x / w: centre and width as fractions of W · side: 'start' | 'end' = the 16:9 side column (x 0.79 / 0.21, w 0.34)
//   kicker: a small tag above the graphic, on screen from its first frame (the label the build hangs under)
//   dim: 0..0.6  darken the footage behind it · sfx: false to mute its auto sound
//   dx / dy: move the whole graphic by a fraction of W / H (what dragging it in the editor sets)
(function (g) {
  const { clamp, lerp, sp, tween, typed, retype, caretOn, ease9k } = M;
  let G, W, H, R, DIR, PORTRAIT, ICONS = {}, IMAGES = {};
  const rem = (n) => n * R;

  // ---- layout ------------------------------------------------------------------
  // Shorts/Reels UI covers the top ~8 %, the bottom ~22 % and a right strip ~12 %: keep everything inside.
  // A seated talking head fills ~0.12–0.45 H, so the default graphic band (mid) starts below the chin at 0.46 H
  // and captions sit at 0.72 H. Override per film with zone/y after looking at work/contact.png.
  // Graphics never grow into the caption band: anything that would cross its top is lifted (not when captions are off).
  let CAP_TOP = 0.655, FACE = null; // FACE: edit.json faceBottom — no graphic (kicker included) starts above it
  // KICK: room kept above the graphic for its kicker tag · TOPY: where that tag goes (the first zoneY of a graphic)
  let KICK = 0, TOPY = null;
  function zoneY(p, h0 = 0) {
    const h = h0 + KICK;
    const floor = FACE != null && !p.overFace ? FACE * H : H * 0.08;
    const lift = (y) => Math.max(floor, p.captions === false ? y : Math.min(y, CAP_TOP * H - h - rem(0.6)));
    const z = p.zone || 'mid';
    const P = { top: 0.10, mid: 0.46, center: 0.5 - h / 2 / H, low: 0.58 };
    const L = { top: 0.08, mid: 0.30, center: 0.5 - h / 2 / H, low: 0.62 };
    const y = lift(p.y != null ? p.y * H - h / 2 : (PORTRAIT ? P : L)[z] * H);
    if (TOPY == null) TOPY = y;
    return y + KICK;
  }
  // Logical side → physical: 'start' is the reading start (the right in an RTL film)
  const onRight = (p) => p.side === 'right' || (p.side !== 'left' && ((p.side || 'start') === 'start') === (DIR === 'rtl'));
  // A tag centred on xC (B.badge takes the start edge, so measure it first)
  function tagC(text, xC, y, size) {
    G.save(); const a = G.globalAlpha; G.globalAlpha = 0; const { w } = B.badge(G, text, 0, -9999, { variant: 'tag', size });
    G.globalAlpha = a; B.badge(G, text, DIR === 'rtl' ? xC + w / 2 : xC - w / 2, y, { variant: 'tag', size }); G.restore();
  }
  const KSIZE = () => rem(0.85);
  function kicker(t, p, y) {
    G.save(); G.globalAlpha *= Math.min(clamp(t * 6), 1 - tween(t, p.dur - 0.25, 0.25));
    tagC(p.kicker, cx(), y + (1 - sp(t, 'snappy')) * rem(0.6), KSIZE()); G.restore();
  }
  // Split layout (C.panel): the column slides in on this curve and compose.mjs slides the footage the other way
  // by half the column on the same one (lib/camera.mjs → shiftAt). Keep the two in step.
  const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
  const slide = (t, dur) => smooth(t / 0.5) - smooth((t - (dur - 0.4)) / 0.4);
  let CAPDX = 0;
  // Per-graphic x (centre) / w (width) as fractions of W: set while that graphic draws, e.g. a side column in 16:9.
  let CX = null, SW = null;
  const safeW = () => (SW != null ? SW * W : PORTRAIT ? W * 0.84 : W * 0.6);
  const cx = () => (CX != null ? CX * W : PORTRAIT ? W * 0.47 : W / 2); // portrait: nudge left of the like/comment rail

  // Envelope: spring in, 0.25 s ease out. Returns { k (0→1 in), a (alpha), y (px offset) }.
  function env(t, dur, preset = 'default') {
    const k = sp(t, preset), o = tween(t, dur - 0.25, 0.25);
    return { k, a: Math.min(clamp(t * 6), 1 - o), y: (1 - k) * rem(1.4) + o * rem(0.5) };
  }
  function withEnv(e, fn) { G.save(); G.globalAlpha *= e.a; G.translate(0, e.y); fn(); G.restore(); }

  function setFont(weight, size, latin) {
    G.font = `${weight} ${Math.round(size)}px ${latin ? B.FONTS.sans : B.FONTS.arSans}`;
  }
  const isAr = (s) => /[؀-ۿ]/.test(s);
  function fontFor(s, weight, size, family = 'sans') {
    if (family === 'mono') return (G.font = `${weight} ${Math.round(size)}px ${B.FONTS.mono}`);
    if (isAr(s)) return (G.font = `${weight} ${Math.round(size)}px ${family === 'serif' ? B.FONTS.arDisplay : B.FONTS.arSans}`);
    G.font = `${weight} ${Math.round(size)}px ${family === 'serif' ? B.FONTS.serif : B.FONTS.sans}`;
  }

  // A typed line with the orange caret. align: 'center' | 'start'. Works for RTL/Arabic text.
  function typedLine(text, t, x, y, size, { cps = 18, weight = 700, family = 'sans', color, align = 'center', caret = true } = {}) {
    const s = typed(text, t, cps), typing = s.length < [...text].length;
    fontFor(text, weight, size, family);
    // align 'start' = the film's reading start (right edge in RTL); the text keeps its own direction
    const rtl = isAr(text), right = align === 'start' ? DIR === 'rtl' : align === 'end';
    G.direction = rtl ? 'rtl' : 'ltr'; G.textAlign = align === 'center' ? 'center' : right ? 'right' : 'left'; G.textBaseline = 'alphabetic';
    G.fillStyle = color || B.F.theme.text; G.fillText(s, x, y);
    if (caret && t >= 0 && caretOn(t, typing) && t < [...text].length / cps + 1.2) {
      const w = G.measureText(s).width;
      const endsLeft = align === 'center' ? rtl : right;
      const edge = align === 'center' ? (rtl ? x - w / 2 : x + w / 2) : right ? x - w : x + w;
      const cw = size * 0.08; G.fillStyle = B.C.accent;
      G.fillRect(endsLeft ? edge - cw * 2 : edge + cw, y - size * 0.8, cw, size * 0.95);
    }
    return s;
  }
  // Shrink a label until it fits maxW (never below 60 % of the requested size)
  function fit(text, weight, size, maxW, family) {
    let sz = size; fontFor(text, weight, sz, family);
    while (G.measureText(text).width > maxW && sz > size * 0.6) { sz *= 0.94; fontFor(text, weight, sz, family); }
    return sz;
  }
  function startText(text, x, y) {
    G.direction = isAr(text) ? 'rtl' : 'ltr'; G.textAlign = DIR === 'rtl' ? 'right' : 'left'; G.fillText(text, x, y);
  }
  function wrap(text, size, maxW, weight = 700, family = 'sans') {
    fontFor(text, weight, size, family);
    const words = text.split(/\s+/), lines = []; let cur = '';
    for (const w of words) { const next = cur ? cur + ' ' + w : w; if (G.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next; }
    if (cur) lines.push(cur); return lines;
  }

  function icon(slug, x, y, size, color) {
    const ic = ICONS[slug]; if (!ic) return false;
    G.save(); G.translate(x, y); G.scale(size / 24, size / 24);
    G.fillStyle = color === 'brand' ? '#' + ic.hex : color || B.F.theme.text; G.fill(new Path2D(ic.path)); G.restore();
    return true;
  }
  function dim(a) { if (a > 0) { G.save(); G.fillStyle = `rgba(0,0,0,${a})`; G.fillRect(0, 0, W, H); G.restore(); } }

  // ---- captions -------------------------------------------------------------------
  // Word-by-word: spoken words full white, upcoming words dimmed, the chunk's keyword gets the
  // orange pill (black text) while it is spoken and stays orange after. One accent per chunk.
  function captions(t, chunks, opts = {}) {
    const c = chunks.find((c) => t >= c.s - 0.05 && t < c.end); if (!c) return 0;
    const size = rem(opts.size || (PORTRAIT ? 2.05 : 1.6)), gap = size * 0.28, maxW = safeW() * 0.92;
    const lt = t - (c.s - 0.05), out = tween(t, c.end - 0.1, 0.1), k = sp(lt, 'snappy');
    const rtl = DIR === 'rtl';
    // measure tokens
    const toks = c.tokens.map((tk) => { setFont(700, tk.latin ? size * 0.92 : size, tk.latin); return { ...tk, wd: G.measureText(tk.w).width }; });
    // break into lines (logical order), max 2
    const lines = [[]]; let lw = 0;
    for (const tk of toks) { if (lines.at(-1).length && lw + gap + tk.wd > maxW) { lines.push([]); lw = 0; } lw += (lines.at(-1).length ? gap : 0) + tk.wd; lines.at(-1).push(tk); }
    const lh = size * 1.32, padX = size * 0.5, padY = size * 0.3;
    const widths = lines.map((l) => l.reduce((a, x) => a + x.wd, 0) + gap * (l.length - 1));
    const boxW = Math.max(...widths) + padX * 2, boxH = lines.length * lh + padY * 2;
    const mid = cx() + CAPDX, yC = (opts.y ?? (PORTRAIT ? 0.72 : 0.84)) * H, x0 = mid - boxW / 2, y0 = yC - boxH / 2 + (1 - k) * rem(0.5);
    G.save(); G.globalAlpha = clamp(lt * 10) * (1 - out);
    B.rrect(G, x0, y0, boxW, boxH, B.radius.md()); G.fillStyle = 'rgba(15,15,15,0.86)'; G.fill();
    G.lineWidth = Math.max(1, R / 16); G.strokeStyle = B.F.theme.border; G.stroke();
    lines.forEach((line, li) => {
      // visual runs: consecutive Latin tokens read left→right inside an RTL line
      const runs = []; for (const tk of line) { const last = runs.at(-1); if (rtl && last && last.ltr && tk.latin) last.toks.push(tk); else runs.push({ ltr: !rtl || tk.latin, toks: [tk] }); }
      let x = rtl ? mid + widths[li] / 2 : mid - widths[li] / 2;
      const yB = y0 + padY + li * lh + lh * 0.72;
      for (const run of runs) {
        const rw = run.toks.reduce((a, tk) => a + tk.wd, 0) + gap * (run.toks.length - 1);
        let tx = rtl ? x - rw : x;
        const order = run.ltr ? run.toks : [...run.toks].reverse();
        for (const tk of order) {
          const spoken = t >= tk.s, active = spoken && t < tk.e + 0.05;
          const on = tween(t, tk.s, 0.16, M.easeCss);
          if (tk.kw && active) {
            const pk = sp(t - tk.s, 'snappy');
            B.rrect(G, tx - size * 0.16, yB - size * 0.86, tk.wd + size * 0.32, size * 1.12, B.radius.sm());
            G.fillStyle = B.C.accent; G.globalAlpha *= 0.4 + 0.6 * pk; G.fill(); G.globalAlpha = clamp(lt * 10) * (1 - out);
          }
          setFont(700, tk.latin ? size * 0.92 : size, tk.latin);
          G.direction = tk.latin ? 'ltr' : 'rtl'; G.textAlign = 'left'; G.textBaseline = 'alphabetic';
          G.fillStyle = tk.kw && active ? B.C.onAccent : tk.kw && spoken ? B.C.accent : `rgba(245,245,245,${0.42 + 0.58 * on})`;
          G.fillText(tk.w, tx, yB);
          tx += tk.wd + gap;
        }
        x += rtl ? -(rw + gap) : rw + gap;
      }
    });
    G.restore(); return 1;
  }

  // ---- graphic components ---------------------------------------------------------------
  const C = {};

  // Hook headline: typed in a feature panel, optional muted sub line.
  // cover: [x, y, w, h] (fractions) → the panel sits exactly there, opaque from frame one, to hide burned-in text.
  C.hook = (t, p) => {
    const e = env(t, p.dur, 'heavy'), cv = p.cover;
    const size = rem(p.size || (cv ? 1.9 : PORTRAIT ? 2.9 : 2.4)), w = cv ? cv[2] * W : safeW();
    const lines = wrap(p.text, size, w - size * 1.2, 700, p.family || 'sans');
    const subSize = Math.max(size * 0.55, rem(1.1)), need = lines.length * size * 1.25 + (p.sub ? subSize * 1.8 : 0) + size * 0.8;
    const h = cv ? Math.max(cv[3] * H, need) : need, y = cv ? cv[1] * H + cv[3] * H / 2 - h / 2 : zoneY({ zone: 'top', ...p }, h);
    const x = cv ? cv[0] * W : cx() - w / 2, mid = x + w / 2;
    const body = () => {
      let tt = t - (cv ? 0.1 : 0); const cps = p.cps || 20, top = y + (h - need) / 2;
      lines.forEach((ln, i) => { const d = [...ln].length / cps; typedLine(ln, tt, mid, top + size * 0.4 + (i + 0.8) * size * 1.25 - size * 0.2, size, { cps, family: p.family, caret: tt < d || i === lines.length - 1 }); tt -= d; });
      if (p.sub) { fontFor(p.sub, 400, subSize); G.fillStyle = B.F.theme.muted; G.textAlign = 'center'; G.direction = isAr(p.sub) ? 'rtl' : 'ltr'; G.globalAlpha *= clamp((tt - 0.1) * 4); G.fillText(p.sub, mid, y + h - subSize * 1.1); }
    };
    if (cv) { // no slide: the burned text must never peek out. Out: text fades, panel stays until the cover ends.
      G.save(); B.panel(G, x, y, w, h, { variant: 'feature' }); G.globalAlpha *= e.a; body(); G.restore();
    } else withEnv(e, () => { B.panel(G, x, y, w, h, { variant: 'feature' }); body(); });
    return [{ t: cv ? 0.1 : 0, type: 'type', text: p.text, cps: p.cps || 20, gain: 0.5 }];
  };

  // Chips: logo + label pills, staggered — or each on its word with at: [t…] (relative). items: [{ label, icon: 'react' (simple-icons slug), pick }]
  C.chips = (t, p) => {
    const items = p.items || [p], stagger = p.stagger ?? 0.18, ats = items.map((_, i) => p.at?.[i] ?? i * stagger);
    const measure = (sz) => items.map((it) => { fontFor(it.label, 700, sz); return G.measureText(it.label).width + sz * (it.icon && ICONS[it.icon] ? 3.4 : 2); });
    const size0 = rem(p.size || 1.7), w0 = measure(size0), t0 = w0.reduce((a, b) => a + b, 0) + size0 * 0.6 * (w0.length - 1);
    const size = size0 * clamp(safeW() / t0, 0.65, 1), ws = measure(size);   // shrink to one row before stacking
    const gapX = size * 0.6, total = ws.reduce((a, b) => a + b, 0) + gapX * (ws.length - 1), h = size * 2.6;
    const stack = total > safeW(); // too wide → stack vertically
    const y0 = zoneY(p, stack ? items.length * (h + gapX) : h);
    let x = cx() - (stack ? 0 : total / 2);
    items.forEach((it, i) => {
      const lt = t - ats[i], e = env(lt, p.dur - ats[i], 'snappy'), w = ws[i]; if (lt < 0) return void (x += w + gapX);
      const xx = stack ? cx() - w / 2 : DIR === 'rtl' ? 2 * cx() - x - w : x, yy = stack ? y0 + i * (h + gapX) : y0;
      withEnv({ ...e, y: e.y * 0.6 }, () => {
        B.rrect(G, xx, yy, w, h, B.radius.pill()); G.fillStyle = it.pick ? B.C.primary : 'rgba(26,26,26,0.94)'; G.fill();
        G.lineWidth = Math.max(1, R / 16); G.strokeStyle = it.pick ? B.C.primary : B.F.theme.border; G.stroke();
        const hasIcon = it.icon && icon(it.icon, xx + size * 0.8, yy + h / 2 - size * 0.7, size * 1.4, p.iconColor || (it.pick ? B.C.white : undefined));
        fontFor(it.label, 700, size); G.fillStyle = B.F.theme.text; G.textAlign = 'left'; G.direction = 'ltr'; G.textBaseline = 'middle';
        G.fillText(it.label, xx + size * (hasIcon ? 2.6 : 1), yy + h / 2 + size * 0.04);
      });
      x += w + gapX;
    });
    return ats.map((a) => ({ t: a, type: 'pop', gain: 0.45 }));
  };

  // Versus: two panels, "vs" between, optional points under each, `pick` gets the accent border at pickAt.
  // at: [aT, bT] when each side enters (relative) · a.pointsAt / b.pointsAt: [t…] per point (relative).
  C.versus = (t, p) => {
    const size = rem(p.size || 2), gapX = rem(3.2), w = (safeW() - gapX) / 2;
    const pts = Math.max((p.a.points || []).length, (p.b.points || []).length);
    const ps = p.pointSize ?? 0.78; // point labels under each side, as a fraction of size
    const h = size * 4.4 + pts * size * (ps + 0.42), y = zoneY(p, h);
    const sides = DIR === 'rtl' ? [p.a, p.b] : [p.a, p.b];
    const at = p.at || [0, 0.15];
    sides.forEach((s, i) => {
      const lt = t - at[i], e = env(lt, p.dur - at[i]); if (lt < 0) return;
      const xs = DIR === 'rtl' ? cx() + gapX / 2 + (i ? -(w + gapX) : 0) : cx() - safeW() / 2 + i * (w + gapX);
      const picked = p.pick === (i ? 'b' : 'a') && t > (p.pickAt ?? 1.2);
      withEnv(e, () => {
        B.panel(G, xs, y, w, h, { variant: picked ? 'feature' : 'default' });
        const hasIcon = s.icon && icon(s.icon, xs + w / 2 - size * 0.9, y + size * 0.7, size * 1.8, p.iconColor);
        fit(s.label, 700, size, w - size * 0.8); G.fillStyle = B.F.theme.text; G.textAlign = 'center'; G.direction = isAr(s.label) ? 'rtl' : 'ltr';
        G.fillText(s.label, xs + w / 2, y + size * (hasIcon ? 3.6 : 2.4));
        (s.points || []).forEach((pt, k) => {
          const pt0 = s.pointsAt ? s.pointsAt[k] : at[i] + 0.5 + k * 0.45;
          fontFor(pt, 600, size * ps); G.fillStyle = B.F.theme.muted; G.globalAlpha *= clamp((t - pt0) * 5);
          G.direction = isAr(pt) ? 'rtl' : 'ltr'; G.fillText(pt, xs + w / 2, y + size * (4.6 + ps * 0.3 + k * (ps + 0.42))); G.globalAlpha = e.a;
        });
      });
    });
    const ev = env(t - at[1] - 0.1, p.dur - at[1] - 0.1, 'snappy');
    withEnv(ev, () => { G.font = `600 ${Math.round(size * 0.75)}px ${B.FONTS.mono}`; G.fillStyle = B.C.accent; G.textAlign = 'center'; G.direction = 'ltr'; G.textBaseline = 'middle'; G.fillText('vs', cx(), y + h / 2); });
    return [{ t: at[0], type: 'whoosh', gain: 0.4 }, { t: at[1], type: 'pop', gain: 0.45 }, ...(p.pick ? [{ t: p.pickAt ?? 1.2, type: 'ding', gain: 0.35 }] : [])];
  };

  // Stat: a big number that counts up, label under it, optional source.
  C.stat = (t, p) => {
    const e = env(t, p.dur, 'heavy'), size = rem(p.size || 5.2), h = size * 1.9, y = zoneY(p, h);
    const m = String(p.value).match(/^([^\d]*)([\d.,]+)(.*)$/);
    let v = p.value;
    if (m && p.count !== false) { const n = parseFloat(m[2].replace(/,/g, '')), d = (m[2].split('.')[1] || '').length; v = m[1] + (n * tween(t, 0.1, 0.9)).toFixed(d) + m[3]; }
    withEnv(e, () => {
      B.panel(G, cx() - safeW() * 0.32, y, safeW() * 0.64, h, { variant: 'feature' });
      G.direction = 'ltr'; G.textAlign = 'center'; G.font = `700 ${Math.round(size)}px ${B.FONTS.sans}`; G.fillStyle = B.F.theme.text; G.textBaseline = 'alphabetic';
      G.fillText(v, cx(), y + size * 1.05);
      if (p.label) { fontFor(p.label, 400, size * 0.27); G.fillStyle = B.F.theme.muted; G.direction = isAr(p.label) ? 'rtl' : 'ltr'; G.fillText(p.label, cx(), y + size * 1.55); }
    });
    return [{ t: 0, type: 'pop', gain: 0.5 }, { t: 0.1, type: 'type', count: 6, cps: 7, gain: 0.3 }];
  };

  // Card: feature panel with a typed title, body lines, optional badge. at: when the title starts typing (relative,
  // default 0.15) — the badge holds the panel until his words reach the title · bodyAt: when the body fades in.
  C.card = (t, p) => {
    const e = env(t, p.dur), size = rem(p.size || 1.9), w = safeW();
    const tl = wrap(p.title, size, w - size * 1.6), bl = p.body ? wrap(p.body, size * 0.72, w - size * 1.6, 400) : [];
    const h = size * 1.2 + tl.length * size * 1.25 + bl.length * size * 0.95 + (p.badge ? size * 1.3 : 0) + size * 0.4, y = zoneY(p, h);
    withEnv(e, () => {
      B.panel(G, cx() - w / 2, y, w, h, { variant: 'feature' });
      const rtl = DIR === 'rtl', xs = rtl ? cx() + w / 2 - size * 0.8 : cx() - w / 2 + size * 0.8;
      let yy = y + size * 0.6;
      if (p.badge) { B.badge(G, p.badge, xs, yy, { variant: 'tag', size: size * 0.42 }); yy += size * 1.3; }
      let tt = t - (p.at ?? 0.15);
      tl.forEach((ln, i) => { const d = [...ln].length / (p.cps || 24); yy += size * 1.1; typedLine(ln, tt, xs, yy, size, { align: 'start', cps: p.cps || 24, caret: tt < d || i === tl.length - 1 }); tt -= d; yy += size * 0.15; });
      bl.forEach((ln, i) => { yy += size * 0.95; fontFor(ln, 400, size * 0.72); G.fillStyle = B.F.theme.muted; G.globalAlpha *= clamp(((p.bodyAt != null ? t - p.bodyAt : tt) - i * 0.12) * 5); startText(ln, xs, yy); G.globalAlpha = e.a; });
    });
    return [{ t: 0, type: 'pop', gain: 0.4 }, { t: p.at ?? 0.15, type: 'type', text: p.title, cps: p.cps || 24, gain: 0.4 }];
  };

  // List: items appear one by one (every s, or explicit at: [t…] relative to the graphic).
  // The panel grows a row as each item lands (no empty rows waiting); its top is placed for the full height.
  C.list = (t, p) => {
    const e = env(t, p.dur), size = rem(p.size || 1.8), w = safeW(), n = p.items.length;
    const head = p.title ? size * 1.9 : size * 0.5, row = size * 1.55, pad = size * 0.5;
    const ats = p.items.map((_, i) => (p.at ? p.at[i] : 0.3 + i * (p.every || 0.6)));
    const y = zoneY(p, head + n * row + pad);
    const grown = ats.reduce((a, at) => a + sp(t - at + 0.08, 'snappy'), 0);
    const h = head + Math.max(p.title ? 0 : 1, grown) * row + pad;
    const rtl = DIR === 'rtl', xs = rtl ? cx() + w / 2 - size : cx() - w / 2 + size;
    withEnv(e, () => {
      B.panel(G, cx() - w / 2, y, w, h, { variant: 'default' });
      let yy = y + size * 0.4;
      if (p.title) { yy += size * 1.15; fontFor(p.title, 700, size * 1.1); G.fillStyle = B.F.theme.primaryText; startText(p.title, xs, yy); yy += size * 0.2; }
      p.items.forEach((it, i) => {
        const at = ats[i], k = sp(t - at, 'snappy');
        yy += size * 1.55; if (t < at) return;
        G.save(); G.globalAlpha *= clamp((t - at) * 6); G.translate((rtl ? -1 : 1) * (1 - k) * rem(1), 0);
        G.fillStyle = B.C.primary; G.fillRect(rtl ? xs - size * 0.55 : xs, yy - size * 0.62, size * 0.55, size * 0.55);
        fontFor(it, 600, size); G.fillStyle = B.F.theme.text;
        startText(it, rtl ? xs - size * 1.0 : xs + size * 1.0, yy); G.restore();
      });
    });
    return p.items.map((_, i) => ({ t: p.at ? p.at[i] : 0.3 + i * (p.every || 0.6), type: 'click', gain: 0.45 }));
  };

  // Retype: a tag or word that backspaces into another (#الكورة → #التكنولوجيا). Strike on the old one first.
  C.retype = (t, p) => {
    const e = env(t, p.dur, 'heavy'), size = rem(p.size || 2.6), y = zoneY(p, size * 2) + size * 1.35;
    const hold = p.hold ?? 0.9, rt = retype(p.from, p.to, Math.max(0, t - hold), 16, 22);
    withEnv(e, () => {
      fontFor(p.from + p.to, 700, size); G.direction = isAr(p.from + p.to) ? 'rtl' : 'ltr'; G.textAlign = 'center';
      const bw = Math.max(G.measureText(p.from).width, G.measureText(p.to).width) + size * 1.4;
      B.rrect(G, cx() - bw / 2, y - size * 1.05, bw, size * 1.45, B.radius.md()); G.fillStyle = 'rgba(26,26,26,0.94)'; G.fill();
      G.lineWidth = Math.max(1, R / 16); G.strokeStyle = B.F.theme.border; G.stroke();
      G.fillStyle = t < hold ? B.F.theme.text : B.F.theme.primaryText; const txt = t < hold ? p.from : rt.text;
      const w = G.measureText(txt).width; G.fillText(txt, cx(), y);
      if (t < hold) { const s = tween(t, p.strikeAt ?? 0.25, 0.35); G.fillStyle = B.C.accent; const sw = w * s; G.fillRect(G.direction === 'rtl' ? cx() + w / 2 - sw : cx() - w / 2, y - size * 0.33, sw, size * 0.09); }
      if (caretOn(t, rt.typing)) { G.fillStyle = B.C.accent; const rtl = G.direction === 'rtl'; G.fillRect(rtl ? cx() - w / 2 - size * 0.16 : cx() + w / 2 + size * 0.08, y - size * 0.8, size * 0.08, size * 0.95); }
    });
    const del = [...p.from].length;
    return [{ t: p.strikeAt ?? 0.25, type: 'click', gain: 0.4 }, { t: hold, type: 'type', count: del, cps: 22, gain: 0.35 }, { t: hold + del / 22, type: 'type', text: p.to, cps: 16, gain: 0.45 }];
  };

  // ASCII emoji reaction (^_^ x_x o_o >‿<; avoid -_-, it reads as loose dashes): mono, accent, springs in without overshoot.
  C.emoji = (t, p) => {
    const e = env(t, p.dur, 'snappy'), size = rem(p.size || 3.4), y = zoneY({ zone: 'top', ...p }, size) + size;
    const x = p.x != null ? p.x * W : cx();
    withEnv(e, () => { G.font = `600 ${Math.round(size * (0.85 + 0.15 * e.k))}px ${B.FONTS.mono}`; G.fillStyle = p.color === 'green' ? B.F.theme.primaryText : B.C.accent; G.textAlign = 'center'; G.direction = 'ltr'; G.fillText(p.text || '^_^', x, y); });
    return [{ t: 0, type: 'pop', gain: 0.5 }];
  };

  // Nino reacting in a corner. corner: 'start' | 'end' (logical), expression per brand.md.
  C.nino = (t, p) => {
    const size = rem(p.size || 6), k = sp(t, 'playful'), o = tween(t, p.dur - 0.25, 0.25);
    const end = (p.corner || 'end') === 'end', rtl = DIR === 'rtl', right = end !== rtl;
    const x = right ? W * (PORTRAIT ? 0.78 : 0.86) - size : W * 0.08, y = zoneY({ zone: 'low', ...p }, size) + (1 - k) * rem(5) + o * rem(5);
    G.save(); G.globalAlpha *= 1 - o; B.nino(G, x, y, size, { expression: p.expression || 'happy', t, look: p.look || (right ? 'start' : 'end') }); G.restore();
    return [{ t: 0, type: 'pop', gain: 0.4 }];
  };

  // Image: b-roll still. fit 'card' (rounded, in a zone) or 'full' (covers the frame).
  C.image = (t, p) => {
    const img = IMAGES[p.src]; if (!img || !img.width) return [];
    const e = env(t, p.dur, p.fit === 'full' ? 'heavy' : 'default');
    if (p.fit === 'full') {
      const s = Math.max(W / img.width, H / img.height) * (1 + 0.04 * clamp(t / p.dur)), iw = img.width * s, ih = img.height * s;
      G.save(); G.globalAlpha *= e.a; G.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih); G.restore();
    } else {
      const w = safeW() * (p.scale || 1), ih = w * (img.height / img.width), h = Math.min(ih, H * 0.36), y = zoneY(p, h);
      withEnv(e, () => {
        G.save(); B.rrect(G, cx() - w / 2, y, w, h, B.radius.lg()); G.clip();
        const s = Math.max(w / img.width, h / img.height); G.drawImage(img, cx() - (img.width * s) / 2, y + h / 2 - (img.height * s) / 2, img.width * s, img.height * s); G.restore();
        B.rrect(G, cx() - w / 2, y, w, h, B.radius.lg()); G.lineWidth = Math.max(1, R / 16); G.strokeStyle = B.F.theme.border; G.stroke();
        if (p.caption) { fontFor(p.caption, 600, rem(1)); G.fillStyle = B.F.theme.text; G.textAlign = 'center'; G.direction = isAr(p.caption) ? 'rtl' : 'ltr'; G.fillText(p.caption, cx(), y + h + rem(1.6)); }
      });
    }
    return [{ t: 0, type: 'whoosh', gain: 0.35 }];
  };

  // Code: mono panel, typed line by line.
  C.code = (t, p) => {
    const e = env(t, p.dur), size = rem(p.size || 1.3), lines = p.code.split('\n'), w = safeW();
    const h = size * 2.6 + lines.length * size * 1.5, y = zoneY(p, h), xs = cx() - w / 2 + size * 1.2;
    withEnv(e, () => {
      B.panel(G, cx() - w / 2, y, w, h, { variant: 'default' });
      [B.C.accent, B.F.theme.border, B.F.theme.border].forEach((c, i) => { G.fillStyle = c; G.beginPath(); G.arc(xs + i * size * 0.9 + size * 0.3, y + size * 0.95, size * 0.28, 0, 7); G.fill(); });
      if (p.title) { G.font = `400 ${Math.round(size * 0.8)}px ${B.FONTS.mono}`; G.fillStyle = B.F.theme.muted; G.textAlign = 'right'; G.direction = 'ltr'; G.fillText(p.title, cx() + w / 2 - size, y + size * 1.2); }
      let tt = t - 0.2;
      lines.forEach((ln, i) => {
        G.font = `400 ${Math.round(size)}px ${B.FONTS.mono}`; G.fillStyle = B.F.theme.text; G.textAlign = 'left'; G.direction = 'ltr';
        const s = typed(ln, tt, p.cps || 30); G.fillText(s, xs, y + size * 2.6 + i * size * 1.5);
        if (s.length < ln.length && tt > 0) { G.fillStyle = B.C.accent; G.fillRect(xs + G.measureText(s).width + 2, y + size * 1.7 + i * size * 1.5, size * 0.1, size * 1.1); }
        tt -= ln.length / (p.cps || 30);
      });
    });
    return [{ t: 0.2, type: 'type', text: p.code.replace(/\s+/g, ''), cps: p.cps || 30, gain: 0.3 }];
  };

  // Quote: one big serif line on a dimmed frame.
  C.quote = (t, p) => {
    const e = env(t, p.dur, 'heavy'), size = rem(p.size || 2.6), lines = wrap(p.text, size, safeW(), 400, 'serif');
    const h = lines.length * size * 1.35, y = zoneY({ zone: 'center', ...p }, h);
    withEnv(e, () => { let tt = t; lines.forEach((ln, i) => { const d = [...ln].length / 22; typedLine(ln, tt, cx(), y + (i + 0.8) * size * 1.35, size, { weight: 400, family: 'serif', cps: 22, caret: tt < d || i === lines.length - 1 }); tt -= d; }); });
    return [{ t: 0, type: 'type', text: p.text, cps: 22, gain: 0.4 }];
  };

  // Band: the green band as a climax — full-bleed #166434 wipe, white text. Keep ≤ 1.2 s.
  C.band = (t, p) => {
    const wipe = sp(t, 'heavy'), out = tween(t, p.dur - 0.2, 0.2);
    const size = fit(p.text, 700, rem(p.size || 3.4), W * 0.86); // long lines shrink to fit
    const by = (p.y ?? (PORTRAIT ? 0.6 : 0.5)) * H, bh = Math.max(size * 2.2, H * (p.height ?? (PORTRAIT ? 0.15 : 0.24)));
    G.save(); G.fillStyle = B.C.primary; const hh = bh * wipe * (1 - out); G.fillRect(0, by - hh / 2, W, hh);
    G.globalAlpha *= clamp((t - 0.12) * 6) * (1 - out); fit(p.text, 700, size, W * 0.86); G.fillStyle = B.C.white; G.textAlign = 'center'; G.direction = isAr(p.text) ? 'rtl' : 'ltr';
    G.textBaseline = 'middle'; G.fillText(p.text, W / 2, by);
    if (p.underline && p.text.includes(p.underline)) { // orange underline drawn under one word (BlueVisa "lancé.")
      const tw = G.measureText(p.text).width, pre = G.measureText(p.text.slice(0, p.text.indexOf(p.underline))).width, ww = G.measureText(p.underline).width;
      const rtl = isAr(p.text), x0 = rtl ? W / 2 + tw / 2 - pre - ww : W / 2 - tw / 2 + pre, u = tween(t, p.underlineAt ?? 0.3, 0.3);
      G.fillStyle = B.C.accent; G.fillRect(rtl ? x0 + ww * (1 - u) : x0, by + size * 0.62, ww * u, size * 0.11);
    }
    G.restore();
    return [{ t: 0, type: 'thump', gain: 0.6 }];
  };

  // Lower third (landscape long-form): name, then title, then the org chip — each on its word (titleAt / orgAt).
  C.lowerThird = (t, p) => {
    const e = env(t, p.dur, 'snappy'), size = rem(p.size || 1.4), rtl = DIR === 'rtl', os = size * 0.62;
    fontFor(p.org || '', 600, os); const ow = p.org ? G.measureText(p.org).width + os * 1.4 : 0;
    fontFor(p.title || '', 400, size * 0.7); const tw = G.measureText(p.title || '').width;
    fontFor(p.name, 700, size); const w = Math.max(G.measureText(p.name).width, tw, ow) + size * 2;
    const kT = p.title ? sp(t - (p.titleAt ?? 0.35), 'snappy') : 0, kO = p.org ? sp(t - (p.orgAt ?? 0.8), 'snappy') : 0; // the box grows a line as each lands
    const h = size * 2.0 + size * 1.2 * kT + os * 2.6 * kO, x = rtl ? W * 0.94 - w : W * 0.06, y = H * (PORTRAIT ? 0.6 : 0.74) - (p.org ? os * 2.6 : 0);
    withEnv({ ...e, y: 0 }, () => {
      G.save(); B.rrect(G, rtl ? x + w * (1 - e.k) : x, y, w * e.k, h, B.radius.md()); G.fillStyle = 'rgba(26,26,26,0.94)'; G.fill(); G.restore();
      G.fillStyle = B.C.accent; G.fillRect(rtl ? x + w - size * 0.2 : x, y, size * 0.2, h);
      const xs = rtl ? x + w - size : x + size, a = G.globalAlpha;
      fontFor(p.name, 700, size); G.fillStyle = B.F.theme.text; G.textBaseline = 'alphabetic'; startText(p.name, xs, y + size * 1.35);
      if (p.title) { G.globalAlpha = a * clamp((t - (p.titleAt ?? 0.35)) * 5); fontFor(p.title, 400, size * 0.7); G.fillStyle = B.F.theme.muted; startText(p.title, xs, y + size * 2.5); }
      if (p.org) {
        const ot = t - (p.orgAt ?? 0.8), k = sp(ot, 'snappy'), oy = y + size * 3.0 + (1 - k) * rem(0.4), oh = os * 1.9;
        G.globalAlpha = a * clamp(ot * 6); B.rrect(G, rtl ? xs - ow : xs, oy, ow, oh, B.radius.sm()); G.fillStyle = B.C.primary; G.fill();
        fontFor(p.org, 600, os); G.fillStyle = B.C.white; G.textAlign = 'center'; G.direction = isAr(p.org) ? 'rtl' : 'ltr'; G.textBaseline = 'middle';
        G.fillText(p.org, (rtl ? xs - ow : xs) + ow / 2, oy + oh / 2 + os * 0.05);
      }
      G.globalAlpha = a;
    });
    return [{ t: 0, type: 'whoosh', gain: 0.3 }, ...(p.org ? [{ t: p.orgAt ?? 0.8, type: 'pop', gain: 0.4 }] : [])];
  };

  // Title: a full-frame title card. The footage drops almost to black, then kicker + big typed title + sub. Captions hide.
  C.title = (t, p) => {
    const a = Math.min(clamp(t * 5), 1 - tween(t, p.dur - 0.3, 0.3)), cps = p.cps || 26;
    const size = rem(p.size || (PORTRAIT ? 3.2 : 4.2)), lines = wrap(p.text, size, W * 0.8), ks = rem(0.8), ss = size * 0.4;
    const h = (p.kicker ? ks * 3.4 : 0) + lines.length * size * 1.2 + (p.sub ? ss * 2.2 : 0);
    let y = H / 2 - h / 2, tt = t - 0.25;
    G.save(); G.fillStyle = `rgba(15,15,15,${(p.shade ?? 0.9) * a})`; G.fillRect(0, 0, W, H); G.globalAlpha *= a;
    if (p.kicker) { tagC(p.kicker, W / 2, y, ks); y += ks * 3.4; }
    lines.forEach((ln, i) => { const d = [...ln].length / cps; typedLine(ln, tt, W / 2, y + (i + 0.82) * size * 1.2, size, { cps, caret: tt < d || i === lines.length - 1 }); tt -= d; });
    if (p.sub) { fontFor(p.sub, 400, ss); G.fillStyle = B.F.theme.muted; G.textAlign = 'center'; G.direction = isAr(p.sub) ? 'rtl' : 'ltr'; G.globalAlpha *= clamp((tt - 0.1) * 4); G.fillText(p.sub, W / 2, y + lines.length * size * 1.2 + ss * 1.7); }
    G.restore();
    return [{ t: 0, type: 'whoosh', gain: 0.4 }, { t: 0.25, type: 'type', text: p.text, cps, gain: 0.45 }];
  };

  // Panel: the split layout. An opaque full-height side column slides in while the footage slides the other way,
  // so his face re-centres in what is left. Numbered rows land on their words (at: [t…], relative); the newest is lit.
  // badge + badgeAt: a small accent tag that then lands on every row ("AI" at each stage) · note + noteAt: a closing line.
  C.panel = (t, p) => {
    const k = slide(t, p.dur), cw = (p.w || 0.3) * W, right = onRight(p), x0 = right ? W - cw * k : cw * k - cw;
    const size = rem(p.size || 1.6), pad = cw * 0.09, rtl = DIR === 'rtl', inner = cw - pad * 2, line = Math.max(1, R / 16);
    const n = p.items.length, row = size * 2.1, gap = size * 0.45, head = (p.kicker ? size * 1.6 : 0) + (p.title ? size * 2.7 : 0);
    const ats = p.items.map((_, i) => (p.at ? p.at[i] : 0.8 + i * (p.every || 0.6))), cur = ats.filter((a) => t >= a).length - 1;
    const tagged = p.badge && t >= (p.badgeAt ?? Infinity);
    G.save(); G.fillStyle = B.F.theme.bg; G.fillRect(x0, 0, cw, H);
    G.fillStyle = B.F.theme.border; G.fillRect(right ? x0 : x0 + cw - line, 0, line, H);
    G.beginPath(); G.rect(x0, 0, cw, H); G.clip();
    const xs = rtl ? x0 + cw - pad : x0 + pad;
    let y = Math.max(H * 0.08, H / 2 - (head + n * (row + gap) + (p.note ? size * 1.6 : 0)) / 2);
    if (p.kicker) { B.badge(G, p.kicker, xs, y, { variant: 'tag', size: size * 0.5 }); y += size * 1.6; }
    if (p.title) { fit(p.title, 700, size * 1.9, inner); G.fillStyle = B.F.theme.text; G.textBaseline = 'alphabetic'; G.globalAlpha = clamp((t - 0.3) * 5); startText(p.title, xs, y + size * 1.75); G.globalAlpha = 1; y += size * 2.7; }
    p.items.forEach((it, i) => {
      const lt = t - ats[i]; if (lt < 0) return;
      const yy = y + i * (row + gap), lit = i === cur && !tagged, nx = rtl ? xs - size * 0.6 : xs + size * 0.6;
      G.save(); G.globalAlpha = clamp(lt * 6); G.translate((right ? 1 : -1) * (1 - sp(lt, 'snappy')) * rem(1.2), 0);
      B.rrect(G, x0 + pad, yy, inner, row, B.radius.md()); G.fillStyle = lit ? B.C.primary : B.F.theme.surface; G.fill();
      G.lineWidth = line; G.strokeStyle = lit ? B.C.primary : B.F.theme.border; G.stroke();
      G.font = `400 ${Math.round(size * 0.55)}px ${B.FONTS.mono}`; G.fillStyle = lit ? 'rgba(255,255,255,0.75)' : B.F.theme.muted;
      G.direction = 'ltr'; G.textBaseline = 'middle'; G.textAlign = rtl ? 'right' : 'left'; G.fillText(String(i + 1).padStart(2, '0'), nx, yy + row / 2);
      fit(it, 600, size, inner - size * (p.badge ? 4.4 : 2.4)); G.fillStyle = lit ? B.C.white : B.F.theme.text; G.direction = isAr(it) ? 'rtl' : 'ltr';
      G.fillText(it, rtl ? nx - size * 1.4 : nx + size * 1.4, yy + row / 2 + size * 0.05);
      const bt = t - (p.badgeAt ?? Infinity) - i * 0.1;
      if (p.badge && bt > 0) {
        const bs = size * 0.6; G.font = `600 ${Math.round(bs)}px ${B.FONTS.mono}`; const bw = G.measureText(p.badge).width + bs * 1.2, bh = bs * 1.8;
        const bx = rtl ? x0 + pad + size * 0.5 : x0 + cw - pad - size * 0.5 - bw;
        G.globalAlpha = clamp(bt * 6) * (0.4 + 0.6 * sp(bt, 'snappy')); B.rrect(G, bx, yy + row / 2 - bh / 2, bw, bh, B.radius.sm()); G.fillStyle = B.C.accent; G.fill();
        G.fillStyle = B.C.onAccent; G.textAlign = 'center'; G.direction = 'ltr'; G.fillText(p.badge, bx + bw / 2, yy + row / 2 + bs * 0.05);
      }
      G.restore();
    });
    if (p.note) { G.globalAlpha = clamp((t - (p.noteAt ?? p.badgeAt ?? 1)) * 4); fit(p.note, 600, size * 0.85, inner); G.fillStyle = B.F.theme.muted; G.textBaseline = 'alphabetic'; startText(p.note, xs, y + n * (row + gap) + size * 1.1); }
    G.restore();
    return [{ t: 0, type: 'whoosh', gain: 0.45 }, ...ats.map((a) => ({ t: a, type: 'click', gain: 0.45 })), ...(p.badge && p.badgeAt != null ? [{ t: p.badgeAt, type: 'ding', gain: 0.35 }] : [])];
  };

  // End card: green band rises, Nino lands, handle typed, wordmark retypes to the bare 9k.
  C.endcard = (t, p) => {
    const wipe = sp(t, 'heavy'), size = rem(PORTRAIT ? 5.5 : 4.5);
    G.save(); G.fillStyle = B.C.primary; G.fillRect(0, H * (1 - wipe), W, H * wipe); G.restore();
    if (t < 0.3) return [{ t: 0, type: 'whoosh', gain: 0.5 }];
    B.frame(G, W, H, { theme: 'green', dir: DIR });
    B.nino(G, W / 2 - size / 2, H * 0.3 + (1 - sp(t - 0.3, 'playful')) * rem(5), size, { expression: t > 1.2 ? 'happy' : 'idle', t, colors: { body: B.C.white } });
    B.wordmark(G, t - 0.6, W / 2, H * 0.3 + size + rem(3.2), { size: rem(2.6), align: 'center', color: B.C.white, hold: 0.6 });
    if (p.cta) { G.globalAlpha = clamp((t - 1.6) * 4); fit(p.cta, 700, rem(2.2), W * 0.84); G.fillStyle = B.C.white; G.textAlign = 'center'; G.direction = isAr(p.cta) ? 'rtl' : 'ltr'; G.fillText(p.cta, W / 2, H * 0.3 + size + rem(6.5)); }
    if (p.handle) { G.globalAlpha = 1; typedLine(p.handle, t - 2, W / 2, H * 0.3 + size + rem(9), rem(1.3), { family: 'mono', weight: 400, color: 'rgba(255,255,255,0.8)', caret: false }); }
    B.frame(G, W, H, { theme: 'dark', dir: DIR });
    return [{ t: 0, type: 'whoosh', gain: 0.5 }, { t: 0.3, type: 'thump', gain: 0.5 }, { t: 0.6, type: 'type', text: 'Ismail9k', cps: 14, gain: 0.45 }, { t: 1.6, type: 'ding', gain: 0.3 }];
  };

  // Mask: an opaque rounded rect, e.g. to hide burned-in text (rect: [x, y, w, h] as fractions of W/H).
  C.mask = (t, p) => {
    const [x, y, w, h] = p.rect; G.save(); G.fillStyle = p.color || B.F.theme.bg;
    B.rrect(G, x * W, y * H, w * W, h * H, B.radius.md()); G.fill(); G.restore(); return [];
  };

  // ---- kinetic components: stamp hook, tracker, stack, cta (BlueVisa / Dubz Up moves in 9k tokens) ----------
  const deg = (d) => (d * Math.PI) / 180;
  // A soft dark band behind floating type, so it reads over footage without a box. y0/y1 in px.
  function scrim(y0, y1, a) {
    const g = G.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(10,10,10,0)'); g.addColorStop(0.25, `rgba(10,10,10,${0.62 * a})`);
    g.addColorStop(0.75, `rgba(10,10,10,${0.62 * a})`); g.addColorStop(1, 'rgba(10,10,10,0)');
    G.save(); G.fillStyle = g; G.fillRect(0, y0, W, y1 - y0); G.restore();
  }
  // Check circle: ring when off, accent fill + black tick when on (k 0→1)
  function check(x, y, r, k) {
    G.save(); G.lineWidth = Math.max(2, r * 0.14);
    G.beginPath(); G.arc(x, y, r, 0, 7); G.strokeStyle = k > 0 ? B.C.accent : B.F.theme.border; G.stroke();
    if (k > 0) {
      G.beginPath(); G.arc(x, y, r * Math.min(1, k * 1.2), 0, 7); G.fillStyle = B.C.accent; G.fill();
      const u = clamp((k - 0.3) / 0.7); G.strokeStyle = B.C.onAccent; G.lineWidth = r * 0.26; G.lineCap = 'round'; G.lineJoin = 'round';
      G.beginPath(); G.moveTo(x - r * 0.45, y + r * 0.02);
      const p1 = [x - r * 0.12, y + r * 0.34], p2 = [x + r * 0.48, y - r * 0.32];
      if (u < 0.45) { const v = u / 0.45; G.lineTo(lerp(x - r * 0.45, p1[0], v), lerp(y + r * 0.02, p1[1], v)); }
      else { const v = (u - 0.45) / 0.55; G.lineTo(...p1); G.lineTo(lerp(p1[0], p2[0], v), lerp(p1[1], p2[1], v)); }
      G.stroke();
    }
    G.restore();
  }

  // Stamp hook: kicker typed, a giant line that lands on its word (last part in accent), and a small bill card
  // that gets a rubber stamp. p: { kicker, line, accent, lineAt, bill: [[label, value]…], billTitle, billUnit, total, stamp, stampAt, y }
  C.stamp = (t, p) => {
    const out = tween(t, p.dur - 0.3, 0.3), a = (1 - out);
    const ks = rem(2.0), big = rem(p.size || 6), yK = H * (p.y ?? 0.415), yL = yK + big * 1.12;
    scrim(H * ((p.y ?? 0.415) - 0.055), H * ((p.y ?? 0.415) + 0.325), clamp(t * 5) * a);
    G.save(); G.globalAlpha *= a;
    typedLine(p.kicker, t, cx(), yK, ks, { cps: 16, color: 'rgba(245,245,245,0.86)', caret: t < (p.lineAt ?? 1.5) });
    // the big line: heavy spring, drops from 1.18× with zero overshoot
    const lt = t - (p.lineAt ?? 1.5);
    if (lt > 0) {
      const k = sp(lt, 'heavy'), s = 1.18 - 0.18 * k;
      G.save(); G.globalAlpha *= clamp(lt * 8); G.translate(cx(), yL - big * 0.32); G.scale(s, s);
      G.font = `700 ${Math.round(big)}px ${B.FONTS.sans}`; G.direction = 'ltr'; G.textBaseline = 'alphabetic';
      const head = p.line.slice(0, p.line.length - (p.accent || '').length), wh = G.measureText(head).width, wa = G.measureText(p.accent || '').width;
      G.textAlign = 'left'; G.fillStyle = B.F.theme.text; G.fillText(head, -(wh + wa) / 2, big * 0.32);
      G.fillStyle = B.C.accent; G.fillText(p.accent || '', -(wh + wa) / 2 + wh, big * 0.32);
      G.restore();
    }
    // bill card under the line, tilted, enters with the line
    const bt = lt - 0.12;
    if (bt > 0 && p.bill) {
      const k = sp(bt, 'default'), bw = rem(17), rs = rem(0.95), rh = rs * 1.75, bh = rs * 2.6 + p.bill.length * rh + rs * 2.4;
      const bx = cx() - bw / 2, by = yL + big * 0.28 + (1 - k) * rem(2);
      G.save(); G.globalAlpha *= clamp(bt * 6); G.translate(bx + bw / 2, by + bh / 2); G.rotate(deg(-3.5)); G.translate(-bw / 2, -bh / 2);
      B.panel(G, 0, 0, bw, bh, { variant: 'default' });
      G.font = `600 ${Math.round(rs * 0.8)}px ${B.FONTS.mono}`; G.fillStyle = B.F.theme.muted; G.textBaseline = 'alphabetic'; G.direction = 'ltr';
      G.textAlign = 'left'; G.fillText(p.billTitle ?? 'INVOICE', rs * 1.1, rs * 1.7); G.textAlign = 'right'; G.fillText(p.billUnit ?? '/ month', bw - rs * 1.1, rs * 1.7);
      p.bill.forEach(([l, v], i) => {
        const y = rs * 2.6 + (i + 0.75) * rh; G.font = `400 ${Math.round(rs)}px ${B.FONTS.mono}`; G.fillStyle = B.F.theme.text;
        G.textAlign = 'left'; G.fillText(l, rs * 1.1, y); G.textAlign = 'right'; G.fillText(v, bw - rs * 1.1, y);
      });
      const ty = rs * 2.6 + p.bill.length * rh + rs * 0.5; G.fillStyle = B.F.theme.border; G.fillRect(rs * 1.1, ty, bw - rs * 2.2, Math.max(1, R / 16));
      G.font = `700 ${Math.round(rs * 1.15)}px ${B.FONTS.mono}`; G.fillStyle = B.F.theme.text; G.textAlign = 'left'; G.fillText('TOTAL', rs * 1.1, ty + rs * 1.55);
      G.textAlign = 'right'; G.fillText(p.total || '$0.00', bw - rs * 1.1, ty + rs * 1.55);
      // the stamp: slams from 1.7× (heavy spring, no overshoot), 1 px jolt on the card
      const st = t - (p.stampAt ?? 2);
      if (st > 0 && p.stamp) {
        const sk = sp(st, 'heavy'), ss = 1.7 - 0.7 * Math.min(1, sk * 1.15), sz = rem(2.6);
        G.save(); G.translate(bw * 0.66, bh * 0.52); G.rotate(deg(-14)); G.scale(ss, ss); G.globalAlpha *= clamp(st * 10) * 0.95;
        fontFor(p.stamp, 800, sz); G.textAlign = 'center'; G.textBaseline = 'middle'; G.direction = 'rtl';
        const sw = G.measureText(p.stamp).width + sz * 1.0, sh = sz * 1.55;
        G.lineWidth = sz * 0.1; G.strokeStyle = B.C.accent; B.rrect(G, -sw / 2, -sh / 2, sw, sh, B.radius.sm()); G.stroke();
        G.lineWidth = sz * 0.04; B.rrect(G, -sw / 2 + sz * 0.16, -sh / 2 + sz * 0.16, sw - sz * 0.32, sh - sz * 0.32, B.radius.sm()); G.stroke();
        G.fillStyle = B.C.accent; G.fillText(p.stamp, 0, sz * 0.06);
        G.restore();
      }
      G.restore();
    }
    G.restore();
    return [{ t: 0, type: 'type', text: p.kicker, cps: 16, gain: 0.4 }, { t: p.lineAt ?? 1.5, type: 'whoosh', gain: 0.45 }, ...(p.stamp ? [{ t: (p.stampAt ?? 2) + 0.12, type: 'thump', gain: 0.7 }] : [])];
  };

  // Tracker: chips scattered in the mid band with small tilts (Dubz Up checklist), each landing at at[i];
  // checkAt[i] ticks it (accent check). items: [{ label, icon }]
  const SCATTER = [[0.27, 0, -4], [-0.22, 0.12, 3], [0.2, 1.05, 2.5], [-0.27, 1.0, -3], [0.24, 2.05, -2], [-0.2, 2.1, 3.5]];
  C.tracker = (t, p) => {
    const size = rem(p.size || 1.45), ch = size * 2.2, row = ch * 1.32, n = p.items.length, rows = Math.ceil(n / 2);
    const y0 = zoneY(p, (rows - 1) * row + ch + row * 0.2), out = tween(t, p.dur - 0.25, 0.25), rtl = DIR === 'rtl';
    p.items.forEach((it, i) => {
      const at = p.at?.[i] ?? i * 0.15, lt = t - at; if (lt < 0) return;
      const [dx, dy, tilt] = SCATTER[i % SCATTER.length], k = sp(lt, 'snappy');
      fontFor(it.label, 700, size); const lw = G.measureText(it.label).width;
      const hasIcon = it.icon && ICONS[it.icon], w = lw + size * (hasIcon ? 4.6 : 3.2);
      const xC = cx() + (rtl ? 1 : -1) * dx * safeW(), yC = y0 + dy * row + ch / 2 - (1 - k) * rem(1.6);
      const ck = p.checkAt ? clamp((t - p.checkAt[i]) / 0.3) : 0;
      G.save(); G.globalAlpha *= clamp(lt * 7) * (1 - out); G.translate(xC, yC); G.rotate(deg(tilt));
      G.scale(0.9 + 0.1 * k + 0.06 * Math.sin(Math.PI * ck), 0.9 + 0.1 * k + 0.06 * Math.sin(Math.PI * ck));
      B.rrect(G, -w / 2, -ch / 2, w, ch, B.radius.md()); G.fillStyle = 'rgba(26,26,26,0.95)'; G.fill();
      G.lineWidth = Math.max(1, R / 16); G.strokeStyle = ck > 0 ? B.C.accent : B.F.theme.border; G.stroke();
      // LTR inside the chip: check · icon · label (Latin names)
      let x = -w / 2 + size * 1.05; check(x, 0, size * 0.48, ck); x += size * 0.95;
      if (hasIcon) { icon(it.icon, x, -size * 0.6, size * 1.2); x += size * 1.6; }
      G.fillStyle = B.F.theme.text; G.textAlign = 'left'; G.direction = 'ltr'; G.textBaseline = 'middle'; G.fillText(it.label, x, size * 0.05);
      G.restore();
    });
    return [...p.items.map((_, i) => ({ t: p.at?.[i] ?? i * 0.15, type: 'pop', gain: 0.35 })), ...(p.checkAt || []).map((c) => ({ t: c, type: 'click', gain: 0.45 }))];
  };

  // Stack: a status card that lands on a stack of the previous ones (BlueVisa "Société ✓").
  // { n, total, icon, pre, title, titleAt, free, freeAt, rows: [{ text, at, strikeAt?, count? }], meter: { value, unit, at, label } }
  // pre is typed first (his question), then retyped to the title on its word. side: 'start' | 'end' nudges it.
  C.stack = (t, p) => {
    const e = env(t, p.dur), size = rem(p.size || 1.4), w = W * 0.76, rtl = DIR === 'rtl';
    const side = p.side ? (onRight(p) ? 1 : -1) : 0, xC = cx() + side * W * 0.035, x = xC - w / 2;
    const head = size * 3.1, rowH = size * 1.5, nr = (p.rows || []).length, meterH = p.meter ? size * 4.0 : 0, pad = size * 0.7;
    const yTop = zoneY(p, head + nr * rowH + meterH + pad);
    const grown = (p.rows || []).reduce((a, r) => a + sp(t - r.at + 0.08, 'snappy'), 0) + (p.meter ? sp(t - p.meter.at + 0.08, 'snappy') * meterH / rowH : 0);
    const h = head + grown * rowH + pad, depth = Math.min(3, (p.n || 1) - 1), y = yTop + depth * size * 0.1;
    withEnv({ ...e, y: 0 }, () => {
      // the stack behind: earlier cards as slivers
      for (let d = depth; d >= 1; d--) {
        const s = 1 - d * 0.05, ww = w * s; B.rrect(G, xC - ww / 2, y - d * size * 0.38, ww, h, B.radius.lg());
        G.fillStyle = d === 1 ? '#1E1E1E' : '#191919'; G.fill(); G.lineWidth = Math.max(1, R / 16); G.strokeStyle = B.F.theme.border; G.stroke();
      }
      const k = sp(t, 'default'); G.save(); G.translate(side * (1 - k) * rem(4), (1 - k) * rem(1.2));
      B.panel(G, x, y, w, h, { variant: 'feature' });
      const xs = rtl ? x + w - size * 1.1 : x + size * 1.1, xe = rtl ? x + size * 1.1 : x + w - size * 1.1;
      // header: n/total + dots at the end side
      G.font = `600 ${Math.round(size * 0.62)}px ${B.FONTS.mono}`; G.fillStyle = B.F.theme.muted; G.direction = 'ltr'; G.textBaseline = 'alphabetic';
      G.textAlign = rtl ? 'left' : 'right'; G.fillText(`${p.n}/${p.total || 6}`, xe, y + size * 1.25);
      for (let i = 0; i < (p.total || 6); i++) {
        const dx0 = xe + (rtl ? 1 : -1) * (size * 0.2 + i * size * 0.5);
        G.beginPath(); G.arc(dx0, y + size * 1.85, size * 0.13, 0, 7);
        G.fillStyle = i < p.n ? (i === p.n - 1 ? B.C.accent : B.F.theme.primaryText) : B.F.theme.border; G.fill();
      }
      // title: pre typed, retyped to the title on its word, icon pops in with it
      const tt = t - (p.titleAt ?? 0.4), ts = size * 1.35, ty = y + size * 2.45;
      const hasIcon = p.icon && ICONS[p.icon] && tt > 0;
      let txt, typing;
      if (p.pre) { if (tt < 0) { txt = typed(p.pre, t - 0.15, 20); typing = txt.length < [...p.pre].length; } else { const r = retype(p.pre, p.title, tt, 16, 40); txt = r.text; typing = r.typing; } }
      else { txt = typed(p.title, tt, 18); typing = txt.length < [...p.title].length; }
      const isT = !p.pre || tt > 0, ar = isAr(txt);
      if (hasIcon) { const ik = sp(tt, 'snappy'), is = ts * 1.05 * ik; icon(p.icon, rtl ? xs - is : xs, ty - ts * 0.82 + (ts * 1.05 - is) / 2, is); }
      const tx = hasIcon ? (rtl ? xs - ts * 1.5 : xs + ts * 1.5) : xs;
      fontFor(txt || 'a', 700, isT && !ar ? ts : ts * 0.82); G.fillStyle = isT && !ar ? B.F.theme.text : B.F.theme.muted;
      G.direction = ar ? 'rtl' : 'ltr'; G.textAlign = rtl ? 'right' : 'left'; G.fillText(txt, tx, ty);
      if (caretOn(t, typing) && (typing || tt < 1.2)) { const tw = G.measureText(txt).width; G.fillStyle = B.C.accent; G.fillRect(rtl ? tx - tw - ts * 0.16 : tx + tw + ts * 0.08, ty - ts * 0.78, ts * 0.07, ts * 0.92); }
      // free pill at the end of the title row
      if (p.free && t > (p.freeAt ?? 1)) {
        const fk = sp(t - p.freeAt, 'snappy'); G.save(); G.globalAlpha *= clamp((t - p.freeAt) * 6);
        const bs = size * 0.7; G.font = `700 ${Math.round(bs)}px ${B.FONTS.sans}`; const bw = G.measureText(p.free).width + bs * 1.6, bh = bs * 2;
        const bx = rtl ? xe : xe - bw; G.translate(0, (1 - fk) * rem(0.4));
        B.rrect(G, bx, ty - ts * 0.62 - bh / 2 + bs * 0.2, bw, bh, B.radius.pill()); G.fillStyle = B.C.primary; G.fill();
        G.fillStyle = B.C.white; G.textAlign = 'center'; G.direction = 'ltr'; G.textBaseline = 'middle'; G.fillText(p.free, bx + bw / 2, ty - ts * 0.62 + bs * 0.25); G.restore();
      }
      // divider
      G.fillStyle = B.F.theme.border; G.globalAlpha *= clamp((t - (p.rows?.[0]?.at ?? p.meter?.at ?? 99)) * 5); G.fillRect(x + size * 1.1, y + head - size * 0.35, w - size * 2.2, Math.max(1, R / 16)); G.globalAlpha = e.a;
      let yy = y + head;
      (p.rows || []).forEach((r) => {
        const lt = t - r.at; yy += rowH; if (lt < 0) return;
        const rk = sp(lt, 'snappy'); G.save(); G.globalAlpha *= clamp(lt * 6); G.translate((rtl ? -1 : 1) * (1 - rk) * rem(1), 0);
        let s = r.text; if (r.count != null) { const v = Math.round(r.count * tween(lt, 0, 0.9)); s = s.replace('{n}', v.toLocaleString('en-US')); }
        const struck = r.strikeAt != null && t > r.strikeAt;
        check(rtl ? xs - size * 0.45 : xs + size * 0.45, yy - size * 0.34, size * 0.42, struck ? 0 : clamp((lt - 0.15) / 0.3));
        fontFor(s, 600, size); G.fillStyle = struck ? B.F.theme.muted : B.F.theme.text; G.direction = isAr(s) ? 'rtl' : 'ltr'; G.textAlign = rtl ? 'right' : 'left';
        const sx0 = rtl ? xs - size * 1.25 : xs + size * 1.25; G.fillText(s, sx0, yy);
        if (struck) { const sw = G.measureText(s).width * tween(t, r.strikeAt, 0.3); G.fillStyle = B.C.accent; G.fillRect(rtl ? sx0 - sw : sx0, yy - size * 0.36, sw, size * 0.09); }
        G.restore();
      });
      if (p.meter) {
        const m = p.meter, lt = t - m.at;
        if (lt > 0) {
          G.save(); G.globalAlpha *= clamp(lt * 6); const u = tween(lt, 0.05, 1.0), big = size * 2.3;
          const v = (m.value * u).toFixed(m.value % 1 ? 1 : 0);
          G.font = `700 ${Math.round(big)}px ${B.FONTS.sans}`; G.direction = 'ltr'; G.textAlign = rtl ? 'right' : 'left'; G.fillStyle = B.F.theme.text; G.textBaseline = 'alphabetic';
          const label = `${v} ${m.unit}`; G.fillText(label, xs, yy + big * 1.05);
          if (m.label) { fontFor(m.label, 700, size * 1.0); G.fillStyle = B.F.theme.text; G.direction = isAr(m.label) ? 'rtl' : 'ltr'; G.textAlign = rtl ? 'left' : 'right'; G.fillText(m.label, xe, yy + big * 1.0); }
          const by = yy + big * 1.4, bw = w - size * 2.2, bh = size * 0.7, bx = x + size * 1.1;
          B.rrect(G, bx, by, bw, bh, B.radius.pill()); G.fillStyle = B.F.theme.sunken; G.fill(); G.lineWidth = Math.max(1, R / 16); G.strokeStyle = B.F.theme.border; G.stroke();
          const fw = Math.max(bh, bw * u); B.rrect(G, rtl ? bx + bw - fw : bx, by, fw, bh, B.radius.pill()); G.fillStyle = B.C.accent; G.fill();
          G.restore();
        }
      }
      G.restore();
    });
    return [{ t: 0, type: 'whoosh', gain: 0.35 }, ...(p.pre ? [{ t: 0.15, type: 'type', text: p.pre, cps: 20, gain: 0.3 }] : []), { t: p.titleAt ?? 0.4, type: 'type', text: p.title, cps: 16, gain: 0.4 },
      ...(p.rows || []).map((r) => ({ t: r.at, type: 'click', gain: 0.4 })), ...(p.free ? [{ t: p.freeAt, type: 'pop', gain: 0.4 }] : []),
      ...(p.meter ? [{ t: p.meter.at, type: 'ding', gain: 0.35 }] : [])];
  };

  // CTA: a muted typed line, then a green button whose keyword lands in an accent pill on its word; Nino beside it.
  C.cta = (t, p) => {
    const e = env(t, p.dur), size = rem(p.size || 1.9), rtl = DIR === 'rtl';
    const y = zoneY(p, size * 6.2);
    withEnv(e, () => {
      if (p.line) typedLine(p.line, t - 0.1, cx(), y + size * 0.9, size * 0.8, { cps: 20, color: B.F.theme.muted, caret: false });
      const parts = p.text.split(p.pill), bt = t - (p.buttonAt ?? 0.6); if (bt < 0) return;
      const k = sp(bt, 'snappy'); fontFor(p.text, 700, size);
      const wA = G.measureText(parts[0]).width, wB = G.measureText(parts[1] || '').width;
      G.font = `700 ${Math.round(size)}px ${B.FONTS.sans}`; const wP = G.measureText(p.pill).width + size * 0.6;
      const bw = wA + wB + wP + size * 2.4, bh = size * 2.6, bx = cx() - bw / 2, by = y + size * 2.0 + (1 - k) * rem(1);
      G.save(); G.globalAlpha *= clamp(bt * 6); B.rrect(G, bx, by, bw, bh, B.radius.md()); G.fillStyle = B.C.primary; G.fill();
      G.textBaseline = 'middle'; const yM = by + bh / 2 + size * 0.05;
      // RTL: parts[0] at the right, pill in the middle, parts[1] at the left
      let xr = rtl ? bx + bw - size * 1.2 : bx + size * 1.2;
      fontFor(p.text, 700, size); G.fillStyle = B.C.white; G.direction = rtl ? 'rtl' : 'ltr'; G.textAlign = rtl ? 'right' : 'left'; G.fillText(parts[0].trim(), xr, yM);
      xr += (rtl ? -1 : 1) * (wA + size * 0.0);
      const pk = sp(t - (p.pillAt ?? 1.2), 'snappy'), px = rtl ? xr - wP : xr;
      if (t > (p.pillAt ?? 1.2)) { B.rrect(G, px, yM - size * 0.72, wP, size * 1.44, B.radius.sm()); G.fillStyle = B.C.accent; G.globalAlpha *= 0.4 + 0.6 * pk; G.fill(); G.globalAlpha = clamp(bt * 6) * e.a; }
      G.font = `700 ${Math.round(size)}px ${B.FONTS.sans}`; G.fillStyle = t > (p.pillAt ?? 1.2) ? B.C.onAccent : B.C.white; G.direction = 'ltr'; G.textAlign = 'center'; G.fillText(p.pill, px + wP / 2, yM);
      xr += (rtl ? -1 : 1) * wP; fontFor(p.text, 700, size); G.fillStyle = B.C.white; G.direction = rtl ? 'rtl' : 'ltr'; G.textAlign = rtl ? 'right' : 'left'; G.fillText((parts[1] || '').trim(), xr - (rtl ? size * 0.25 : -size * 0.25), yM);
      G.restore();
      if (p.nino) { const ns = rem(4.2); B.nino(G, rtl ? bx + ns * 0.2 : bx + bw - ns * 1.2, by - ns * 1.02, ns, { expression: t > (p.pillAt ?? 1.2) ? 'happy' : 'idle', t }); }
    });
    return [{ t: 0.1, type: 'type', text: p.line || '', cps: 20, gain: 0.3 }, { t: p.buttonAt ?? 0.6, type: 'pop', gain: 0.45 }, { t: p.pillAt ?? 1.2, type: 'ding', gain: 0.4 }];
  };

  // ---- entry points -----------------------------------------------------------------
  function init(ctx, data) {
    G = ctx; W = data.format.w; H = data.format.h; DIR = data.dir || 'ltr'; PORTRAIT = H > W;
    CAP_TOP = (data.captionStyle?.y ?? (PORTRAIT ? 0.72 : 0.84)) - (PORTRAIT ? 0.065 : 0.07); FACE = data.faceBottom ?? null;
    R = Math.min(W, H) / 1080 * 32; ICONS = data.icons || {};
    const imgs = [...new Set((data.graphics || []).filter((x) => x.src).map((x) => x.src))];
    return Promise.all(imgs.map((src) => new Promise((ok) => { const im = new Image(); im.onload = im.onerror = () => ok(); im.src = (data.images || {})[src] || src; IMAGES[src] = im; })));
  }
  // Draw everything active at t. Returns the number of things drawn (0 → transparent frame).
  function draw(t, data) {
    B.frame(G, W, H, { theme: data.theme || 'dark', dir: DIR });
    G.clearRect(0, 0, W, H);
    let n = 0;
    const active = (data.graphics || []).filter((x) => t >= x.t && t < x.t + x.dur && C[x.type]);
    const d = Math.max(0, ...active.map((x) => (x.dim || 0) * Math.min(clamp((t - x.t) * 5), clamp((x.t + x.dur - t) * 5))));
    if (d) { dim(d); n++; }
    const under = active.filter((x) => x.type === 'mask' || (x.type === 'image' && x.fit === 'full'));
    for (const x of under) { G.save(); offset(x); C[x.type](t - x.t, x); G.restore(); n++; }
    const capOff = active.some((x) => x.captions === false || ['band', 'endcard', 'quote', 'title'].includes(x.type) || (x.type === 'image' && x.fit === 'full'));
    const pn = active.find((x) => x.type === 'panel'); // captions follow the footage as it slides away from the column
    CAPDX = pn ? (onRight(pn) ? -1 : 1) * ((pn.w || 0.3) * W / 2) * slide(t - pn.t, pn.dur) : 0;
    if (!capOff && data.captions) n += captions(t, data.captions, data.captionStyle || {});
    for (const x of active) if (!under.includes(x)) { drawOne(t, x); n++; }
    return n;
  }
  // dx / dy (fractions of W / H) on any graphic: moves it as a whole, after its own layout (set by dragging in the editor)
  function offset(x) { if (x.dx || x.dy) G.translate((x.dx || 0) * W, (x.dy || 0) * H); }
  function drawOne(t, x) {
    const col = !PORTRAIT && x.side && x.type !== 'panel' ? (onRight(x) ? 0.79 : 0.21) : null;
    CX = x.type === 'emoji' ? null : x.x ?? col; SW = x.w ?? (col ? 0.34 : null);
    KICK = x.kicker && x.type !== 'panel' && x.type !== 'title' ? KSIZE() * 2 + rem(0.5) : 0; TOPY = null;
    G.save(); offset(x);
    C[x.type](t - x.t, x);
    if (KICK && TOPY != null) kicker(t - x.t, x, TOPY);
    G.restore(); CX = SW = null; KICK = 0;
  }
  // Editor: which graphic is drawn at pixel (px, py) at time t? Index into data.graphics, topmost first, or -1.
  // Each active graphic is drawn alone on a scratch canvas and the pixels around the pointer are checked for ink.
  let HIT = null;
  function hit(t, data, px, py, r = 8) {
    const list = (data.graphics || []).map((x, i) => [x, i]).filter(([x]) => t >= x.t && t < x.t + x.dur && C[x.type]);
    if (!list.length) return -1;
    HIT = HIT || document.createElement('canvas'); HIT.width = W; HIT.height = H;
    const g0 = G; G = HIT.getContext('2d', { willReadFrequently: true }); B.frame(G, W, H, { theme: data.theme || 'dark', dir: DIR });
    let found = -1;
    const x0 = Math.max(0, Math.round(px - r)), y0 = Math.max(0, Math.round(py - r)), w = Math.min(W - x0, r * 2 + 1), h = Math.min(H - y0, r * 2 + 1);
    for (let k = list.length - 1; k >= 0 && found < 0; k--) {
      const [x, i] = list[k]; G.clearRect(0, 0, W, H);
      if (x.type === 'mask' || (x.type === 'image' && x.fit === 'full')) { G.save(); offset(x); C[x.type](t - x.t, x); G.restore(); } else drawOne(t, x);
      if (w > 0 && h > 0) { const a = G.getImageData(x0, y0, w, h).data; for (let j = 3; j < a.length; j += 4) if (a[j] > 40) { found = i; break; } }
    }
    G = g0; B.frame(G, W, H, { theme: data.theme || 'dark', dir: DIR });
    return found;
  }
  // SFX cues every component asks for, in output time (render-overlay.mjs writes them to work/cues.auto.json)
  function cues(data) {
    const out = [];
    for (const x of data.graphics || []) {
      if (!C[x.type] || x.sfx === false) continue;
      const res = (G.save(), C[x.type](0.001, { ...x }));
      G.restore(); G.clearRect(0, 0, W, H);
      for (const c of res || []) out.push({ ...c, t: +(x.t + c.t).toFixed(3) });
    }
    return out;
  }
  g.O = { init, draw, cues, captions, hit, C };
})(window);
