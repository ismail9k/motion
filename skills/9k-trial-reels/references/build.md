# The version generator (`hf/build.mjs`)

One script writes all three HyperFrames projects (`hf/A`, `hf/B`, `hf/C`) from one spec, so a caption fix or a
re-cut lands in every version at once. Start from `templates/build.example.mjs`, a real film. Keep its machinery and
rewrite its content.

## Folder

```
hf/
  build.mjs            the spec + generator (run: node build.mjs [A|B|C])
  shared/assets/       vo.mp4 (recut.mjs), reference clips (c1a.mp4 …), listen.mp4, fonts/, sfx/, img/
  A/ B/ C/             GENERATED: index.html, compositions/*.html, assets/ = hard links to shared/
  cut-review/          gate 1 project (cut-review.mjs)
```

`build.mjs` overwrites `A/B/C/index.html` and `compositions/`. If he edited a version in Studio or the desktop app, move
that edit into `build.mjs` first (`npx hyperframes catch-up` in the version folder, plus `.hyperframes/backup/`).

## What to rewrite per film (content)

| Section | What it holds | Notes |
|---|---|---|
| `CLIPS` + `CLIP_LUFS` | reference clips in `shared/assets`, each with its measured LUFS | gain = min(1, 10^((−19.5 − L)/20)): plain gain, no compression |
| `SHOW_RATE` | reference clip speed (1.2) | his voice is never sped up |
| `VO` | his caption lines `[s, e, arabic, english]` in **cut time** (`work/transcript.cut.md` after `cut.mjs`, or words.json mapped through keep) | `*word` = orange keyword pill, `a~b` = keep together. Brand spellings: ChatGPT, Claude, NP-Hard, OR-Tools |
| `CL` | captions of the reference clips, clip-local time | from the reference transcript |
| `B` | VO **blocks** (cut-time ranges): one idea each, the unit versions reorder | a block can skip a sub-range: `[[a, b], [c, d]]` |
| `S` | picture scenes: `{ html, css, js(render(t)), sfx: [[t, name], …] }`, one per block | times in block-local time; 9k tokens; one idea per scene |
| `VARIANTS` | per version: `items` (order of clips and blocks + which scene + params), `punch`, `mirror`, `center`, `hook` | the three versions differ HERE |
| hooks (`hookA/B/C`) | the opening stamp per version | full-frame, ≤ 3.6 s |

## What to keep (machinery)

- **Cut remap.** `KEEP_OLD` (`work/keep.built.json`, the cut the times were written against) → `KEEP` (`work/keep.json`,
  the approved cut). `oldRangeToNew` maps any old range onto the new cut through raw-take time. It merges two pieces
  only when they touch in output time **and** run on in the source: a closed gap touches in output time too, so
  merging on output time alone hides the cut.
- **Warp.** `voBlock` gives each VO scene host `p.warp = [[newLocal, oldLocal, len], …]`, and `sceneFile` renders
  `render(MAP(t))`. Beats written in old block time stay on their words and jump where he cut. `sfxTime` drops SFX
  that fall in removed stretches. Caption lines that lose words are remapped. Lines that lost words but survive get
  new text in `VO_FIX` (keyed by old start), and lines with nothing left are dropped.
- **`sceneFile`.** Each scene bakes its own duration and params (`DN`, `P`), because the assembler strips host
  `data-*`. Without that, a scene falls back to 10 s and goes blank. Each scene has one paused timeline, which drives a
  `clock` that calls `render()`. Name no element `clock` in a scene: it collides with the timeline variable.
- **Assets.** The `link()` helper hard-links `shared/assets` into each version and **re-links when the inode changed**.
  A replaced shared file otherwise leaves the versions on the old one, which is silent in every still.
- **Layout.** Split: the top panel `TOP=608` (1080×608, 16:9) holds the reference clip or the picture scene, his
  footage sits below (`VOY` shifts it so the face sits at y≈1040–1430), and a seam/shade joins them. Centre mode
  (`center: true`): reference clips play alone, centred on a dark frame (`MY`). The hook stamp sits under the clip.
- **Captions.** These are word-by-word Arabic chunks (≤ 4 words, connectors kept with the next word) plus one
  English sentence. The stack sits on the wall above his head, inside the safe band (y 288–1248). In centre mode it
  moves below the clip.
- **Punch-ins.** Alternate scale 1 / `punch` on every jump cut (`EDGES` from the keep list), so no two neighbouring
  framings are the same.

## Checks the example passes

`npx hyperframes check` gives 0 errors. Expected warnings: `line_unread` on the last line, because there is no end
card and the film ends on his last word, and a few `outside_safe_zone` on full-frame hooks. Snapshot hooks, scene
midpoints and every block cut. Then render and run `vocheck.py` on each version.
