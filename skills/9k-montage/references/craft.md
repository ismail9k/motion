# Montage craft

These are the judgment calls the scripts can't make. Read this before you write the plan.

## 1. Read the footage before you edit it

Open `work/contact.png` and note these four things in the plan:

1. **Face box.** Where the head sits at base zoom (a seated talking head is usually 0.12–0.45 H). The graphics band starts below the chin, and `camera.focus` goes between the eyes.
2. **Burned-in text.** A hook caption or subtitles already in the export. Find its rect and time range by grabbing stills (`node lib/sheet.mjs work/cut.mov /tmp/x.png --at 0.5,2,4,6`). Then hide it with a `hook` that has `cover`, or with a `mask`. Add to `captions.hide` only the stretch where the burned text says the same words he is speaking, because captions would just repeat it. Once he moves past that line, captions run as normal: they sit at 0.72 H, below the cover panel.
3. **Inserts already in the source.** Photos, screenshots and b-roll the creator placed. A 1-per-second sheet finds them: `node lib/sheet.mjs work/cut.mov /tmp/s.png --every 1 --cols 14 --tile 128`. Put their ranges in `captions.hide` and keep your graphics off them.
4. **Framing changes.** A rough cut often alternates framings already. Ingest finds those cuts (`work/scenes.json`), and the camera alternates on them too.
5. **Dynamic range.** iPhone footage is HDR: HEVC 10-bit, BT.2020, HLG, usually with a Dolby Vision layer. Check `color_transfer` (`arib-std-b67` = HLG, `smpte2084` = PQ). Everything after must stay 10-bit with the same tags, and the sRGB graphics must be mapped into HLG/PQ (SDR white at 203 cd/m², 75 % HLG), or the delivery looks dull, banded and off-brand next to his original. `cut.mjs` and `compose.mjs` do this automatically (`lib/hdr.mjs`); a HyperFrames render must be set up to output 10-bit HDR too. Dolby Vision can't survive an edit: say so if he compares on an iPhone.

## 2. The cut (raw takes)

`ingest.json.kind` gives a first verdict. A raw take has long pauses, retakes (`⟲` in the transcript) or a slate.

