---
name: 9k-trial-reels
description: Use when Ismail (ismail9k / 9k) hands over a raw talking-head take, often a reaction or commentary on a show, podcast or interview clip, and wants it trimmed with the silence removed, turned into three versions (Instagram trial reels, A/B/C tests of one short), and given a cover. Triggers include "trim this and make three versions", "trial reels", "3 versions", "اعمل منه تلات نسخ", and "then make the cover".
---

# 9k Trial Reels

## Overview

One raw take in. Out come three finished versions of the same short and a cover. There are **three gates**, and he
approves each one before the next starts:

1. **CUT.** The silence and retakes are removed. He checks and trims the cut himself in a HyperFrames project.
2. **VERSIONS.** Three versions are built from the approved cut, rendered and verified.
3. **COVER.** The cover is made only after he approves the versions.

You ask nothing before gate 1: decide, build the cut, show it. This skill orchestrates and fills the gaps between
existing skills; it doesn't replace them:
- **9k-montage:** ingest, silence and retake cutting, transcript fixes, 9k house rules.
- **HyperFrames:** every build, preview and render.
- **reel-cover-generator / 9k-reel-cover:** the cover. Codex relights a real frame, and the text is typeset.

## Project layout (his rule)

```
<source folder>/
  IMG_xxxx.mov, <reference clips>     sources, never touched
  <yymmdd>-<slug>/                    THE live project (edit and render here; not an archive copy)
  <yymmdd>-<slug>-A.mp4  -B.mp4  -C.mp4
  <yymmdd>-<slug>-cover.png
```

`yymmdd` is today and `slug` is 2–3 words of the topic, for example `261121-shark-tank`. He renames the files if he
wants. **One file per version:** a new render replaces the delivered one, and the old one goes to the Trash. No
`-v2`, no `-v3`. Loose working files go inside the project (`source-notes/`).

## Gate 1: the cut

```bash
bash <montage>/scripts/new-montage.sh "<video>" "<source folder>/<yymmdd>-<slug>"   # <montage> = 9k-montage skill dir
cd "<source folder>/<yymmdd>-<slug>" && node scripts/ingest.mjs --lang ar
```
Read `work/transcript.md`. Put retakes and false starts in `edit.json` → `cut.drop`, keeping the corrected take, and
set `tail: 0`. Silence is cut from the measured audio, never from word gaps (9k-montage craft §2). Then:
```bash
node scripts/cut.mjs                                   # → work/keep.json
node <skill>/scripts/cut-review.mjs                    # → hf/cut-review: one clip per kept piece, labelled
cd hf/cut-review && npx --yes hyperframes@latest preview --background
```
**Show him:** the Studio link, the length before → after, and the dropped retakes, one line each. Tell him how to
correct the cut: drag a clip's edge to trim it, delete a clip to drop it, and don't worry about gaps, because they get
closed. **STOP until he says the cut is right.**

When he's done, he may have edited in Studio:
```bash
node <skill>/scripts/read-cut.mjs        # his edit → work/keep.json; prints every removed/added range WITH its words
node <skill>/scripts/recut.mjs           # → hf/shared/assets/vo.mp4, frame/sample exact; relinks version copies
cp work/keep.json work/keep.built.json   # the cut every time in build.mjs is written against
```
Read back what he removed as one short list, so a slip shows up before you build on it.

## Gate 2: three versions

All three use the **same approved cut**. They differ in **structure**: which blocks and reference clips go in, the
order, the hook and the look. Caption style or polish alone is not a different version.

| | A: full story | B: controversy first | C: explainer |
|---|---|---|---|
| Opens on | the reference clip's most provocative line + a hook stamp | the claim he disputes, then his strongest rebuttal | him to camera asking the question (typed hook) |
| Content | everything, in order | rebuttal first, explainer after; shorter | drops the part that only makes sense with the reference |
| Look | punch 1.06; reference clips centred alone, or split | punch 1.10, faster SFX | his footage mirrored (reference clips never: burned-in text) |

Reference clips: transcribe the reference video (`whisper-cli`, words on), pick the lines he is reacting to (the
claim, the provocative number, the line his rebuttal answers), and cut each one to `hf/shared/assets/c<n>-<topic>.mp4`
with `ffmpeg -ss <in> -to <out>` (re-encoded, 9:16 centre crop or full 16:9 for the top panel). Then measure each
clip's LUFS for `CLIP_LUFS`. Keep the clip and the sentence whole: never start or end one mid-word.

