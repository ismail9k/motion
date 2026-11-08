---
name: 9k-reel-cover
description: Use when a creator wants an Instagram Reel / Short cover or thumbnail (9:16) for a script or a video of themselves in the 9k house style (ismail9k / 9k) — "make a reel cover", "cover for this video", "thumbnail for my short", "غلاف الريل", "cover للسكريبت". Agrees on a title and subtitle, relights one real frame of the video with Codex image generation into the 9k dark studio, then typesets the cover from a fixed template, so every cover on the grid looks like one series and none of the text is AI-drawn.
---

# 9k Reel Cover

Every reel cover uses **one locked house theme**, taken from ismail9k.com and 9k.school, so the profile grid reads as a series. A cover is two layers:

1. **Hero photo:** one real frame of the reel, relit by **Codex image generation** into the theme's dark studio. The face, pose, clothes and gear stay the same. The room becomes near-black with a green glow and an orange rim light, and the top third is left empty.
2. **Everything else is typeset, never generated:** `templates/cover.html` sets the title, subtitle, wordmark, tag pill, textures and accents with the real fonts, rendered to PNG by headless Chrome.

The AI never draws text. That, the real frame, and a fixed layout are what keep the covers from looking AI-made. Don't generate a whole cover, text included, with an image model unless the user explicitly asks for it.

Approved example: `templates/examples/ai-engineer-white-friday.png`. Codex also uses it as its mood reference.

## The theme (locked; change only when the user asks)

Values come from the 9k design tokens' dark theme (design.the9klabs.com), as used on both sites. They agree with `../9k-motion/references/brand.md`.

- **Background:** `#0F0F0F` with soft radial glows: green `#166434` top-left and behind the subject, orange `#E85A02` bottom-right. Adds the 9k.school dot texture and a seeded pixel starfield (green, orange, white) across the empty top.
- **Header** (inside the 3:4 grid crop): the `Ismail9k_` wordmark (IBM Plex Sans Bold) with a green cursor bar, plus an outlined `#tag` pill.
- **Title:** Thmanyah Serif Display Black, `#F5F5F5`, right-aligned, in two lines where possible. Words wrapped in `[ ]` turn bright brand green `#2FB163`, like "Engineering" on 9k.school. It auto-shrinks to fit the column.
- **Subtitle:** Thmanyah Sans Medium on a brand-green highlight block, like "age of AI" on 9k.school. `[ ]` marks only those words; without brackets the whole line is marked.
- **Accent:** the orange eight-point star from the 9k course art, top right of the subject.
- **Hero:** the Codex image, bottom-anchored and full-bleed, fading into the background under the title.
- **Grid safety:** everything that matters sits between y=240 and y=1680, the 3:4 crop Instagram shows on the profile grid. Keep the face above y≈1500 and away from the right edge, where the Reels UI sits.
- **Optional, off by default:** `art=` places a transparent story object at the lower left. `templates/assets/course-software-engineering-ai.webp` is the AI-Native Software Engineer course art, for course promos only. `prompt=` adds a mono `› …` line at the bottom.

Brand colors stay exact: green `#166434` (bright text variant `#2FB163`), orange `#E85A02`, ink `#0A111A`.

## Language

- Talk to the user in **English**, whatever the script's language.
- **The cover text follows the script.** Arabic scripts get Arabic titles (Egyptian dialect where natural), and English scripts get English titles. An English subtitle under an Arabic title is fine.
- Keep Arabic shaping and right-to-left order intact. Never transliterate or alter an approved title to get around a rendering problem.

## Files

```
templates/cover.html          the template, driven by query params
templates/fonts/              filled by scripts/setup-fonts.sh; gitignored, never commit fonts
templates/assets/             brand art usable as optional story objects
templates/examples/           approved covers; the first is Codex's mood reference
scripts/setup-fonts.sh        fills templates/fonts (Thmanyah from a folder you pass or ~/Library/Fonts, IBM Plex from @fontsource)
scripts/frames.sh             video -> candidate frames + contact sheet
scripts/make_hero.sh          frame -> Codex-relit hero.png (1024x1536)
scripts/hero-prompt.md        the locked Codex prompt
scripts/render.py             params -> 1080x1920 PNG via headless Chrome
```

**Requirements:** Google Chrome, `ffmpeg`/`ffprobe`, Python 3, npm (for the IBM Plex fonts), and the `codex` CLI with image generation enabled (`codex features list | grep image_generation`). Thmanyah is not redistributable. If `setup-fonts.sh` can't find it, ask the user for the folder, or point them to https://font.thmanyah.com/.

Run every script by its absolute path under this skill's directory. Keep working files in the session's scratchpad or next to the video, never inside the skill.

---

## Workflow (follow in order)

### Step 0: Fonts (first run only)

If `templates/fonts/` is empty, run `scripts/setup-fonts.sh [thmanyah-folder]`.

### Step 1: Analyze the content

