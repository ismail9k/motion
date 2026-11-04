# edit.json reference

One file holds every edit decision. `cut.*` is in **source** seconds (from `work/transcript.md`). Everything else is in **output** seconds (from `work/transcript.cut.md`, after the cut). Re-run only the step whose keys changed:

| Keys changed | Re-run |
|---|---|
| `cut`, `tail`, `format` | `cut.mjs` → `render-overlay.mjs` → `compose.mjs` (every output time can shift: re-read transcript.cut.md). Set `tail` before the first cut |
| `captions`, `graphics`, `theme`, `dir` | `render-overlay.mjs` → `compose.mjs` (it prints graphic coverage: see craft §4) |
| `camera`, `grade`, `broll`, `audio` | `compose.mjs` |

## Top level

| Key | Default | Notes |
|---|---|---|
| `format` | `{w:1080,h:1920,fps:30}` | 9:16 Shorts. Long-form 16:9: `{w:1920,h:1080}`. Match the source fps |
| `dir` | `ltr` | `rtl` for Arabic films. It mirrors layouts, and every text still gets its own direction |
| `theme` | `dark` | The theme for panels. The footage is the background |
| `faceBottom` | `null` | Fraction of H below his chin at the most zoomed framing (e.g. `0.47`). No graphic, kicker included, starts above it; `overFace: true` on a graphic opts out. Set it for every 9:16 talking head |
| `tail` | `0` | Seconds of held last frame after the speech. Use it for an `endcard` (3–3.5 s) |

## cut

| Key | Default | Notes |
|---|---|---|
| `maxPause` | `0.35` | Silences longer than this shrink to `padOut + padIn`. Use 0.25 for punchy shorts and 0.5 for calm long-form |
| `padIn` / `padOut` | `0.08` / `0.1` | Air kept before and after speech. Raise `padOut` if word tails sound clipped |
| `silenceDb` | `-35` | Raise to `-30` in a noisy room, lower to `-40` for a quiet voice |
| `drop` | `[]` | `[[srcIn, srcOut, "reason"], …]`. Retakes, flubs, off-topic tangents. Cut from just before the first word to just before the kept take |
| `keepAll` | `false` | `true` keeps the source untouched (no tightening) |
| `keep` | — | An explicit `[[in,out],…]` list that replaces the automatic one |

Pauses come from measured audio silence, never from word gaps. Whisper skips speech, so a word gap can be real talking.

## camera

| Key | Default | Notes |
|---|---|---|
| `auto` | `true` | Each jump cut (both your cuts and the cuts already in the source) alternates `base` ↔ `punch` |
| `base` / `punch` | `1.0` / `1.12` | Punch between 1.08 and 1.18. Above 1.2 a 1080p source gets soft |
| `focus` | `[0.5, 0.35]` | The point that stays centred when zoomed, as fractions of the footage. Put it between the eyes (read it off `work/contact.png`) |
| `keys` | `[]` | `{t, z, ease, dur?, focus?}`. `ease`: `snap` (≈0.3 s spring punch on a word), `cut` (hard), `push` (slow smoothstep over `dur`) |

## captions

| Key | Default | Notes |
|---|---|---|
| `style` | `word` | `word` (word by word, keyword pill), `phrase` (calm, 7 words), `off` |
| `maxWords` / `maxChars` / `gap` | `4` / `24` / `0.3` | A chunk breaks at any of these limits, or at punctuation |
| `fixes` | `{}` | `{ "whisper text": "correct text" }`. A key can span several words (`"even you": "Evan You"`). It applies everywhere, so keep keys specific |
| `keywords` | `[]` | Words that get the orange pill while spoken. Numbers like `90%` get it automatically. One accent per chunk |
| `hide` | `[]` | `[[a,b],…]` output ranges with no captions: burned-in text, image inserts already in the source, the hook. A chunk spoken just before a range also stops at its start, so it never spills onto the insert |
| `override` | `[]` | `{s, e, text, at?}` replaces whisper's WORDS in `[s, e)` with `text`, timed evenly or at `at: [t…]`. They're chunked by the normal rules. Use it for missed or garbled speech |
| `size` / `y` | `2.05 rem` / `0.72` | `y` is the caption centre as a fraction of H. Landscape default: 0.84. For 16:9 use `style: "phrase"`, `y: 0.9`, `size: 1.5` |

