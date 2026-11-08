#!/usr/bin/env bash
# Pull candidate frames from a video and lay them out on one contact sheet.
#   frames.sh <video> <out-dir> [count=8]
# Writes <out-dir>/frame-<seconds>.jpg (full resolution) and <out-dir>/contact.jpg (tiles in time order; the script prints which tile is which).
# Use the raw/clean footage when there is one: burned-in captions end up in the hero image.
set -euo pipefail
video="$1"; out="$2"; count="${3:-8}"
mkdir -p "$out"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$video")
inputs=(); labels=""
for i in $(seq 1 "$count"); do
  t=$(python3 -c "print(round($dur * $i / ($count + 1)))")
  ffmpeg -v error -y -ss "$t" -i "$video" -frames:v 1 -q:v 2 "$out/frame-$t.jpg"
  ffmpeg -v error -y -i "$out/frame-$t.jpg" -vf "scale=270:-2" "$out/.thumb-$i.jpg"
  inputs+=(-i "$out/.thumb-$i.jpg"); labels+="[$((i-1))]"
  echo "tile $i (left to right) = $out/frame-$t.jpg  (${t}s)"
done
ffmpeg -v error -y "${inputs[@]}" -filter_complex "${labels}hstack=inputs=$count" -q:v 3 "$out/contact.jpg"
rm -f "$out"/.thumb-*.jpg
echo "contact sheet: $out/contact.jpg"
