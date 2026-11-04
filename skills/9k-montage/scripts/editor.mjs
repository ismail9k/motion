#!/usr/bin/env node
// node scripts/editor.mjs [--port 5174]  →  http://localhost:5174
// The montage editor: live preview (footage + camera + overlay), a timeline of graphics, captions and camera keys,
// and Render / Deliver buttons. Every change is written straight to edit.json, so Claude and the CLI see it too.
import http from 'node:http';
import { readFileSync, writeFileSync, statSync, createReadStream, existsSync } from 'node:fs';
import { spawn, execFile } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const pi = process.argv.indexOf('--port');
const PORT = pi > 0 ? +process.argv[pi + 1] : 5174;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.md': 'text/plain; charset=utf-8' };

const readEdit = () => JSON.parse(readFileSync('edit.json', 'utf8'));
const cutKey = (e) => JSON.stringify([e.cut, e.tail, e.format]);
const KEYFILE = 'work/.cutkey';
if (!existsSync(KEYFILE)) writeFileSync(KEYFILE, cutKey(readEdit())); // the cut on disk matches edit.json as it is now
const needsCut = () => readFileSync(KEYFILE, 'utf8') !== cutKey(readEdit());
const readData = () => JSON.parse(readFileSync('work/edit.data.js', 'utf8').replace(/^window\.EDIT = /, '').replace(/;\s*$/, ''));
const finalPath = () => { const f = { w: 1080, h: 1920, ...(readEdit().format || {}) }; return `out/final-${f.w}x${f.h}.mp4`; };

function dataOnly() {
  return new Promise((ok) => execFile('node', ['scripts/render-overlay.mjs', '--data-only'], (err, out, errOut) => ok({ err: err ? String(errOut || err) : null, log: String(out).trim() })));
}

// One background job at a time (render / deliver); the page polls /api/job.
const job = { running: false, kind: null, log: '', ok: null };
function run(kind, cmd, env = {}, after) {
  if (job.running) return false;
  Object.assign(job, { running: true, kind, log: `$ ${cmd}\n`, ok: null });
  const p = spawn('bash', ['-c', cmd], { cwd: ROOT, env: { ...process.env, ...env } });
  const add = (b) => { job.log += String(b); if (job.log.length > 60000) job.log = job.log.slice(-60000); };
  p.stdout.on('data', add); p.stderr.on('data', add);
  p.on('close', (code) => { job.running = false; job.ok = code === 0; if (code === 0 && after) after(); add(`\n${code === 0 ? '✓ done' : '✗ failed (exit ' + code + ')'}\n`); });
  return true;
}

const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b)); });
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

function serveFile(req, res, file) {
  let st; try { st = statSync(file); } catch { res.writeHead(404); return res.end('not found'); }
  if (st.isDirectory()) { res.writeHead(404); return res.end('not found'); }
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) { // video seeking needs byte ranges
    const a = range[1] ? +range[1] : 0, b = range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1, 'cache-control': 'no-store' });
    return createReadStream(file, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), p = decodeURIComponent(url.pathname);
  try {
    if (p === '/api/state') {
      const m = JSON.parse(readFileSync('montage.json', 'utf8'));
      return send(res, 200, { edit: readEdit(), data: readData(), words: JSON.parse(readFileSync('work/words.cut.json', 'utf8')), source: m.source, final: finalPath(), needsCut: needsCut(), job });
    }
    if (p === '/api/save' && req.method === 'POST') {
      let e; try { e = JSON.parse(await body(req)); } catch (x) { return send(res, 400, { error: 'edit.json is not valid JSON: ' + x.message }); }
      writeFileSync('edit.json', JSON.stringify(e, null, 1) + '\n');
      const r = await dataOnly();
      if (r.err) return send(res, 500, { error: r.err });
      return send(res, 200, { data: readData(), log: r.log, needsCut: needsCut() });
    }
    if (p === '/api/render' && req.method === 'POST') {
      const cut = needsCut();
      const cmd = (cut ? 'node scripts/cut.mjs && ' : '') + 'node scripts/render-overlay.mjs && node scripts/compose.mjs';
      const ok = run('render', cmd, {}, () => { if (cut) writeFileSync(KEYFILE, cutKey(readEdit())); });
      return send(res, ok ? 200 : 409, ok ? { started: true } : { error: 'a job is already running' });
    }
    if (p === '/api/deliver' && req.method === 'POST') {
      const src = JSON.parse(readFileSync('montage.json', 'utf8')).source;
      const dest = path.join(path.dirname(src), path.basename(src, path.extname(src)) + '-9k.mp4');
      const ok = run('deliver', 'cp "$FINAL" "$DEST" && echo "→ $DEST" && bash scripts/archive.sh', { FINAL: finalPath(), DEST: dest });
      return send(res, ok ? 200 : 409, ok ? { started: true } : { error: 'a job is already running' });
    }
    if (p === '/api/job') return send(res, 200, job);
    const file = path.join(ROOT, p === '/' ? 'editor.html' : p);
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end(); }
    serveFile(req, res, file);
  } catch (x) { send(res, 500, { error: String(x.stack || x) }); }
}).listen(PORT, () => console.log(`9k montage editor → http://localhost:${PORT}`));
