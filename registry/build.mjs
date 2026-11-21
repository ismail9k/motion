#!/usr/bin/env node
// Generates the 9k HyperFrames registry from src/: registry.json, blocks/<name>/, components/<name>/.
//   node registry/build.mjs [--fonts <dir with @fontsource packages>]
// Fonts (IBM Plex, SIL OFL 1.1) are copied once into components/9k-tokens/fonts/; later runs keep them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T, fontList, fontFaces, BASE_CSS, blockHtml } from './src/shared.mjs';
import { BLOCKS, COMPONENTS } from './src/items.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTHOR = 'ismail9k';
const AUTHOR_URL = 'https://ismail9k.com';
const MIN_CLI = '0.9.77';
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const json = (o) => JSON.stringify(o, null, 2) + '\n';

// ---------- fonts ----------
const FONT_DIR = path.join(HERE, 'components/9k-tokens/fonts');
const PKG = { 'ibm-plex-sans-arabic': 'ibm-plex-sans-arabic', 'ibm-plex-sans-latin': 'ibm-plex-sans', 'ibm-plex-mono-latin': 'ibm-plex-mono' };
function ensureFonts() {
  const need = fontList().filter((f) => !fs.existsSync(path.join(FONT_DIR, f)));
  if (!need.length) return;
  const src = arg('--fonts');
  if (!src) throw new Error(`missing fonts (${need.length}); pass --fonts <node_modules/@fontsource>`);
  fs.mkdirSync(FONT_DIR, { recursive: true });
  for (const f of need) {
    const pkg = Object.entries(PKG).find(([k]) => f.startsWith(k))[1];
    fs.copyFileSync(path.join(src, pkg, 'files', f), path.join(FONT_DIR, f));
  }
  fs.copyFileSync(path.join(src, 'ibm-plex-sans', 'LICENSE'), path.join(FONT_DIR, 'OFL.txt'));
}

// ---------- components ----------
const ROOT_VARS = `:root{${Object.entries(T).map(([k, v]) => `--k9-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}:${v}`).join(';')}}`;

const SNIPPETS = {
  '9k-tokens': () => `<!--
  9k tokens and fonts. Paste the style block below into your host composition's styles.
  It gives you:
    - the 9k colours as CSS variables (--k9-bg, --k9-green, --k9-orange, --k9-text, --k9-muted …)
    - IBM Plex Sans Arabic / Sans / Mono, from assets/fonts/ (installed with this component, SIL OFL 1.1)
    - .k9 base classes: wrap 9k content in a div with class k9; inside it .lat / .mono isolate Latin runs,
      .center is a full-width flex row, .caret is the orange typing caret, .panelbg the dark scene panel.
  Every 9k block already carries these; you need this snippet only for your own host markup.
-->
<style>
${ROOT_VARS}
${fontFaces()}
${BASE_CSS.trim()}
</style>
`,
  '9k-split-layout': () => `<!--
  9k split layout for 1080x1920 reaction shorts. Paste the style block into the host styles and the markup into the
  host root (data-width="1080" data-height="1920"). Keep the order: later siblings paint on top.

    #k9-top     1080x608 panel at the top: the reference clip (a video clip), or a 9k block host
                (data-width="1080" data-height="608") for a picture scene.
    #k9-bot     the talking head. His 1080x1920 frame sits at top:-204px inside the panel, so the face lands
                at y≈1040-1430 of the film. Tune --k9-face-y per take.
    #k9-seam    a 4px dark line where the panels meet.
    #k9-shade   darkens the top of his panel so captions above his head stay readable.
    Full-frame blocks (9k-hook-stamp, 9k-captions) go after these, as direct children of the host root.

  Jump-cut punch-ins: split his video at every jump cut into one video clip per piece (same src,
  data-media-start = source time), and give alternate pieces class k9-punch, so no two neighbouring framings
  match. --k9-punch is 1.06 for a calm edit, 1.10 for a fast one. Add k9-mirror to mirror him (never a clip
  with burned-in text).
-->
<style>
:root{--k9-face-y:-204px;--k9-punch:1.06}
#k9-top{position:absolute;left:0;top:0;width:1080px;height:608px;overflow:hidden;background:${T.bg}}
#k9-top video{position:absolute;left:0;top:0;width:1080px;height:608px;object-fit:cover}
#k9-bot{position:absolute;left:0;top:608px;width:1080px;height:1312px;overflow:hidden;background:#000}
#k9-bot video{position:absolute;left:0;top:var(--k9-face-y);width:1080px;height:1920px;transform-origin:540px 660px}
#k9-bot video.k9-punch{transform:scale(var(--k9-punch))}
#k9-bot video.k9-mirror{transform:scaleX(-1)}
#k9-bot video.k9-mirror.k9-punch{transform:scaleX(-1) scale(var(--k9-punch))}
#k9-seam{position:absolute;left:0;top:606px;width:1080px;height:4px;background:${T.bg}}
#k9-shade{position:absolute;left:0;top:608px;width:1080px;height:300px;background:linear-gradient(to bottom,rgba(10,17,26,.62),rgba(10,17,26,.38) 60%,rgba(10,17,26,0))}
</style>
<div id="k9-top">
  <!-- reference clip: <video id="ref1" class="clip" src="assets/c1.mp4" data-has-audio="true" data-start="0" data-duration="6" data-track-index="1" data-playback-rate="1.2"></video> -->
  <!-- or a picture scene: <div id="roll1" data-composition-id="9k-number-roll" data-composition-src="compositions/9k-number-roll.html" data-start="6" data-duration="4.6" data-track-index="3" data-width="1080" data-height="608" style="position:absolute;inset:0"></div> -->
</div>
<div id="k9-bot">
  <!-- <video id="vo1" class="clip" src="assets/vo.mp4" data-has-audio="true" data-start="0" data-duration="3.2" data-media-start="0" data-track-index="0"></video>
       <video id="vo2" class="clip k9-punch" src="assets/vo.mp4" data-has-audio="true" data-start="3.2" data-duration="2.7" data-media-start="3.2" data-track-index="0"></video> -->
</div>
<div id="k9-seam"></div>
<div id="k9-shade"></div>
`,
};

