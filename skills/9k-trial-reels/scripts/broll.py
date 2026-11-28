#!/usr/bin/python3
# A raw screen recording → a full-frame b-roll cutaway: the app window, cropped from the wallpaper, 1000 px wide
# on the dark 9k frame, kept above the caption band (y ≥ 1185), sped to fit its block, no audio.
#   /usr/bin/python3 broll.py <recording> <in-s> <out-s> <rate> <out.mp4> [skip]   (rate 1.8 = 1.8x faster)
# A window taller than it is wide (browser, desktop app) is cut to a square from its top, starting <skip> px down
# (e.g. 100 to drop a browser toolbar).
#   /usr/bin/python3 broll.py <recording> --bounds                              (print the detected window only)
# The window is found on the frame at <in-s>: macOS wallpapers are saturated, window chrome and content are not.
import subprocess, sys
import numpy as np

def bounds(src, t):
    w, h = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
        'stream=width,height', '-of', 'csv=p=0', src]).decode().split(',')[:2])
    raw = subprocess.check_output(['ffmpeg', '-loglevel', 'error', '-ss', str(t), '-i', src, '-frames:v', '1',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    a = np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(int)
    neutral = (a.max(2) - a.min(2)) < 25
    rows, cols = np.where(neutral.mean(1) > 0.4)[0], np.where(neutral.mean(0) > 0.3)[0]
    assert len(rows) and len(cols), 'no window found: crop by hand'
    i = 6  # inset past the rounded corners
    x0, x1, y0, y1 = cols.min() + i, cols.max() - i, rows.min() + i, rows.max() - i
    return x0, y0, (x1 - x0) // 2 * 2, (y1 - y0) // 2 * 2

src = sys.argv[1]
if sys.argv[2] == '--bounds':
    print('x y w h =', *bounds(src, 2)); sys.exit()
ss, to, rate, out = float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
skip = int(sys.argv[6]) if len(sys.argv) > 6 else 0
x, y, w, h = bounds(src, ss)
y, h = y + skip, min(h - skip, w) // 2 * 2  # ≤ 1000 px tall at 1000 wide: ends above the caption band
vf = (f'[1:v]crop={w}:{h}:{x}:{y},setpts=(PTS-STARTPTS)/{rate},scale=1000:-2:flags=lanczos,'
      f'pad=iw+4:ih+4:2:2:color=0x404040,fps=30[w];[0:v][w]overlay=38:(1150-h)/2+80:shortest=1,format=yuv420p')
subprocess.run(['ffmpeg', '-nostats', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x0F0F0F:s=1080x1920:r=30',
    '-ss', str(ss), '-to', str(to), '-i', src, '-filter_complex', vf, '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-an', out], check=True)
d = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).decode().strip()
print(f'{out}: {d}s · window {w}x{h} at {x},{y}')
