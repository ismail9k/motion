#!/usr/bin/env bash
# Fill templates/fonts/ with the files cover.html loads. The folder is gitignored: fonts are never committed.
#   setup-fonts.sh [dir-with-thmanyah-otf-files]
# IBM Plex (OFL) comes from @fontsource on npm, like the 9k-motion scaffold.
# Thmanyah is not redistributable: it is copied from the folder you pass, or from ~/Library/Fonts or /Library/Fonts.
# Get it from https://font.thmanyah.com/ if you don't have it.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
fonts="$here/../templates/fonts"
mkdir -p "$fonts"

# --- Thmanyah ---
search=("${1:-}" "$HOME/Library/Fonts" "/Library/Fonts")
missing=0
for f in thmanyahserifdisplay-Black.otf thmanyahsans-Bold.otf thmanyahsans-Medium.otf; do
  [ -f "$fonts/$f" ] && continue
  found=""
  for d in "${search[@]}"; do
    [ -n "$d" ] && [ -d "$d" ] || continue
    found=$(find "$d" -maxdepth 4 -iname "$f" 2>/dev/null | head -1)
    [ -n "$found" ] && break
  done
  if [ -n "$found" ]; then cp "$found" "$fonts/$f"; echo "copied $f"; else echo "MISSING $f"; missing=1; fi
done

# --- IBM Plex from @fontsource ---
need_plex=0
for f in IBMPlexSans-Bold.woff2 IBMPlexMono-Regular.woff2 IBMPlexMono-Bold.woff2; do [ -f "$fonts/$f" ] || need_plex=1; done
if [ "$need_plex" = 1 ]; then
  tmp=$(mktemp -d)
  (cd "$tmp" && npm pack --silent @fontsource/ibm-plex-sans@5 @fontsource/ibm-plex-mono@5 >/dev/null)
  for t in "$tmp"/*.tgz; do mkdir -p "$tmp/x" && tar -xzf "$t" -C "$tmp/x" && mv "$tmp/x/package" "$tmp/$(basename "$t" .tgz)"; done
  cp "$tmp"/fontsource-ibm-plex-sans-*/files/ibm-plex-sans-latin-700-normal.woff2 "$fonts/IBMPlexSans-Bold.woff2"
  cp "$tmp"/fontsource-ibm-plex-mono-*/files/ibm-plex-mono-latin-400-normal.woff2 "$fonts/IBMPlexMono-Regular.woff2"
  cp "$tmp"/fontsource-ibm-plex-mono-*/files/ibm-plex-mono-latin-700-normal.woff2 "$fonts/IBMPlexMono-Bold.woff2"
  rm -rf "$tmp"
  echo "fetched IBM Plex Sans/Mono"
fi

ls "$fonts"
if [ "$missing" = 1 ]; then
  echo "Thmanyah files are missing: pass the folder that holds them, e.g. setup-fonts.sh ~/Downloads/thmanyah" >&2
  exit 1
fi
