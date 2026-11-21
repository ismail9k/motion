#!/usr/bin/env bash
# bash <skill>/scripts/deliver.sh <project-dir> [versions="A B C"]
# Puts the finals next to the source video, named after the project folder (<yymmdd>-<slug>):
#   out/final-A.mp4 → ../<yymmdd>-<slug>-A.mp4   (and B, C; and cover/cover.png → ../<yymmdd>-<slug>-cover.png if present)
# A final that is already there goes to the Trash first (Finder: recoverable), never rm. The source folder ends with
# the sources, one file per version, the cover, and the project folder. Nothing else.
set -euo pipefail
P="$(cd "${1:?usage: deliver.sh <project-dir> [versions]}" && pwd -P)"
NAME="$(basename "$P")"; S="$(dirname "$P")"; VERS="${2:-A B C}"
trash() { osascript -e 'on run argv
tell application "Finder" to delete (POSIX file (item 1 of argv as text) as alias)
end run' "$1" >/dev/null; }
put() { # put <file> <dest>
  [ -f "$1" ] || { echo "✗ missing $1"; exit 1; }
  [ -e "$2" ] && trash "$2"
  cp "$1" "$2"; echo "→ $2"
}
for v in $VERS; do put "$P/out/final-$v.mp4" "$S/$NAME-$v.mp4"; done
[ -f "$P/cover/cover.png" ] && put "$P/cover/cover.png" "$S/$NAME-cover.png"
# loose working files from earlier steps don't belong in the source folder
for f in "$S"/*; do
  case "$(basename "$f")" in "$NAME"|"$NAME"-*) continue ;; esac
  [ -d "$f" ] && echo "  note: folder next to the source: $(basename "$f") (move it into $NAME/ if it's working material)"
done
ls -1 "$S"
