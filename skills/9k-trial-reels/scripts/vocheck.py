# python3 <skill>/scripts/vocheck.py <version>/index.html <render.mp4> [vo=<version>/assets/vo.mp4]
# Proves a render plays the RIGHT voiceover: every voiceover clip in the composition is located in the vo file by
# full cross-correlation (FFT), and must come from exactly the media time the composition says. Still frames can't
# show this: a stale voiceover looks identical in snapshots. Needs numpy (python3 -c 'import numpy').
# Exit 1 on any mismatch.
import os, re, subprocess, sys
import numpy as np

idx, render = sys.argv[1:3]
vo = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(idx), 'assets', 'vo.mp4')
SR = 8000

def pcm(f):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(out, np.int16).astype(np.float32)

REF, REN = pcm(vo), pcm(render)
N = 1 << int(np.ceil(np.log2(len(REF) + 3 * SR)))
FR = np.fft.rfft(REF, N)
CS = np.cumsum(np.r_[0, REF.astype(np.float64) ** 2])

def locate(x):
    x = (x - x.mean()) / (x.std() + 1e-9)
    c = np.fft.irfft(FR * np.conj(np.fft.rfft(x, N)), N)[:len(REF) - len(x)]
    e = np.sqrt(CS[len(x):len(x) + len(c)] - CS[:len(c)]) + 1e-9
    c = c / e / np.sqrt(len(x))
    i = int(np.argmax(c))
    return i / SR, float(c[i])

html = open(idx, encoding='utf8').read()
segs = []
for m in re.finditer(r'<video[^>]*src="assets/vo\.mp4"[^>]*>', html):
    g = lambda k: float(re.search(k + r'="([\d.]+)"', m.group(0)).group(1))
    segs.append((g('data-start'), g('data-duration'), g('data-media-start')))
segs.sort()
ok = bad = 0
worst = 0.0
for s, d, ms in segs:
    if d < 0.6:
        continue
    w = min(2.0, d - 0.2)
    off = (d - w) / 2
    x = REN[int((s + off) * SR):int((s + off + w) * SR)]
    if len(x) < SR // 4 or x.std() < 30:  # silence: nothing to match
        continue
    t, c = locate(x)
    err = abs(t - (ms + off))
    if err < 0.04 and c > 0.8:
        ok += 1
        worst = max(worst, err)
    else:
        bad += 1
        print(f'  ✗ render {s:.2f}s: expected vo {ms + off:.2f}s, found {t:.2f}s (match {c:.2f})')
print(f'{"✓" if not bad else "✗"} {ok}/{ok + bad} voiceover clips play {os.path.basename(vo)} at the right time (worst {worst * 1000:.0f} ms)')
sys.exit(1 if bad or not ok else 0)
