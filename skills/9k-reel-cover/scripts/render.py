#!/usr/bin/env python3
"""Render a cover from templates/cover.html with headless Chrome.

    render.py <out.png> key=value ...

Keys are cover.html's query params (v, title, sub, tag, hero, hf, hb, photo, cut, art, prompt, label).
Image paths may be absolute or relative to the current directory.
"""
import pathlib
import subprocess
import sys
import urllib.parse

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
theme = pathlib.Path(__file__).resolve().parent.parent / 'templates'
out = pathlib.Path(sys.argv[1]).resolve()
params = dict(a.split('=', 1) for a in sys.argv[2:])
params.setdefault('v', 'hero')
for key in ('hero', 'photo', 'cut', 'art'):
    if key in params and '://' not in params[key]:
        p = pathlib.Path(params[key]).expanduser()
        if not p.is_absolute():
            p = (theme / p) if (theme / p).exists() else p.resolve()
        params[key] = p.as_uri()

missing = [f.name for f in [theme / 'fonts' / n for n in (
    'thmanyahserifdisplay-Black.otf', 'thmanyahsans-Bold.otf', 'thmanyahsans-Medium.otf',
    'IBMPlexSans-Bold.woff2', 'IBMPlexMono-Regular.woff2')] if not f.exists()]
if missing:
    sys.exit(f'Missing fonts in {theme / "fonts"}: {", ".join(missing)}. Run scripts/setup-fonts.sh first.')

url = (theme / 'cover.html').as_uri() + '?' + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                '--window-size=1080,1920', '--virtual-time-budget=4000', '--allow-file-access-from-files',
                f'--screenshot={out}', url], check=True, capture_output=True)
print(out)
