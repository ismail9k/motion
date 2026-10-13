#!/usr/bin/env bash
# bash scripts/archive.sh [dest-dir]
# Saves the editable project next to the source as <name>-9k/, so the montage can be changed later without
# starting over: every edit decision, the transcript and word timings, the plan and review log, the pipeline
# scripts and components as they were for this film, real copies of the assets, and the final.
# Left out because they are rebuilt from the source: node_modules, the cut footage, overlay frames, audio mixes.
set -euo pipefail
SRC="$(node -e "console.log(JSON.parse(require('fs').readFileSync('montage.json','utf8')).source)")"
[ -f "$SRC" ] || { echo "source not found: $SRC"; exit 1; }
NAME="$(basename "${SRC%.*}")"
DEST="${1:-$(dirname "$SRC")/$NAME-9k}"
mkdir -p "$DEST"

# -L: assets/ holds links into the source folder; the archive gets real files, so it survives a tidy-up there.
rsync -aL --delete \
  --exclude node_modules --exclude .DS_Store \
  --exclude 'work/overlay' --exclude 'work/overlay.empty.png' --exclude 'work/cut.mov' --exclude 'work/cut.proxy.mp4' \
  --exclude 'work/*.wav' --exclude 'work/*.png' --exclude 'out/stills' --exclude 'out/preview-*' \
  --exclude README.md \
  ./ "$DEST/"

# The source is addressed relative to the archive, so the pair can move together.
node -e "
const fs = require('fs'), path = require('path'), [dest, src] = process.argv.slice(1);
const f = path.join(dest, 'montage.json'), m = JSON.parse(fs.readFileSync(f, 'utf8'));
m.source = path.relative(dest, src); m.assets = fs.existsSync(path.join(dest, 'assets')) ? fs.readdirSync(path.join(dest, 'assets')).filter((x) => !x.startsWith('.')).map((x) => 'assets/' + x) : [];
fs.writeFileSync(f, JSON.stringify(m, null, 2) + '\n');
" "$DEST" "$SRC"

cat > "$DEST/README.md" <<EOF
# $NAME — 9k montage project

The editable project behind \`$NAME-9k.mp4\`. Source: \`$(node -e "console.log(require('path').relative(process.argv[1], process.argv[2]))" "$DEST" "$SRC")\`.

- \`edit.json\`: every decision (cut, camera, captions, graphics, audio). Change this to change the film.
- \`docs/plan.md\`, \`docs/review_log.md\`: what was planned and what the critique rounds fixed.
- \`work/\`: transcript, word timings and cut lists. \`assets/\`: the sounds and images used.
- \`lib/\`, \`scripts/\`, \`overlay.html\`: the pipeline and components as they were for this film.
- \`out/\`: the final and its review sheets.

## Edit it again

\`\`\`bash
npm i && npx playwright install chromium   # once
node scripts/cut.mjs                       # once: rebuilds the cut footage from the source
node scripts/render-overlay.mjs && node scripts/compose.mjs
\`\`\`

After that, re-run only what an edit touches: \`cut.mjs\` for \`cut\`, \`render-overlay.mjs\` for captions and graphics,
\`compose.mjs\` for camera, grade and audio. Or ask Claude to "change the montage in this folder".
EOF
echo "project saved → $DEST ($(du -sh "$DEST" | cut -f1))"
