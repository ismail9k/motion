// node scripts/compose.mjs [--from 10 --to 20] [--half] [--out out/final-1080x1920.mp4]
// Final assembly: camera (zoom/focus) over the cut footage → light grade → split-layout slide → b-roll → 9k overlay PNGs,
// source voice (untouched by default) + synthesized SFX + extra SFX files + ducked music → MP4 at the source level (or two-pass loudness when audio.lufs is a number).
//
// edit.json → grade: { contrast: 1.04, saturation: 1.05, gamma: 1, brightness: 0 } | false
//             broll: [{ t, dur, src: "assets/clip.mp4", from: 0 }]                  (full-frame video inserts)
//             audio: { lufs: 'source', voice: { clean: false }, sfx: { auto: true, gain: 1, pack: { whoosh: { src, gain, lead, start } … } },
//                      (pack: play a sample file instead of the synth for that cue type; gain matches the synth's level,
//                       lead = the sample's onset in s so the hit lands on t, start/trim for "type" cues cut to the text's length)
//                      cues: [{ t, type: "whoosh" | "pop" | "click" | "thump" | "ding" | "tick", gain }],
//                      extra: [{ t, src: "assets/notification.mp3", gain: 0.8 }],
//                      music: { src: "assets/bed.mp3", gain: 0.14, duck: true, fadeOut: 1.5 } | null }
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { events, cameraFilter, shiftFilter } from '../lib/camera.mjs';
import { ffLog } from '../lib/media.mjs';
import { kind as hdrKind, writeLut, tags as hdrTags } from '../lib/hdr.mjs';

const argv = process.argv;
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i > 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const edit = JSON.parse(readFileSync('edit.json', 'utf8'));
const cut = JSON.parse(readFileSync('work/cut.json', 'utf8'));
const cuts = JSON.parse(readFileSync('work/cuts.json', 'utf8'));
const F = { w: 1080, h: 1920, fps: 30, ...(edit.format || {}) };
const DUR = cut.duration, A = { lufs: 'source', voice: { clean: false }, sfx: { auto: true, gain: 1 }, cues: [], extra: [], music: null, ...(edit.audio || {}) };
const FROM = +arg('from', 0), TO = +arg('to', DUR), HALF = argv.includes('--half');
const OUT = arg('out', FROM || TO < DUR || HALF ? `out/preview-${FROM}-${TO}.mp4` : `out/final-${F.w}x${F.h}.mp4`);
mkdirSync('out', { recursive: true });
if (!existsSync('work/overlay/000000.png')) { console.error('no overlay frames — run node scripts/render-overlay.mjs first'); process.exit(1); }
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 });

// ---- 1. SFX: the graphics' own cues + camera snaps + manual cues → synthesized work/sfx.wav ----------
const cam = events(edit.camera, cuts);
const cues = [];
if (A.sfx.auto !== false) {
  if (existsSync('work/cues.auto.json')) cues.push(...JSON.parse(readFileSync('work/cues.auto.json', 'utf8')));
  for (const e of cam.ev) if (e.ease === 'snap' && Math.abs(e.z - e.z0) >= 0.08) cues.push({ t: e.t, type: 'whoosh', gain: 0.25 });
}
cues.push(...A.cues);
const PACK = A.sfx.pack || {};
const inRange = cues.filter((c) => c.t >= 0 && c.t < DUR);
const sampled = inRange.filter((c) => PACK[c.type]?.src && existsSync(PACK[c.type].src)); // played from files in the mix below
writeFileSync('work/cues.json', JSON.stringify({ dur: DUR, music: false, sfx: inRange.filter((c) => !sampled.includes(c)) }, null, 1));
execFileSync('node', ['lib/audio.mjs', 'work/cues.json', 'work/sfx.wav'], { stdio: 'inherit' });