// ---------- items ----------
const base = (it, type) => ({
  $schema: 'https://hyperframes.heygen.com/schema/registry-item.json',
  name: it.name, type, title: it.title, description: it.description, tags: it.tags,
  author: AUTHOR, authorUrl: AUTHOR_URL, license: 'MIT', minCliVersion: MIN_CLI,
});

function buildBlock(b) {
  const dir = path.join(HERE, 'blocks', b.name);
  fs.rmSync(dir, { recursive: true, force: true });
  write(path.join(dir, `${b.name}.html`), blockHtml(b));
  write(path.join(dir, 'registry-item.json'), json({
    ...base(b, 'hyperframes:block'),
    dimensions: { width: b.w, height: b.h }, duration: b.duration,
    registryDependencies: ['9k-tokens'],
    files: [{ path: `${b.name}.html`, target: `compositions/${b.name}.html`, type: 'hyperframes:composition' }],
  }));
}

function buildComponent(c) {
  const dir = path.join(HERE, 'components', c.name);
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (f !== 'fonts') fs.rmSync(path.join(dir, f), { recursive: true });
  write(path.join(dir, `${c.name}.html`), SNIPPETS[c.name]());
  const files = [{ path: `${c.name}.html`, target: `compositions/components/${c.name}.html`, type: 'hyperframes:snippet' }];
  if (c.fonts) {
    for (const f of [...fontList(), 'OFL.txt']) files.push({ path: `fonts/${f}`, target: `assets/fonts/${f}`, type: 'hyperframes:asset' });
  }
  const item = { ...base(c, 'hyperframes:component'), files };
  if (c.fonts) item.license = 'MIT AND OFL-1.1';
  write(path.join(dir, 'registry-item.json'), json(item));
}

ensureFonts();
BLOCKS.forEach(buildBlock);
COMPONENTS.forEach(buildComponent);
write(path.join(HERE, 'registry.json'), json({
  $schema: 'https://hyperframes.heygen.com/schema/registry.json',
  name: '9k',
  homepage: 'https://github.com/ismail9k/motion',
  items: [...COMPONENTS.map((c) => ({ name: c.name, type: 'hyperframes:component' })), ...BLOCKS.map((b) => ({ name: b.name, type: 'hyperframes:block' }))],
}));
// ---------- README (generated, so the variable tables never drift) ----------
const varRow = (v) => `| \`${v.id}\` | ${v.type} | ${v.label.replace(/\|/g, '\\|')} | \`${String(v.default).length > 40 ? String(v.default).slice(0, 37) + '…' : v.default}\` |`;
write(path.join(HERE, 'README.md'), `# 9k HyperFrames registry

Reusable pieces of the 9k edit, so every short looks and moves the same. Generated by \`node registry/build.mjs\`
from \`src/\`: edit \`src/items.mjs\` (a block) or \`src/shared.mjs\` (tokens, fonts, motion, the block shell), then
rebuild. Never hand-edit \`blocks/\` or \`components/\`.

## Use it in a HyperFrames project

Point the project at this registry in \`hyperframes.json\`:

\`\`\`json
{ "registry": "https://raw.githubusercontent.com/ismail9k/motion/main/registry" }
\`\`\`

\`\`\`bash
npx hyperframes add 9k-band          # a block → compositions/9k-band.html (+ 9k-tokens: fonts → assets/fonts/)
npx hyperframes add 9k-split-layout  # a component → compositions/components/9k-split-layout.html
npx hyperframes add 9k               # every block tagged 9k
\`\`\`

Until the registry is on GitHub, install from this folder instead. It does what \`add\` does, and keeps files you
edited after installing (\`--force\` replaces them):

\`\`\`bash
node ~/ismail9k/motion/registry/install.mjs <project>            # everything
node ~/ismail9k/motion/registry/install.mjs <project> 9k-band    # one item (+ 9k-tokens)
\`\`\`

After changing \`src/\` and running \`build.mjs\`, run \`install.mjs\` again in each film to update it.

Wire a block with a host whose \`data-composition-id\` is the block name, and set its text and timing with
\`data-variable-values\`. The same block can appear any number of times, each with its own values:

\`\`\`html
<div id="band-proof" data-composition-id="9k-band" data-composition-src="compositions/9k-band.html"
  data-start="15.9" data-duration="1.2" data-track-index="3" data-width="1080" data-height="608"
  data-variable-values='{"text":"مثبت رياضيًا","underline":"رياضيًا"}'
  style="position:absolute;left:0;top:0;width:1080px;height:608px"></div>
\`\`\`

Blocks are silent: put SFX on the host, 8–14 dB under his voice (climax ≈ 6 dB under). Suggested hits: hook stamp →
thud, band → needle + bass, number roll → ticks then a ding on landing, verdict → pop per side, kicker → soft click.

## Components

${COMPONENTS.map((c) => `- **\`${c.name}\`**: ${c.description}`).join('\n')}

## Blocks

${BLOCKS.map((b) => `### \`${b.name}\` (${b.w}×${b.h}, ${b.duration} s)

${b.description}

| Variable | Type | What | Default |
|---|---|---|---|
${b.vars.map(varRow).join('\n')}
`).join('\n')}`);
console.log(`9k registry: ${BLOCKS.length} blocks, ${COMPONENTS.length} components → ${path.relative(process.cwd(), HERE) || '.'}`);