From the script, or from the video's transcript (check first for an existing one next to the video, such as a 9k-montage project's `work/transcript*.md`; otherwise transcribe with `whisper-cli`), present to the user in English:

> **Script analysis**
> • Language: Arabic (Egyptian dialect)
> • Summary: two or three sentences on the topic, angle and tone.
> • Hook: the single idea the cover should sell.

### Step 2: Suggest 3 titles

Write three distinct titles in the script's language, 3–8 words each, punchy and readable at thumbnail size. Show where the green words go with `[ ]` and the line break with `|`, for example `كاتب كود ولا|[مهندس برمجيات]؟`. Accept a number or a custom title, and use a custom title verbatim. Ask with AskUserQuestion when available.

### Step 3: Suggest 3 subtitles and the tag

Write three subtitles that support the chosen title: a short label, a course or tool name, or a phrase. Accept a number, a custom subtitle, or "skip". Also propose the `#tag` pill (series or topic, such as `#AI_Engineer` or `#AI`), or leave it empty. You can ask Steps 2 and 3 in one AskUserQuestion.

### Step 4: Pick the frame

You need one frame where the face is clear, the gesture is expressive and the image is sharp. Prefer the **raw footage** over an edited export, because burned-in captions and graphics would end up in the hero. Run:

```bash
<skill>/scripts/frames.sh "<video>" "<work>/frames" 8
```

Look at `contact.jpg` (the script prints which tile is which), pick the best `frame-<s>.jpg`, and name it to the user in one line, for example "using the 0:45 frame: raised finger, direct look". If the user supplied a photo instead of a video, use that photo. With no person at all, see "Covers without a person" below.

### Step 5: Relight the frame with Codex

```bash
<skill>/scripts/make_hero.sh "<work>/frames/frame-<s>.jpg" "<work>/hero" ["optional extra direction"]
```

It takes one to two minutes, so run it in the background. Then look at `hero.png` and check it before you continue:
- The person is clearly the same person (face, hair, facial hair). If not, rerun once with an extra direction such as "match the face in frame.jpg more closely".
- The top ~33% is empty dark background, and the head starts around 1/3 of the height.
- There is no text, logo or watermark, and no extra fingers or warped gear.

The bare hero is one layer of the cover, not the result. Don't present it as the cover.

### Step 6: Render the cover

```bash
<skill>/scripts/render.py "<work>/cover-<slug>.png" v=hero \
  "title=<line 1>|<line 2 with [green words]>" "sub=<subtitle>" "tag=#<tag>" \
  hero="<work>/hero/hero.png" hf=720
```

Check the render yourself (Read the PNG) and the 3:4 grid crop (`ffmpeg -i cover.png -vf crop=1080:1440:0:240 grid.jpg`). Confirm that:
- The title is two lines, inside the column, and doesn't touch the head. If the head creeps into the subtitle, move the hero down with a negative `hb`, for example `hb=-80`.
- The header, title, subtitle and face sit inside the grid crop.
- Both brand colors are visible: green in the title words or subtitle block, orange in the star, glow and rim light.

### Step 7: Present and iterate

Send the cover and the grid preview with SendUserFile. State the title, subtitle, tag and frame used, then offer tweaks: the title or green words, the subtitle, the tag, a different frame, regenerating the hero, or a story object (`art=`).

For a tweak, change only the layer it touches. Text changes are an instant re-render with no Codex call. A new frame or look means rerunning Step 5 with the same prompt plus one extra direction.

---

## Template parameters

| Param | Meaning |
|---|---|
| `v` | `hero` (default, the house look). `lab` puts the untouched frame in a 9k course-lab window (`photo=`), and `glow` uses a transparent cutout (`cut=`). Both are kept as alternates |
| `title` | Lines split by `\|`; `[ ]` marks green words |
| `sub` | Subtitle; `[ ]` marks only those words, otherwise the whole line is marked |
| `tag` | The pill text, such as `#AI` |
| `hero` | The Codex image |
| `hf` / `hb` | The fade height over the hero's top (default 900, house value 720) and the hero's bottom offset |
| `art` | An optional transparent story object |
| `prompt` | An optional mono line at the bottom |

## Covers without a person

When a reel has no presenter, such as a screen recording or product demo, use a 9k character as `art=` (from 9k.school's `public/team/`: `nino.webp` for help or guidance, `khuloud-code.webp` for coding, `chai-gp-tea.webp` for AI chat, `abdelrahman-ismail.webp` for personal or learning topics), or use a course illustration. Keep the same template, background and type. Keep each character's original illustrated style, and never invent one from a filename alone.

## Quality checklist

- [ ] The title is in the script's language, punchy, two lines, with green words chosen on purpose
- [ ] All text was rendered by `cover.html` with the real fonts; the AI drew no text
- [ ] The hero is clearly the real person from the video, relit, with no artifacts
- [ ] The exact brand green and orange are visible
- [ ] Everything important sits inside the 3:4 grid crop (y 240–1680)
- [ ] The output is a 1080×1920 PNG that looks like it belongs next to `templates/examples/` on the grid