// ---- 2. audio mix → work/mix.wav (measured for loudness before the final encode) ---------------------
const ain = ['-i', 'work/cut.mov', '-i', 'work/sfx.wav'];
const af = [];
af.push(`[0:a]${A.voice?.clean !== true ? 'anull' : 'highpass=f=75,afftdn=nf=-28,acompressor=threshold=-21dB:ratio=3:attack=8:release=120:makeup=2'},aresample=48000[voice]`);
const duck = A.music?.src && A.music.duck !== false;
if (duck) af.push('[voice]asplit=2[vo][key]');
af.push(`[1:a]volume=${(A.sfx.gain ?? 1) * 0.5},aresample=48000[sfx]`);
const mixIn = [duck ? '[vo]' : '[voice]', '[sfx]'];
let idx = 2;
// Every edit.json value that lands in a filter string is forced to a finite number first (no filtergraph injection).
const num = (v, d = 0) => (Number.isFinite(+v) && v !== null && v !== '' ? +v : d);
for (const x of A.extra) {
  ain.push('-i', String(x.src)); const ms = Math.max(0, Math.round(num(x.t) * 1000));
  af.push(`[${idx}:a]aresample=48000,adelay=${ms}|${ms},volume=${num(x.gain, 0.8)}[x${idx}]`); mixIn.push(`[x${idx}]`); idx++;
}
for (const c of sampled) { // sound-pack samples, same timing and relative gain as the synth cue they replace
  const p = PACK[c.type], ms = Math.round(Math.max(0, num(c.t) - num(p.lead)) * 1000), s0 = Math.max(0, num(p.start));
  const len = c.type === 'type' && c.text ? [...String(c.text)].length / num(c.cps, 16) + 0.04 : num(p.trim) || null;
  const trim = len ? `atrim=${s0}:${(s0 + len).toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, len - 0.06).toFixed(3)}:d=0.06,` : '';
  ain.push('-i', String(p.src));
  af.push(`[${idx}:a]${trim}aresample=48000,adelay=${ms}|${ms},volume=${(num(p.gain, 1) * num(c.gain, 0.4) * num(A.sfx.gain, 1) * 0.5).toFixed(4)}[x${idx}]`); mixIn.push(`[x${idx}]`); idx++;
}
if (A.music?.src) {
  ain.push('-stream_loop', '-1', '-i', A.music.src);
  const fo = A.music.fadeOut ?? 1.5;
  af.push(`[${idx}:a]aresample=48000,atrim=0:${DUR},volume=${A.music.gain ?? 0.14},afade=t=in:d=0.6,afade=t=out:st=${Math.max(0, DUR - fo)}:d=${fo}[mus]`);
  af.push(duck ? `[mus][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[mduck]` : '[mus]anull[mduck]');
  mixIn.push('[mduck]'); idx++;
}
af.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=first,alimiter=limit=0.89:level=disabled[mix]`);
writeFileSync('work/audio.graph', af.join(';\n'));
ff([...ain, '-/filter_complex', 'work/audio.graph', '-map', '[mix]', '-t', String(DUR), '-c:a', 'pcm_s16le', 'work/mix.wav']);
// The creator's voice is the reference: by default nothing normalizes it, so the mix keeps the source level.
// A numeric audio.lufs opts in to two-pass loudness (the gain can push peaks into the limiter).
let loud = 'aresample=48000';
if (Number.isFinite(+A.lufs)) {
  const L = JSON.parse(ffLog(['-i', 'work/mix.wav', '-af', `loudnorm=I=${+A.lufs}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-']).match(/^\{[\s\S]*?^\}/m)[0]);
  loud = `loudnorm=I=${A.lufs}:TP=-1.5:LRA=11:measured_I=${L.input_i}:measured_TP=${L.input_tp}:measured_LRA=${L.input_lra}:measured_thresh=${L.input_thresh}:offset=${L.target_offset}:linear=true,aresample=48000`;
}

