#!/usr/bin/env bash
# Stage a HyperFrames Studio project for this montage in studio/, then port the graphics, captions and camera into it.
# Run from the montage root, after the canvas pipeline has run (work/keep.json, work/cuts.json, work/captions.json, work/cues.auto.json):
#   bash scripts/studio.sh            # init + stage + port
#   bash scripts/studio.sh --no-port  # init + stage only
# Then: cd studio && npx hyperframes@0.9.23 check && npx hyperframes@0.9.23 preview --background
set -euo pipefail
HF="npx -y hyperframes@0.9.23"
SRC=$(node -e 'console.log(require("./montage.json").source)')
[ -f edit.json ] || { echo "run from the montage root"; exit 1; }
TRC=$(ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer -of default=nw=1:nk=1 "$SRC")
case "$TRC" in arib-std-b67|smpte2084) echo "⚠ source is HDR ($TRC): this staging encodes 8-bit BT.709 and will look flat. Tone-map or render HDR before using it." ;; esac
[ -f studio/hyperframes.json ] || $HF init studio --example=blank --resolution=portrait --non-interactive --skip-skills
mkdir -p studio/assets/fonts studio/assets/sfx studio/compositions
[ -d node_modules/@fontsource ] || npm i --no-save @fontsource/ibm-plex-sans @fontsource/ibm-plex-sans-arabic @fontsource/ibm-plex-mono >/dev/null
for f in ibm-plex-mono/files/ibm-plex-mono-latin-{400,600,700}-normal.woff2 ibm-plex-sans/files/ibm-plex-sans-latin-{400,600,700}-normal.woff2 ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-{arabic,latin}-{400,600,700}-normal.woff2; do
  cp node_modules/@fontsource/$f studio/assets/fonts/; done
find assets/sfx -name '*.wav' -exec cp {} studio/assets/sfx/ \;
# the whole source, re-encoded once: every footage clip trims into it with data-media-start (GOP 1 s keeps seeks exact)
[ -f studio/assets/footage.mp4 ] || ffmpeg -y -loglevel error -i "$SRC" -vf "scale=1080:1920:flags=lanczos,format=yuv420p" -r 30 \
  -c:v libx264 -crf 17 -preset medium -g 30 -keyint_min 30 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 256k -movflags +faststart studio/assets/footage.mp4
[ "${1:-}" = "--no-port" ] || node scripts/port-hf.mjs