- **Retakes:** keep the **last** complete take of a sentence. Drop from just before the first take's first word to just before the kept take's first word.
- **Flubs and restarts** ("يعني… يعني"): drop the false start and keep the clean run.
- **Off-topic tangents** in a short: drop them and name each one in the plan. If you're unsure, keep it and flag it.
- **Pauses:** `maxPause` 0.3 for shorts. Never drop a breath that leads into a punchline: give that cut `padIn` 0.15.
- **⚠ holes:** ingest already re-transcribes non-silent gaps and piled-up words (`‹word›` in the transcript). Anything still marked `⚠` is speech without words. Listen to the range (`ffplay -ss A -t B work/audio16k.wav`) and caption it with `captions.override` (`{s, e, text}` replaces the words in that range, and they're chunked normally).
- Check every `‹…›` region's edges in the transcript: the second Whisper pass can lose a word or two where its window starts or ends. Restore them with `captions.override`.
- After `cut.mjs`, every time you plan is OUTPUT time. Re-read `work/transcript.cut.md`.

## 3. Fix the transcript (captions are only as good as this)

Whisper medium is weak on Egyptian Arabic mixed with English tech terms. Go through every chunk that `node lib/captions.mjs` prints and fix mishearings in `captions.fixes`. These are typical:

| Whisper wrote | Meant |
|---|---|
| كريستيان / كريسيانو | كريستيانو |
| even you | Evan You |
| الممري | الميموري |
| تريد زوف | Trade-offs |
| ويجة نظر | وجهة نظر |
| أنه framework | أنهي framework |
| react / node (lowercase) | React / Node |
| نود / راست (spoken names) | Node / Rust |

Write tech names the way the brand writes them: `Vue.js`, `Node.js`, `TypeScript`, `Next.js`. Leave the dialect alone: `ملوش`, `عشان` and `هقوله` stay as they are. Fix spelling, not his voice. If more than ~8 % of words need fixing, use a bigger model: if `large-v3-turbo` isn't in `~/.cache/hyperframes/whisper/models/` and you have no standing permission to download it, fix by hand now and recommend the download in the plan's "needs you" line. With permission, download it once (`curl -L -o ~/.cache/hyperframes/whisper/models/ggml-large-v3-turbo.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin`); ingest picks the best model it finds.

## 4. Graphics: what goes where

- **One graphic per sentence, held for the sentence.** Walk `transcript.cut.md` sentence by sentence and give each idea one graphic that stays up while he says it (3–8 s), then hand over to the next. A graphic that pops for 2 s and leaves the face bare for 6 s reads as an unfinished edit. Never more than one graphic plus the caption on screen at once.
- **Coverage.** `render-overlay.mjs` (and `review.sh`) prints `graphics on screen: N % of talk` and every bare stretch over 4 s. Aim for 80 % or more in 16:9 and 60 % or more in 9:16, with no bare stretch listed. A source insert counts as covered. Leave a stretch bare only on purpose (one line he should say straight to camera), and say so in the plan.
- **Build it on his words.** The graphic opens with its label and fills in as he talks: `kicker` (or a card's `badge`, a list's `title`) is on screen from the first frame, and every part after it lands on the word that names it — `chips.at`, `list.at`, `card.at` / `bodyAt`, `versus.at`, `panel.at`, `lowerThird.titleAt` / `orgAt`. All of those come from `work/words.cut.json`. Don't open a card more than ~1 s before its title starts typing: an empty panel is worse than a bare face.
- **Trigger on the word.** A graphic's `t` is the start of the first word of its sentence (or 0.1 s before it), and each element inside it sits on its own word.
- **Change the layout, not just the content.** A film where every graphic is the same box in the same corner goes flat by the third one. In 16:9 over 45 s, use at least four of these: side column, the other side column, `lowerThird`, a full-frame `title`, the split `panel`, `band`, `nino`. Use `title` once, where he names the video or the course. Use `panel` once, on the longest enumeration (a lifecycle, a stack, steps): it holds for the whole list, 6–10 s.
- **Pictures over text.** He asked for more visuals instead of text (Nov 2026): a card that types his sentence repeats the caption. Tell the beat with a small picture scene that lands on his words: a crowd flooding a server for "500 at once", a shield taking hits for "if someone hacks you", a clock spinning to 3 as a server light dies for "3 AM", a price tag struck to 50 % for an offer. Keep text only where the words are the payoff: the hook stamp, the course title, the climax band, the CTA name. A number he says can stay as a rolling number inside the picture. Built in HyperFrames (`references/hyperframes.md` §3); the table below says what each idea is about, the picture says it.
- **Choose by what is said:**
  - names a tool → `chips`
  - walks through N tools / services one by one → `tracker` to introduce them, a `stack` card per item, `tracker` with `checkAt` as the recap
  - compares two → `versus`
  - says a number → `stat`
  - lists reasons → `list`
  - asks the audience a question → `card` with a badge
  - "not X but Y" → `retype`
  - a punchline or insult → `emoji` (`^_^ x_x o_o >‿<`, not `-_-`), beside the head
  - "think about it" → `nino thinking`
  - the thesis line, once → `band` (`underline` on its key word)
  - the spoken CTA ("comment X") → `cta`
- **Climax.** One `band` (green, ≤ 1.2 s) on the single most important word, with a camera `push` to ~1.12 that lands on the same word (start it ~0.4 s early, `dur` 0.45) and eases back (`push`, `dur` 0.6) after the band.
- **Hook.** The first 2 s must show something that isn't just the face. If the export already has a burned hook line, restyle it with `hook` + `cover`. Otherwise type the strongest line of the video at the top, or, for a money / price hook, use `stamp` (giant line + stamped bill) below the chin.
- **End.** No end card, ever: he turned it down (Nov 2026). `tail: 0`, no `endcard` graphic; the film ends on his last word. The spoken CTA gets a `cta` graphic while he says it, nothing after.
- **Set `faceBottom`.** Read the chin line off a punched-in still and set it (≈ 0.45–0.48 for a seated 9:16 head). He judges a graphic that touches his face as covering it.
- **Sit low.** Given the editor, he moved every graphic of his first film down by 0.07 H: he wants them clearly off the chin, sitting just above the caption band, not tucked under the face. Start there.
- **Tall graphics climb onto the chin.** A graphic that would cross the caption band is lifted above it, so a tall card or list ends up on his chin, worst on a punch-in. If the stills show it, lower the captions (`captions.y` 0.745) and shrink the graphic (`size`), rather than accept it.
- **Placement.** Use the `mid` zone (below the chin) by default. Use `top` only when the face is low or the camera is pushed out. Never put a graphic over the mouth.
- **16:9 placement.** A centred talking head fills the middle of a landscape frame, and every component centres on it by default. Put graphics in a side column instead: `side: "start"` or `"end"` with `y` ≈ 0.42. Alternate the side from one graphic to the next, so the eye crosses his face each time. A column never crosses the edge of his head: keep `w` ≤ 0.36, and check the stills at the punched-in zoom, where the head is wider. The lower third, the title, the panel, Nino, the band and the end card place themselves.
- **16:9 captions.** Use `style: "phrase"` at `y: 0.9`, `size: 1.5`: a full line along the bottom edge, clear of the side columns and his chest. Word-by-word chunks at 0.84 are for shorts.
- **Readable at phone size.** Nothing he is meant to read is smaller than a caption. Kickers and badges are the only small text, and they only label. If a label shrinks to fit its box, shorten the label.
- **His language.** A graphic repeats the words he says, in the language he says them: Arabic for the Arabic words, Latin for the tech terms. Don't translate his line into English on screen.
- **Assets next to the source** (`montage.json.assets`): use them when they fit. A notification sound goes on "someone asked me", a screenshot goes in an `image` card. List any unused ones in the plan.

## 5. Camera rhythm

- `camera.auto` handles jump cuts. Keep `punch` subtle (1.05–1.07): a 1.12 jump on every cut reads as lurching.
- Emphasis is an eased `push`, not a `snap`: the camera is a heavy element, so ease in over ~0.45 s, landing ON the word (start it 0.4 s early), and ease back out over ~0.6 s. One every 15–20 s. Reserve `snap` for a single hard comic beat, if any.
- A `push` (slow 1.0→1.08 over 3–4 s) suits the reflective close of a video.
- Check the punch-in framing doesn't crop the head: `focus[1]` sits near the eyes, and `punch` stays ≤ 1.15 when the head is already near the top.

## 6. Sound

- **SFX** come from the components (each graphic asks for its own cues, timed to its animation). Play them as **real samples**, not the synth: pull files with the `add-sfx` skill (Woven catalog: `fast-whoosh`, `pop-hand`, `mouse-click-2`, `notification-ding`, `dull-thud`, `keyboard-typing-realistic`, …) into `assets/sfx/` and map cue types to them in `audio.sfx.pack`. Set each `lead` to the sample's onset so the hit lands on the frame, and level each `gain` to the synth it replaces.
- **SFX levels.** Measure, don't trust a sample's default volume (they range over 20 dB). Hits sit 8–14 dB under his voice; the stamp and the climax ~6 dB under. Err quiet: after hearing the first HyperFrames port he had every effect halved (−6 dB), and `port-hf.mjs` now starts there. Typing is the easiest to lose (often 25 dB too quiet raw). To measure, subtract the voice from the mix: the mix is late by the limiter's lookahead, so align the two first (cross-correlate on a bare stretch), then read 20 ms RMS peaks at each cue.
- **Two signature touches** that worked: a short record-needle scratch on a jab at a rival tool ("ليه لسه بتستخدموا Vercel"), and a low bass hit layered under the climax band. One of each per film.
- **Music:** none by default under a talking head. If a track is supplied or sits next to the source, use `music` with ducking at gain 0.10–0.16, and never synthesized music.
- **Voice:** always the original. No denoise, no high-pass filter, no compression, and no loudness normalization: the mix stays at the source level. Don't set `voice.clean` or a numeric `lufs` unless he asks. Voice effects (echo on the hook, a phone filter on an aside) were offered and he declined: don't add them unless he asks.
- **Loudness:** `compose.mjs` prints the integrated LUFS and the peak of the final mix. Quote them in the delivery next to the source's own level, so he can see the voice was not changed.

## 7. Review rubric (score 1–10, fix the 3 worst, at least 2 rounds)

Look at `out/contact.png`, `out/phone.png` and `out/strip.png` and score:

- hook in the first 2 s
- caption accuracy (read every chunk)
- caption readability at phone size
- graphic timing against the words
- face never covered
- 9k brand accuracy
- coverage and pacing (the printed coverage figure, no bare stretch over 4 s, no graphic shorter than its sentence)
- layout variety (count the distinct layouts on the contact sheet)
- audio (loudness, SFX not louder than the voice)

Hunt specifically for:

- a burned-in caption peeking out
- Latin text running out of its panel in RTL
- two accents in one chunk or graphic
- a graphic on the mouth, or a side column clipping the edge of his head
- an empty panel waiting for its text
- every graphic on the same side
- a `mask` or `hook.cover` during a `panel` (the footage slides and the cover doesn't)
- a caption over a source insert
- a band longer than 1.2 s
- a punch-in that crops the forehead
- whisper words left unfixed

Log each round in `docs/review_log.md`. Re-render a preview of only the broken range with `node scripts/compose.mjs --from A --to B --half`.
