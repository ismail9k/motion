# The course behind the skill

9k-motion is built on one article: **[How to build motion design studio with Opus 5.5 (Full-course)](https://x.com/0xMovez/status/2104216919033192746)** by Movez ([@0xMovez](https://x.com/0xMovez)), published September 27, 2026. Read it. It's the clearest explanation of why some AI motion videos look like a studio made them and most look the same.

Its core idea is that the prompt is only a small part of a good film. The rest is the harness around the model: a render engine, a reference, a spec, sound on a beat grid, and a loop where the model looks at its own frames and fixes them. The article teaches that harness in 12 steps. This skill packages the whole harness, so you get it by asking for a film.

## How the 12 steps map to the skill

You don't need to do any of these by hand. This table shows where each one lives, so you know what the agent is doing and where to look when you want to change it.

| Course step | What it teaches | Where the skill does it |
|---|---|---|
| **01 Pixels** | The model writes a program, not a video. A `seek(t)` function paints any moment, a headless browser screenshots it, ffmpeg encodes it | The engine in `templates/`: `index.html` with `window.seek(t)`, and `render.mjs` |
| **02 Setup** | Install the tools and give the project house rules | [install.md](install.md), and `scripts/new-film.sh`, which copies the engine, fonts and a house-rules `CLAUDE.md` into each project |
| **03 One-liner** | The famous "showreel" prompt: great for testing the engine, empty of ideas | Replaced by the questionnaire, which collects the idea before any code |
| **04 Brand** | Point it at a real product and use real screenshots, never redrawn UI | The *Product promo* branch asks for your URL; the skill captures the real UI with Playwright |
| **05 Reference** | Name a look and feed it a frame or a video; take its grammar, not its content | Round 3 always asks for references and writes `docs/style_guide.md` from them. See [references.md](references.md) |
| **06 Spec** | Write the state list beat by beat, not a vibe | `docs/shotlist.md` on the beat grid, the one approval gate. The *UI morph loop* structure is the course's one-shape pattern |
| **07 Engine** | Build the deterministic renderer, with motion blur from subframes | `templates/render.mjs` (`--sub` blends subframes, `--alpha` renders overlays) and `stills.mjs` |
| **08 Springs** | Closed-form springs for motion with weight; one spring per target change | `lib/motion.js`, tuned to the 9k motion language in `references/brand.md` |
| **09 Sound** | Measure a supplied track's beats, or synthesize music and SFX on the same timeline | `lib/beats.py`, `lib/audio.mjs`, and `scripts/mux.sh`, which mixes to −14 LUFS |
| **10 Overnight** | A director's brief for long films: logline, references, beat sheet, gates, deliverables | `docs/brief.md` filled from your answers; the brief pattern for long films is in `references/engine.md` |
| **11 Critique** | Make the model look at contact sheets, score them and fix the worst problems | `scripts/review.sh` builds the sheets; the skill scores them and repeats until every score is 8 or higher |
| **12 Ship** | Every format from one timeline, and package the pipeline as a skill | Each format is laid out and rendered separately, never cropped. And this repo is that skill |

## What the skill adds

- **One brand.** The course leaves look and color to you. This skill takes every color, font, radius and easing from the [9k identity](identity.md), and references only set pacing and camera.
- **A questionnaire.** Three short rounds replace the long prompt. You answer, it writes the brief.
- **9k-montage.** The course covers films made from scratch. 9k-montage applies the same engine to editing your own footage: cuts, captions, graphics timed to your words, and sound.

## How to read the article

- **Part 1 (steps 01–02)** and **Part 3 (07–09)** explain what the agent is doing while it works. Read them when a render surprises you.
- **Part 2 (03–06)** makes your questionnaire answers better, especially step 05 on references and step 06 on writing a state list.
- **Part 4 (10–12)** matters for long or flagship films, and if you want to build a skill of your own.
- The end of the article links the repos and prompt libraries it draws on. They're worth browsing for references and techniques.

Back: [Install](install.md) · [Finding references](references.md) · [The 9k identity](identity.md)