Arabic proclitics glued to Latin words (`كReactivity`, `وDeveloper`) split by themselves. Connectors (`و`, `في`, `من`…) never end a chunk. Check with `node lib/captions.mjs`.

## graphics

Every graphic: `{type, t, dur, …}`. A graphic that would grow into the caption band is lifted above it, unless it has `captions: false`. Optional on any of them: `zone` (`top` | `mid` | `center` | `low`), or `y` (the graphic's top or centre as a fraction of H), `side` (`start` | `end`: the 16:9 side column beside his head, `start` being the reading start, so the right in an RTL film; it sets `x` 0.79 / 0.21 and `w` 0.34), `x` / `w` (the graphic's centre and width as fractions of W, when `side` isn't enough), `kicker` (a small tag above the graphic, on screen from its first frame), `dim` (0–0.6, darkens the footage), `sfx: false`, `captions: false` (hides captions while it shows), `dx` / `dy` (a final nudge as fractions of W / H, applied after layout and the face line: this is what dragging in the editor writes).

| type | Props | Use |
|---|---|---|
| `hook` | `text`, `sub?`, `cover?: [x,y,w,h]`, `size?` | The first-2-seconds line, typed with a caret. `cover` puts an opaque panel exactly over burned-in text |
| `chips` | `items: [{label, icon?, pick?}]`, `at?: [t…]`, `stagger?` | Tech names with logos. `at` lands each chip on its word (relative to `t`). `icon` = simple-icons slug (`react`, `vuedotjs`, `nodedotjs`, `rust`, `typescript`, `docker`…) |
| `versus` | `a`, `b`: `{label, icon?, points?, pointsAt?}`, `at: [aT,bT]`, `pick?: 'a'\|'b'`, `pickAt?`, `pointSize?` (0.78 of `size`) | X vs Y. Each side enters when it is named. `pick` turns that side's border orange |
| `stat` | `value: "90%"`, `label`, `count?: true` | Any number he says. It counts up |
| `card` | `title`, `body?`, `badge?`, `at?`, `bodyAt?` | A question or claim worth reading. The title starts typing at `at` (relative, default 0.15) and the body fades in at `bodyAt` |
| `list` | `items: []`, `title?`, `at?: [t…]` | Reasons and steps. Each item lands on its word |
| `retype` | `from`, `to`, `hold?` (0.9), `strikeAt?` (0.25) | "Not X, it's Y": strike at `strikeAt`, backspace at `hold`, retype. Set both so the new word lands on his word |
| `emoji` | `text: '^_^'`, `x?`, `y?`, `color?` | ASCII reaction on a punchline: `^_^ x_x o_o >‿<`. Beside the head, never over the mouth |
| `nino` | `expression`, `corner: 'start'\|'end'` | Mascot reaction: `thinking`, `happy`, `worried`, `surprised` |
| `band` | `text`, `y?` (0.6), `height?` (0.15), `size?` (3.4 rem, shrinks to fit), `underline?` + `underlineAt?` (0.3) | Green band climax, ≤ 1.2 s. One per film. Keep it below the mouth when the camera snaps in. `underline` draws an orange line under that word |
| `quote` | `text` | One serif line on a dimmed frame. Captions hide |
| `code` | `code`, `title?` | A typed code panel |
| `image` | `src`, `fit: 'card'\|'full'`, `caption?` | A b-roll still from `assets/`. `full` hides captions |
| `lowerThird` | `name`, `title?`, `titleAt?`, `org?`, `orgAt?` | Long-form 16:9 only. The box grows a line as the title, then the green `org` chip, land on their words |
| `title` | `text`, `kicker?`, `sub?`, `shade?` (0.9), `cps?` | A full-frame title card: the footage drops almost to black and the title is typed. Captions hide. Once per film |
| `panel` | `items: []`, `at: [t…]`, `title?`, `kicker?`, `side?`, `w?` (0.3), `badge?` + `badgeAt?`, `note?` + `noteAt?` | The split layout, 16:9: an opaque side column slides in and the footage slides the other way, so his face re-centres. Numbered rows land on their words and the newest is lit. `badge` then tags every row ("AI" at each stage). Captions follow the footage. Not during a `mask` or `hook.cover` |
| `endcard` | `cta`, `handle` | Green band, Nino, the wordmark retyped to 9k. Pair it with `tail` |
| `mask` | `rect: [x,y,w,h]`, `color?` | A bare opaque box over burned-in text, when no hook sits there |
| `stamp` | `kicker`, `line`, `accent?`, `lineAt`, `bill?: [[label, value]…]`, `billTitle?` ("INVOICE"), `billUnit?` ("/ month"), `total?`, `stamp?`, `stampAt?`, `y?` (0.415) | Kinetic hook without a box: the kicker types, a giant Latin `line` lands on its word (`accent` = its last part, in orange), a tilted bill card follows and a rubber `stamp` slams on it. Floats on a soft dark scrim. Hide captions under it. For a money / price / "for free" hook |
| `tracker` | `items: [{label, icon?}]`, `at?: [t…]`, `checkAt?: [t…]` | Up to six chips scattered with small tilts (checklist look). `checkAt` ticks each one orange. Use it once to introduce "N tools" and again as the recap when he says they all qualify |
| `stack` | `n`, `total?` (6), `icon?`, `pre?`, `title`, `titleAt`, `free?` + `freeAt?`, `rows?: [{text, at, count?, strikeAt?}]`, `meter?: {value, unit, at, label?}`, `side?` | A status card per item of a walkthrough, landing on a stack of the earlier ones with an `n/total` counter. `pre` types his question first and retypes into `title` on its word. A row with `count` counts `{n}` up; `strikeAt` strikes it. `meter` is a big counting value with a filling bar. `free` is a green pill |
| `cta` | `text`, `pill`, `line?`, `buttonAt?`, `pillAt?`, `nino?` | The spoken call to action as a green button: `line` types above it, the `pill` word inside `text` turns orange on its word, Nino sits on the corner. Usually `captions: false`, since the button says his words |

Every component asks for its own SFX (pop, whoosh, type ticks, ding), timed to its animation. They are collected in `work/cues.auto.json`.

## grade, broll

- `grade`: `{contrast: 1.04, saturation: 1.05, gamma: 1, brightness: 0}`, or `false` to disable. Keep it light: skin must not shift.
- HDR sources (iPhone HLG / Dolby Vision, PQ) are detected automatically: the cut stays 10-bit, the overlay goes through an sRGB → BT.2020 HLG/PQ LUT (SDR white 203 cd/m²), and the final is 10-bit HEVC (`hvc1`) with the source's colour tags. On HDR only `saturation` applies (contrast/gamma/brightness need `eq`, which is 8-bit). Dolby Vision metadata can't survive an edit, so the HLG base layer is what plays. Stills from `review.sh` show the raw HDR signal and look flat; judge colour on an HDR screen.
- `broll`: `[{t, dur, src, from}]` places full-frame video inserts from `assets/`. Captions keep running over them.

## audio

| Key | Default | Notes |
|---|---|---|
| `lufs` | `"source"` | Keeps the source level: no loudness normalization. A number (e.g. `-14`) normalizes the final mix to that target, and only when he asks for it |
| `voice.clean` | `false` | His voice stays as recorded. `true` adds highpass 75 Hz, light denoise (afftdn −28) and 3:1 compression, and only when he asks for it |
| `sfx.auto` / `sfx.gain` | `true` / `1` | Component cues, plus a whoosh on each camera snap of ≥ 0.08 |
| `sfx.pack` | `{}` | Real samples instead of the synth, per cue type: `{whoosh: {src, gain, lead, start, trim}, …}`. `gain` levels the sample to the synth (measure it), `lead` = the sample's onset in s so the hit lands on `t`; `type` cues are cut to their text length from `start`. Cues keep their timing, so editor moves still carry their sound. Woven SFX (`add-sfx` skill, catalog `woven.video/sfx`) is a good source; put files in `assets/sfx/` |
| `cues` | `[]` | Extra synth cues `{t, type, gain}`: `click pop thump whoosh tick ding type` |
| `extra` | `[]` | Sound files `{t, src, gain}`, e.g. `assets/notification.mp3` on "someone asked me" |
| `music` | `null` | `{src, gain: 0.14, duck: true, fadeOut: 1.5}`. Sidechain-ducked under the voice. Never use synthesized music under speech |
