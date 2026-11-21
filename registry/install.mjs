#!/usr/bin/env node
// Installs 9k registry items from this folder into a HyperFrames project, the way `hyperframes add` would,
// without the registry having to be online.
//   node registry/install.mjs [project dir] [item …] [--force]
// No items = everything. "9k" = every block. Dependencies (9k-tokens: fonts) come along.
// A file you edited after installing is kept (re-run with --force to replace it); unedited files are updated.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REG = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const force = args.includes('--force');
const pos = args.filter((a) => !a.startsWith('--'));
const looksLikeDir = pos[0] && (pos[0].includes('/') || pos[0] === '.' || fs.existsSync(pos[0]));
const project = path.resolve(looksLikeDir ? pos.shift() : '.');
const asked = pos;

const manifest = JSON.parse(fs.readFileSync(path.join(REG, 'registry.json'), 'utf8'));
const byName = new Map(manifest.items.map((it) => [it.name, it]));
const itemDir = (it) => path.join(REG, it.type === 'hyperframes:block' ? 'blocks' : 'components', it.name);
const readItem = (it) => JSON.parse(fs.readFileSync(path.join(itemDir(it), 'registry-item.json'), 'utf8'));

// what to install, dependencies first
let want = asked.length ? asked : manifest.items.map((i) => i.name);
want = want.flatMap((n) => {
  if (byName.has(n)) return [n];
  const tagged = manifest.items.filter((i) => i.type === 'hyperframes:block' && (readItem(i).tags || []).includes(n)).map((i) => i.name);
  if (!tagged.length) { console.error(`✗ no 9k item or tag "${n}". Items: ${[...byName.keys()].join(', ')}`); process.exit(1); }
  return tagged;
});
const order = [];
const visit = (n) => { if (order.includes(n)) return; for (const d of readItem(byName.get(n)).registryDependencies || []) visit(d); order.push(n); };
want.forEach(visit);

if (!fs.existsSync(project)) fs.mkdirSync(project, { recursive: true });
const STATE = path.join(project, '.hyperframes', 'k9-installed.json');
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const kept = [];
for (const name of order) {
  const it = byName.get(name), item = readItem(it);
  let n = 0; const k0 = kept.length;
  for (const f of item.files) {
    let bytes = fs.readFileSync(path.join(itemDir(it), f.path));
    if (f.target.endsWith('.html')) bytes = Buffer.from(`<!-- hyperframes-registry-item: ${name} -->\n${bytes}`);
    const dest = path.join(project, f.target);
    if (fs.existsSync(dest) && !force) {
      const cur = sha(fs.readFileSync(dest));
      if (cur === sha(bytes)) { state[f.target] = cur; continue; } // already current
      if (cur !== state[f.target]) { kept.push(f.target); continue; } // edited since install, or not installed by this script
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
    state[f.target] = sha(bytes);
    n++;
  }
  const k = kept.length - k0;
  console.log(`  ${n ? '✓' : '·'} ${name}${n ? ` (${n} file${n > 1 ? 's' : ''})` : k ? ' (kept your edits)' : ' (up to date)'}`);
}
fs.mkdirSync(path.dirname(STATE), { recursive: true });
fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');
if (kept.length) console.log(`  kept your edits in: ${kept.join(', ')}  (--force replaces them)`);
console.log(`9k → ${project}`);
