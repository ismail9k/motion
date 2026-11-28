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
| `VO` | his caption lines `[s, e, arabic, english]` in **cut time**. Take the times from a word-level transcript of `vo.mp4`'s own audio (`whisper-cli -ml 1 -sow`); `work/transcript.cut.md` carries drifted times on a take with long pauses | `*word` = orange keyword pill, `a~b` = keep together. Brand spellings: ChatGPT, Claude, NP-Hard, OR-Tools |
| `CL` | captions of the reference clips, clip-local time | from the reference transcript |
| `B` | VO **blocks** (cut-time ranges): one idea each, the unit versions reorder | a block can skip a sub-range: `[[a, b], [c, d]]` |
| `S` | picture scenes **no registry block covers** (registry blocks are hosts with `data-variable-values`, not entries here): `{ html, css, js(render(t)), sfx: [[t, name], …] }`, one per block | times in block-local time; 9k tokens; one idea per scene |
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
card and the film ends on his last word, `line_unread` on single words of the word-by-word captions, and
`outside_safe_zone` on full-frame hooks, cards and the chest captions. Snapshot hooks, scene
midpoints and every block cut. Then render and run `vocheck.py` on each version.

## A talk with b-roll (no reference video)

His own script to camera, with b-roll made for it, is not a reaction reel. The split layout has nothing to put in
the top panel for most of the film, so the layout changes:

| Part | Layout |
|---|---|
| Him talking | Full frame (`top: 0`), captions on his chest (stack top ≈ 1050), punch-in alternating on every jump cut |
| A vertical b-roll (a 9k-motion clip, a screen recording) | Full-frame cutaway on a higher track while his voiceover clip keeps playing underneath. Its own SFX at `data-volume` 0.5 or less |
| A list he walks through (steps, tools, things the engineer has) | The split layout for that block only: his clips at `top: 404px` (the 608 px panel plus the example's `VOY` of −204), a picture scene in the 1080×608 top panel, each item landing on its word, the one green band on the thesis word |
| A 16:9 clip he quotes | Centred alone on the dark frame (`center` mode), captions above it, the hook stamp under it |
| A raw screen recording (a small app window on the desktop wallpaper) | `scripts/broll.py` crops it to the window and puts it 1000 px wide on the dark frame, ending above y ≈ 1150, sped (`rate`) to fit the block. It becomes a `broll` cutaway with the captions on the dark panel at 1185. Map the recording's beats (app opens, command typed) to his words when you pick `in`, `out` and `rate` |
| A prompt, command or file he tells them to copy ("the prompt on this screen") | A full-frame `card`: the text typeset in a 9k panel (Plex Sans 39 px, readable when paused), typed in fast and then held, with the phrases he paraphrases lighting orange on his words. Never a screenshot of it |
| A short label for the idea he's on (a file name, a CTA like "comment 9K") | `tags`: a pill above his head (top ≈ 236, green border, mono) with an Arabic sub-chip, each landing on its word |

**The three versions** differ in structure, as always:

| | A: full story | B: punchline first | C: the short one |
|---|---|---|---|
| Opens on | a quoted clip, or his first line with the hook stamp | his funniest or sharpest line from later in the take | him to camera, the title typed above his head |
| Content | everything, in order | the lesson after the cold open; drop one aside; end on the thesis | the lesson and the turn only |
| Look | punch 1.06 | punch 1.10 | punch 1.06; not mirrored unless he asks |

Every version opens with the `9k-hook-stamp` block: under the clip when a clip opens the film, above his head
(top ≈ 250) when he does. Start from `templates/build.broll.mjs`: each block item takes a layout flag (`broll`,
`card`, `split`, `tags`, `band`, or none for full), and `CAP_Y` gives each layout its caption top. Its `BROLL`,
`LISTS`, `TAGS` and `PROMPT` hold the per-film content, with beats in built-cut time.

**Time the b-roll to his voice.** A motion b-roll built before the recording is timed to a guess. Once the cut
exists, take the word times from the cut audio (`whisper-cli -ml 1 -sow` on `vo.mp4`'s audio), set every beat of the
b-roll (click, selection, each typed line) on the word that names it, set its length to the block's length, and
render it again into `hf/shared/assets/`. If only an mp4 was handed over, it cannot be re-timed: cut the block's
voiceover to it instead (start the cutaway on the first word it shows, end it when it ends), and say so. Keep the
original project as it was: save the voice-timed variant beside it (`index.voice.html`,
`cues.voice.json`), then put the original `index.html` and `cues.json` back.

**Leave the captions a band.** Reframe the b-roll camera so nothing readable sits in y ≈ 1180–1320, and put the
caption stack there during the cutaway (top ≈ 1185). Where UI still passes behind it, give the stack a dark 9k
panel for that block (`background: rgba(15,15,15,.94)`, 2 px `#404040` border, radius 28, no text stroke).

**Check a rendered b-roll's length** (`ffprobe -show_entries format=duration`) before linking it. A render that
stopped early still exits 0, and the cutaway then lasts under a second while every snapshot of his face looks fine.

**Write times against the cut, then remap.** Captions, blocks and beats are written in the time of the cut they
were built on (`work/keep.built.json`) and mapped through raw-take time onto `work/keep.json`, the same as the
example's machinery. Snap block ends to the nearest jump cut (within 0.03 s) so a block never starts 2 ms inside
the previous piece.