**Blocks come from the 9k registry first** (`<motion repo>/registry/README.md`; it lists every block's variables).
Install them once with `node <motion repo>/registry/install.mjs hf/shared`, which brings every block, both components
and the fonts. `build.mjs` copies `shared/compositions/` into every version. To pick up a registry change later, run
the same command again: it updates unedited files and keeps ones you edited. That gives you `9k-captions`, `9k-hook-stamp`, `9k-band`,
`9k-kicker`, `9k-number-roll` and `9k-verdict`, plus `9k-split-layout` for the host. Wire each block as a host with
`data-variable-values`. Write a custom scene in `build.mjs` only for a beat no block covers. If that beat will come back
in later films, add it to `registry/src/items.mjs` instead.

Copy `templates/build.example.mjs` to `hf/build.mjs`, rewrite its content, and keep its machinery. **Read
`references/build.md` first.** Then run `node build.mjs`. Write the A/B/C table into `docs/plan.md`. It is a record,
not an extra gate: build straight away.

House rules for every version:
- **His voice stays exactly as recorded:** no normalizing, denoising, compression or speed change.
- **Reference clips:** play at 1.2x with pitch preserved, with plain gain to ≈ −19.5 LUFS.
- **Sound:** SFX sit 8–14 dB under the voice. No music. No end card: the film ends on his last word.
- **Captions:** Arabic word by word with an orange keyword pill, plus one English line per sentence. They stay inside
  the safe band (y 288–1248).
- **Layout:** split, with the reference clip or picture scene in a 1080×608 panel on top and him below, or the
  reference clip centred alone.

Verify each version before showing anything. `<pin>` is one HyperFrames version for the whole project: the latest at
the first build. Write it into each version's `package.json` and keep it for every later render.
```bash
cd hf/A && npx --yes hyperframes@<pin> check                        # 0 errors (last-line line_unread is expected)
npx --yes hyperframes@<pin> snapshot --at <hook>,<each block cut>,<each scene mid>   # LOOK at the contact sheet
npx --yes hyperframes@<pin> render -q delivery -o ../../out/final-A.mp4
python3 <skill>/scripts/vocheck.py hf/A/index.html out/final-A.mp4  # must print ✓ (python with numpy)
ffmpeg -nostats -i out/final-A.mp4 -af ebur128 -f null - 2>&1 | grep ' I:' | tail -1   # ≈ his voice level
bash <skill>/scripts/deliver.sh .                                     # finals next to the source
```
**Show him:** the three files, one line each on how they differ, and their lengths. **STOP until he approves**, or
apply his notes and re-verify.

## Gate 3: the cover

After approval only. Follow **9k-reel-cover** (installed locally it may be named `reel-cover-generator`):
- Pick one sharp raw frame and have Codex relight it into the 9k theme. All text is typeset; the AI draws none.
- Title in his language, two lines, with green words in `[ ]`.
- Work in `<project>/cover/`, then save the final as `cover/cover.png` and run `deliver.sh` again.

With the cover, offer a short post caption: 1–2 Arabic lines plus 2–4 hashtags.

## When things change later

| He… | Do |
|---|---|
| trims the cut again (cut-review or in words) | `read-cut.mjs`, `recut.mjs`, then `node build.mjs`, which remaps every time onto the new cut. Fix caption lines that lost words (`VO_FIX`), then check, snapshot the cut beats, render, `vocheck.py`, `deliver.sh` |
| edited a version in Studio / the HyperFrames desktop app | run `npx hyperframes catch-up` in that version folder and read `.hyperframes/backup/`. Put his edit into `build.mjs` **before** the next `node build.mjs`, which overwrites the version |
| has a Studio tab open while you regenerate | it can save its stale copy over yours. Hash the files after building, and re-check before rendering |
| asks to render again | first check whether anything changed since the last render (file times, `catch-up`). If nothing did, say so |

## Red flags

| Thought | Reality |
|---|---|
| "I'll write a hook / band / number-roll scene for this film" | Use the 9k registry block and set its variables. Hand-written copies drift from the house style |
| "I'll show a segment table and he edits cut.json" | He corrects the cut by dragging clips in Studio. Give him `hf/cut-review` |
| "Normalize to −14 LUFS / speed him up a little" | His voice stays as recorded. Only reference clips get gain and 1.2x |
| "The reference clip is just context, not in the reel" | In a reaction reel, the reference clips are the hook and the B-roll |
| "Three versions = same edit, different caption styles" | Different structure: hook, order, what's in |
| "The snapshots look right, so the render is right" | Snapshots can't hear. A stale voiceover looks identical. `vocheck.py` on every render |
| "I replaced vo.mp4 in shared/, the versions use it" | They are hard links to the old file. `recut.mjs` relinks; `vocheck.py` proves it |
| "Keep v1, deliver this one as -v2" | One final per version. `deliver.sh` sends the old one to the Trash |
| "Put the project in ~/films or an edit/ folder" | `<yymmdd>-<slug>/` inside the source folder, as the live project |
| "Make the cover now while the versions render" | The cover comes after he approves the versions |
| "Quick question about titles/structure before I cut" | No questions before gate 1. Decide; the gates are where he corrects |
| "Regenerate to apply my fix" (after he used Studio) | `catch-up` first. Regenerating erases his edit |

## Quick reference

| Step | Command (project root) |
|---|---|
| scaffold + ingest + cut | `new-montage.sh`, `ingest.mjs --lang ar`, `cut.mjs` (9k-montage) |
| cut-review project | `node <skill>/scripts/cut-review.mjs` |
| his trim → keep list | `node <skill>/scripts/read-cut.mjs` |
| voiceover from keep | `node <skill>/scripts/recut.mjs` |
| build versions | `cd hf && node build.mjs` (from `templates/build.example.mjs`) |
| audio proof | `python3 <skill>/scripts/vocheck.py hf/A/index.html out/final-A.mp4` |
| deliver | `bash <skill>/scripts/deliver.sh .` |
| cover | 9k-reel-cover → `cover/cover.png` → `deliver.sh` |
