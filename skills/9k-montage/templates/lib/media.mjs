// Small ffmpeg helpers shared by the pipeline scripts.
import { execFileSync } from 'node:child_process';

export const duration = (file) =>
  +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });

// Silent intervals [[s, e], …] measured from the audio itself. The cut trusts these, never word gaps:
// whisper sometimes skips whole sentences, and a gap in the words is then real speech.
export function silences(file, db = -35, min = 0.2) {
  const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af silencedetect=n=${db}dB:d=${min} -f null - 2>&1`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const res = []; let s = null;
  for (const line of log.split('\n')) {
    const a = line.match(/silence_start: (-?[\d.]+)/), b = line.match(/silence_end: ([\d.]+)/);
    if (a) s = Math.max(0, +a[1]);
    if (b && s != null) { res.push([+s.toFixed(3), +(+b[1]).toFixed(3)]); s = null; }
  }
  if (s != null) res.push([+s.toFixed(3), +duration(file).toFixed(3)]);
  return res;
}

// Fraction of [a, b] covered by silence
export const silentShare = (sil, a, b) =>
  sil.reduce((acc, [s, e]) => acc + Math.max(0, Math.min(b, e) - Math.max(a, s)), 0) / Math.max(1e-6, b - a);
