#!/usr/bin/env bash
# Relight one video frame into the theme's dark studio with Codex image generation.
#   make_hero.sh <frame.jpg> <out-dir> [extra prompt line]
# Writes <out-dir>/hero.png (1024x1536, empty dark top third for the title). Takes ~1-2 minutes.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
frame="$1"; out="$2"; extra="${3:-}"
mkdir -p "$out"
cp "$frame" "$out/frame.jpg"
cp "$here/../templates/examples/ai-engineer-white-friday.png" "$out/theme-reference.png"
{ cat "$here/hero-prompt.md"; [ -n "$extra" ] && printf '\nADDITIONAL DIRECTION: %s\n' "$extra"; } > "$out/prompt.md"
codex exec --skip-git-repo-check -s workspace-write -C "$out" -i "$out/frame.jpg" -i "$out/theme-reference.png" - < "$out/prompt.md" > "$out/codex.log" 2>&1
test -f "$out/hero.png" || { echo "Codex did not write hero.png; see $out/codex.log" >&2; exit 1; }
echo "$out/hero.png"
