# Montage in HyperFrames Studio

How a 9k montage becomes an editable HyperFrames project, what breaks on the way, and how to work alongside him while he edits in Studio. Everything here was hit on a real film (AI Engineer · White Friday, Nov 2026).

## 1. Path

1. Make the film with the canvas pipeline as usual (cut → captions → graphics → render → critique), so the timings are proven.
2. `bash scripts/studio.sh`. This stages `studio/`, which holds the fonts, the SFX and the whole source re-encoded once as `assets/footage.mp4`. It then runs `scripts/port-hf.mjs`, which writes the following:
   - `index.html`: the footage clips (keep ranges, split again at framing cuts) with the camera, one graphics host per scene, one captions host and the extra sounds.
   - `compositions/gNN-<type>.html`: one scene per graphic, with its SFX inside, so they move with it.
   - `compositions/captions.html`.
3. `npx hyperframes@0.9.23 check` until 0 errors.
4. `npx hyperframes@0.9.23 snapshot --at <t,…> --no-end --against ../out/final-1080x1920.mp4 -o ../work/hf-snap` gives a render|reference pair per time. Compare at every graphic, and fix until they match.
5. `npx hyperframes@0.9.23 preview --background`, then open http://localhost:<port>. Studio is his editor.
6. Render only on his word: `PRODUCER_BROWSER_GPU_MODE=hardware npx hyperframes@0.9.23 render -o ../out/hf-final-1080x1920.mp4 --quality delivery` takes about 25 s for 51 s. Then measure LUFS against the source, look at frames (`node lib/sheet.mjs <mp4> out.png --every 3`), and deliver.

**Once the port exists, the HTML is the source.** Running `port-hf.mjs` again overwrites everything he did in Studio. After the first edit, change the HTML by hand.

## 2. Port gotchas (each one was a visible bug)

| Symptom | Cause | Fix (already in port-hf.mjs unless noted) |
|---|---|---|
| `check` error `deprecated_data_end` | `data-end` is a reserved timing attribute | Use any other name for your own data (`data-until`) |
| `duplicate_audio_track` warnings | SFX on one track index overlap, or run to the scene end | Give every `<audio>` its real `data-duration` (sample length − media-start) and put it in the first free lane |
| `nested_media_start_basis_ambiguous` | `<audio data-start>` inside a sub-composition | Add `data-hf-media-start-basis="local"` |
| Chips cut off at the left edge in an RTL scene | An absolute box with no `left` inside `direction: rtl` starts at the right edge, so `translate(-50%)` throws it off-screen | Pin it: `left:0; top:0` |
| The band lost the space around the underlined word | `display:flex` turns text runs into flex items and strips their edge spaces | Wrap the whole line in one `<span>` |
| "#Security" shows the `#` on the wrong side | `unicode-bidi: plaintext` on tags | Let tags inherit RTL, like the canvas |
| A label overflows its panel | The canvas shrinks labels to fit; CSS doesn't | Shrink loop at setup: ×0.94 until `scrollWidth` fits, never under 60 % |
| The title wraps differently from the canvas | The browser and the canvas measure Arabic differently | Give `title` explicit `lines` in edit.json; the port writes one div per line |
| Two captions on screen for 0.05 s | Chunk windows overlap (`s − 0.05` vs the previous `end`) | Show only the first matching chunk |
| Studio shows 10 "Cam 01…" rows | The camera was on wrapper divs | Scale the `<video class="clip">` itself (`transform-origin: 50% 0`) |
| `text_below_floor` on tags | 26–27 px tags | Tags are at least 28 px |
| `content_overlap` on a stamp over its receipt | The overlap is intended | `data-layout-allow-overlap` on the stamp; `data-layout-ignore` on texture (receipt header, rolling digits) |

Three `line_unread` warnings (a stamp on screen for 0.3 s, a title sub for 0.8 s, a 1.15 s band) follow his speech. They are the same in the canvas film, so leave them and say so.

## 3. Picture scenes instead of text

He asked for **more visuals instead of text**. Text and typing cards read as subtitles twice over. Build a beat as a small picture story in 9k tokens that lands on his words:

- Example template: `templates/hf-scenes/load-crowd.html`, for "500 people at once → will it hold?". A crowd of seeded person glyphs walks into a server rack, a `number-wheel` rolls to 500 on "في نفس الوقت", and the load bar runs success → warning → error. On "هيستحمل" the rack shakes, its LEDs blink red, a warning sign pops up, and a thud plays.
- Status colours on dark: success `#72DA9A`, warning `#F4C871`, error `#F39191` (9k-motion brand.md). Never use them on the green band.
- Before drawing a named thing by hand, look in the registry: `npx hyperframes catalog --json`. Install a block into a scratch project to read it (`hyperframes add <name> --dir <scratch>`). Useful ones: `number-wheel` (spin double, so zeros roll too), `count-up`, `mk-usage-arc`, `success-check`, `icon-morph-beat`, `confetti`, `code-terminal-run`.
- Keep text only where the words are the payoff: the hook stamp, the course title, the climax band and the CTA name.
- Drive everything from one `render(t)` with seeded randomness (no `Math.random`), so every frame is the same in preview and render.

## 4. Working while he edits in Studio

- **Studio saves its own in-memory copy over your files.** If he edits after you changed a file on disk, an older `index.html` comes back (for example, removed wrappers reappear). After every file change, reload the Studio tab before he touches it. Before acting, diff `index.html` against your last version.
- **His edits are in `studio/.hyperframes/backup/`**: timestamped copies of each file Studio saved (the name is the base64 of the path). Read them to see what he changed, and when.
- **A missing scene may be his choice.** If a host disappears, ask before restoring it. (He deleted a scene, then asked for it back, then deleted it again: each time it was his call.)
- **Stretching a scene in Studio does not stretch what is inside it.** Studio may write `data-start`/`data-duration` onto the scene's inner root, so the scene hard-cuts at its old length while the clip runs on. Fix: remove the inner timing (the scene reads `D` from the host), and check the new tail against the captions. A held hook crossed the first caption, so it now eases up 90 px just before the caption appears.
- Studio sometimes draws a few graphic hosts on a separate row. `npx hyperframes timeline --json` is the truth. If it shows every host on the graphics track with kind `graphics`, the render is fine.

## 5. Delivery

- A new version goes next to the earlier ones as `<name>-9k-v2.mp4`. Never overwrite a delivered version he hasn't replaced.
- Update the archive: `bash scripts/archive.sh` keeps `studio/` (minus the footage and caches) and writes a README on how to reopen it.
- Report the loudness of the new mix next to the source's, and every bare stretch over 4 s left by his edits, as his call rather than a fix.