// ---- 3. picture: camera → grade → b-roll → overlay ----------------------------------------------------
const vin = ['-i', 'work/cut.mov', '-framerate', String(F.fps), '-i', 'work/overlay/%06d.png', '-i', 'work/mix.wav'];
const G = edit.grade === false ? null : { contrast: 1.04, saturation: 1.05, gamma: 1, brightness: 0, ...(edit.grade || {}) };
// HDR footage (HLG / PQ) stays 10-bit: graphics go through an sRGB → HDR LUT, and the encode is 10-bit HEVC with the tags.
const HDR = hdrKind('work/cut.mov');
if (HDR) { writeLut('work/sdr2hdr.cube', HDR); console.log(`HDR (${HDR}): 10-bit, graphics mapped to BT.2020 ${HDR}, SDR white 203 cd/m²`); }
// Grade: saturation through hue (eq's saturation lowers chroma in ffmpeg 8, and eq drops 10-bit to 8). eq only for
// contrast / gamma / brightness, and never on HDR (it would quantize the picture to 8-bit).
const eqOn = G && !HDR && (G.contrast !== 1 || G.gamma !== 1 || G.brightness !== 0);
const grade = G ? `${eqOn ? `,eq=contrast=${G.contrast}:gamma=${G.gamma}:brightness=${G.brightness}` : ''}${G.saturation !== 1 ? `,hue=s=${G.saturation}` : ''}` : '';
const vf = [`[0:v]${cameraFilter(cam, cut.w, cut.h, F.w, F.h)}${grade}${shiftFilter(edit.graphics, edit.dir, F.w, F.h)},setsar=1[cam]`];
let last = '[cam]', vi = 3;
for (const b of edit.broll || []) {
  const bt = num(b.t), bd = num(b.dur, 2);
  vin.push('-ss', String(num(b.from)), '-t', String(bd), '-i', String(b.src));
  vf.push(`[${vi}:v]fps=${F.fps},scale=${F.w}:${F.h}:force_original_aspect_ratio=increase,crop=${F.w}:${F.h},setpts=PTS-STARTPTS+${bt}/TB[b${vi}]`);
  vf.push(`${last}[b${vi}]overlay=enable='between(t,${bt},${bt + bd})':eof_action=pass[v${vi}]`); last = `[v${vi}]`; vi++;
}
// The overlay PNGs are sRGB: convert them with the right matrix (swscale defaults to BT.601) before blending.
vf.push(HDR ? `[1:v]format=rgba,lut3d=file=work/sdr2hdr.cube,scale=out_color_matrix=bt2020:out_range=tv,format=yuva444p10le[ov]`
  : `[1:v]format=rgba,scale=out_color_matrix=bt709:out_range=tv,format=yuva444p[ov]`);
vf.push(`${last}[ov]overlay=format=${HDR ? 'yuv420p10' : 'yuv420'}:shortest=0,format=${HDR ? 'yuv420p10le' : 'yuv420p'}${HALF ? `,scale=${F.w / 2}:${F.h / 2}` : ''}[vout]`);
vf.push(`[2:a]${loud}[aout]`);
writeFileSync('work/video.graph', vf.join(';\n'));
console.log(`composing ${FROM}–${TO} s → ${OUT}…`);
ff([...vin, '-/filter_complex', 'work/video.graph', '-map', '[vout]', '-map', '[aout]',
  ...(FROM ? ['-ss', String(FROM)] : []), '-t', String(TO - FROM), '-r', String(F.fps),
  ...(HDR ? ['-c:v', 'libx265', '-preset', HALF ? 'veryfast' : 'medium', '-crf', HALF ? '24' : '17', '-pix_fmt', 'yuv420p10le', '-tag:v', 'hvc1',
    '-x265-params', `log-level=error:repeat-headers=1:colorprim=bt2020:transfer=${HDR === 'pq' ? 'smpte2084' : 'arib-std-b67'}:colormatrix=bt2020nc:range=limited`, ...hdrTags(HDR)]
    : ['-c:v', 'libx264', '-preset', HALF ? 'veryfast' : 'medium', '-crf', HALF ? '24' : '18', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709']),
  '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', OUT]);
const r128 = ffLog(['-i', OUT, '-af', 'ebur128=peak=true', '-f', 'null', '-']).split('\n').filter((l) => /I:|Peak:/.test(l)).slice(-2).join(' ').replace(/\s+/g, ' ').trim();
console.log(`→ ${OUT} · ${r128}`);
