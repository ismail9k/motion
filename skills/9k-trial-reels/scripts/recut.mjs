// node <skill>/scripts/recut.mjs [keep=work/keep.json] [out=hf/shared/assets/vo.mp4]     (run in the project root)
// Cuts the voiceover from the ORIGINAL take (montage.json → source) by the keep list: frame-exact video trims and
// sample-exact audio trims from the same frame numbers (no drift), an 8 ms fade at every joint (no clicks), no other
// audio processing (his voice stays as recorded). A light fix in work/grade.txt is applied to the picture. Then RELINKS every per-version copy (hf/*/assets/<same name>):
// those are hard links, and a replaced file leaves them pointing at the old voiceover.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const keepFile = process.argv[2] || 'work/keep.json';
const out = process.argv[3] || 'hf/shared/assets/vo.mp4';
const keep = JSON.parse(fs.readFileSync(keepFile, 'utf8'));
const src = JSON.parse(fs.readFileSync('montage.json', 'utf8')).source;
const pr = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,r_frame_rate,sample_rate,color_transfer', '-of', 'json', src]).toString()).streams;
const v = pr.find((s) => s.codec_type === 'video'), a = pr.find((s) => s.codec_type === 'audio');
const [fn, fd] = v.r_frame_rate.split('/').map(Number), FPS = fn / fd, SR = +a.sample_rate;
if (['arib-std-b67', 'smpte2084'].includes(v.color_transfer)) console.warn(`⚠ HDR source (${v.color_transfer}): this writes 8-bit SDR for HyperFrames. Check skin tones in a snapshot.`);

// an approved light fix lives in work/grade.txt (one ffmpeg filter chain); this cut is from the ORIGINAL take, so it is applied here
const GRADE = fs.existsSync('work/grade.txt') ? ',' + fs.readFileSync('work/grade.txt', 'utf8').trim().replace(/^,|,$/g, '') : '';
if (GRADE) console.log('grade: work/grade.txt');
const parts = [];
keep.forEach(([s, e], i) => {
  const f0 = Math.round(s * FPS), f1 = Math.round(e * FPS);
  const a0 = Math.round((f0 / FPS) * SR), a1 = Math.round((f1 / FPS) * SR);
  const d = (f1 - f0) / FPS;
  parts.push(`[0:v]trim=start_frame=${f0}:end_frame=${f1},setpts=PTS-STARTPTS,scale=1080:1920${GRADE},setsar=1[v${i}];` +
    `[0:a]atrim=start_sample=${a0}:end_sample=${a1},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=${Math.max(0, d - 0.008).toFixed(4)}:d=0.008[a${i}]`);
});
const graph = parts.join(';') + ';' + keep.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${keep.length}:v=1:a=1[v][a]`;
fs.mkdirSync('work', { recursive: true });
fs.writeFileSync('work/recut.filter', graph);
fs.mkdirSync(path.dirname(out), { recursive: true });
const tmp = out.replace(/\.mp4$/, '.tmp.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-filter_complex_script', 'work/recut.filter', '-map', '[v]', '-map', '[a]', '-r', String(FPS),
  '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-ar', String(SR), '-movflags', '+faststart', tmp], { stdio: 'inherit' });
if (fs.existsSync(out)) fs.renameSync(out, out.replace(/\.mp4$/, '.prev.mp4'));
fs.renameSync(tmp, out);

// relink every per-version copy to the new file
const hf = path.dirname(path.dirname(path.dirname(out))); // hf/shared/assets/vo.mp4 → hf
const ino = fs.statSync(out).ino; let relinked = 0;
for (const d of fs.readdirSync(hf)) {
  const p = path.join(hf, d, 'assets', path.basename(out));
  if (d === 'shared' || !fs.existsSync(p) || fs.statSync(p).ino === ino) continue;
  fs.rmSync(p); fs.linkSync(out, p); relinked++;
}
const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString();
const want = keep.reduce((t, [s, e]) => t + (Math.round(e * FPS) - Math.round(s * FPS)) / FPS, 0);
console.log(`${out}: ${dur.toFixed(3)}s (cut list ${want.toFixed(3)}s) · ${keep.length} pieces · relinked ${relinked} version copies`);
if (Math.abs(dur - want) > 0.1) { console.error('✗ length differs from the cut list'); process.exit(1); }
