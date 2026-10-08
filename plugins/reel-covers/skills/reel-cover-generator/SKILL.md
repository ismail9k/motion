---
name: reel-cover-generator
description: Generate Instagram Reel cover images (9:16 portrait format) from a script or video. Use when the user provides reel content and wants a cover or thumbnail, including requests for "غلاف الريل", "cover للسكريبت", or "reel cover". Analyze the content, agree on a title and subtitle, then create a bold editorial tech cover with a prominent subject and one topic-specific visual cue.
---

# Reel Cover Generator

Generate professional, branded Instagram Reel cover images for tech content. The cover must be 9:16 portrait orientation, visually striking, and match the mood/topic of the provided script.

**Default cover direction — based on an approved reel cover:**
- Make the title the hero: oversized, heavy, dark lettering across the upper third, usually in two compact lines. Use a warm cream or off-white field and a short brand-orange highlight stroke behind or beneath part of the title. Keep the face and title clear of Instagram's likely UI overlays.
- Set a smaller, bold subtitle immediately below in brand green. Keep a strong size difference between title and subtitle.
- When a person reference exists, make their recognizable face and upper body dominate the lower half. Use warm, believable studio lighting, a natural expression or gesture, and a clean cutout blended into a softly blurred environment. Preserve distinctive clothing or equipment when useful to the story.
- Add **one** supporting story object beside the person: a simplified, slightly tilted email card, product panel, device, diagram, or visual metaphor drawn from the actual script/reference. It should read at thumbnail size without tiny UI text. A few restrained brand-orange sparks or one pixel-style pointer can add energy when relevant.
- When there is room, tuck one small voxel or pixel-art potted plant into a far background corner, like the approved cover. Keep it softly lit and secondary to the title, subject, and story object.
- Keep the composition spacious and legible: no screenshot collage, generic neon circuit background, or scattered decorative icons. Adapt the supporting object to each reel; do not copy a previous cover's PostHog/astronaut imagery into unrelated topics. If the user requests another visual style, follow that request.

**9K Labs brand colors — required:**
- Brand green: **#166434** (`--primary-color`). Brand orange: **#E85A02** (`--accent-color`). These are the exact values published in the [9k Design System color tokens](https://design.the9klabs.com/#tokens-color-brand).
- Include both colors visibly in every generated cover and name both hex values explicitly in every image-generation prompt. A reliable treatment is an orange title highlight plus a green subtitle or supporting graphic. Keep enough contrast for the title and subtitle to read at phone size.
- Other theme colors may supplement this pair, but must not replace or recolor the brand orange and green. Use the site's dark ink **#0A111A** or white **#FFFFFF** when useful for contrast.

**Existing 9K Labs character references:**
- These are optional brand assets, not a requirement to place a mascot on every cover. Use at most one when it fits the reel. When the `9k.school` project is available, find the file under its `public/team/` directory and pass the actual image as a reference. Otherwise use a user-provided copy or ask for the relevant file. Preserve each character's identity, silhouette, colors, facial details, black outlines, lightly grainy print texture, and cream sticker-like cutout edge.
- `public/team/abdelrahman-ismail.webp` — illustrated human holding a book, green shirt; useful for a personal or learning-led cover.
- `public/team/chai-gp-tea.webp` — rounded blue robot holding tea, mint facial details; useful for AI or conversational topics.
- `public/team/khuloud-code.webp` — orange blocky robot with a pixel-like silhouette; useful for coding or builder topics.
- `public/team/nino.webp` — green blocky robot with a headset; useful for help, guidance, or support topics.
- The set mixes hand-drawn illustration with voxel/pixel geometry; do not force every character into identical voxels. A chosen character may be the lower-half hero when there is no presenter photo, or a small supporting accent beside a real presenter. When beside a presenter, let the character serve as the supporting story cue instead of adding another competing object. Keep the title and main person visually dominant. Do not invent a replacement character from a filename alone.

**Language rules — important:**
- **All communication with the user is in English.** Every question, confirmation, and status update you write to the user must be English, regardless of the script's language.
- **The generated title/subtitle follow the script's language.** If the script is Arabic, titles are Arabic (Egyptian dialect where natural). If English, titles are English. The *cover text* matches the script; the *conversation* stays in English.

**Brand typography — required:**
- Use **Thmanyah Serif Display Black (900)** for the main title.
- Use **Thmanyah Sans Bold (700)** for the subtitle and supporting text.
- Preserve correct Arabic shaping, ligatures, diacritics, and right-to-left order. Never transliterate or alter the approved title to work around a rendering problem.
- Name the font families explicitly in every image-generation prompt. If the official Thmanyah OTF files are available locally, prefer exact post-generation typesetting with those files over relying on the image model to imitate the font.
- Do not bundle, upload, host, or redistribute the font files. If exact local typesetting is needed and the fonts are unavailable, ask the user to download them from `https://font.thmanyah.com/` and provide the local file paths.

---

## Workflow (follow in order)

### Step 1 — Analyze the Script

Read the provided script carefully and produce:

1. **Detected language** — Arabic, English, or mixed (name the dominant language).
2. **Summary** — a concise 2–3 sentence summary of what the script is about, its angle, and its tone.
3. **Theme/Mood** — choose ONE theme key from the reference table below that best matches the topic and mood.

Present this analysis to the user in English as a compact block, e.g.:

> **Script analysis**
> • Language: Arabic (Egyptian dialect)
> • Summary: A quick explainer about why Claude hits usage limits and how context windows affect cost. Tone: casual, slightly frustrated.
> • Suggested theme: `ai-futuristic` — fits the LLM / usage-limit topic

Then move on to Step 2 (titles).

#### Theme Reference

Use these themes to choose the subject motif and mood within the default cover direction. A dark or split background can replace the warm cream field when it genuinely serves the topic, while retaining the large-title / clear-subtitle / strong-subject hierarchy and both brand colors.

| Theme | When to use | Visual style |
|-------|-------------|--------------|
| `ai-futuristic` | AI tools, LLMs, future tech | One luminous AI interface or abstract model object; blue/violet accent |
| `cybersecurity` | Hacking, data leaks, privacy, threats | One warning, breach, or shield motif; dark red accent |
| `breaking-news` | Announcements, releases, shocking facts | Strong headline treatment and a red/orange urgency accent |
| `vs-comparison` | Tool comparisons, A vs B content | Two clear opposing objects or tones; uncluttered versus cue |
| `educational` | Explainers, how-it-works, tutorials | Bright, clean interface card or simple diagram; playful details if appropriate |
| `opinion-hot-take` | Opinions, controversial takes, debates | Expressive subject and restrained sparks or flame accent |
| `weekly-recap` | Weekly AI/tech roundups | Editorial cover with a small, organized set of topic objects |

### Step 2 — Suggest 3 Titles

Generate **3 distinct title options** based on the script and its detected language. Titles must be in the script's language (Arabic titles for Arabic scripts, English titles for English scripts). Keep each 3–8 words, punchy, and thumbnail-legible.

Present them to the user in English:

> **Pick a title** (or type your own):
> 1. "Claude بيقولك لا؟ عرفت ليه"
> 2. "ليه Claude بيوقفك فجأة"
> 3. "حدود Claude اللي محدش بيقولك عليها"
>
> Reply with a number to pick one, or send your own title.

Wait for the user's choice. Accept either:
- A number (1, 2, or 3) → use that suggestion
- A custom title → use it verbatim

### Step 3 — Suggest 3 Subtitles

Generate **3 subtitle options** aligned with the chosen title and script. Subtitles can be short category labels, tool names, or supporting phrases. They can be in English even when the title is Arabic (mixed is fine and common for tech covers).

Present them to the user in English:

> **Pick a subtitle** (or skip it):
> 1. "Usage Limits Explained"
> 2. "Context Window Deep Dive"
> 3. "AI News"
>
> Reply with a number, send your own, or say "skip" to leave the cover without a subtitle.

Wait for the user's choice. Accept:
- A number (1, 2, or 3)
- A custom subtitle
- "skip" / "no subtitle" / "none" → proceed with no subtitle

### Step 4 — Build the Image Generation Prompt

Construct a detailed image generation prompt using this template, filling in the dynamic parts:

```
Portrait Instagram Reel cover, 9:16 aspect ratio, ultra high quality.

LAYOUT:
- Upper third: render exactly [TITLE in <language>] in two compact lines where possible, oversized and [ALIGNMENT], with plenty of clear space around the letters.
- [If present: place exactly SUBTITLE directly beneath the title, much smaller but still bold and readable.]
- Lower half: if a person reference is provided, feature their recognizable face and upper body large in frame, with a natural expression/gesture and believable studio light. Blend them into a softly blurred setting.
- Beside the hero, add one clear, slightly angled [SCRIPT-SPECIFIC STORY OBJECT] taken from the script or supplied assets. If neither a presenter nor a brand character is used, make a relevant product/context object the hero of the lower half.
- If a 9K Labs character fits this reel, use [ONE SELECTED CHARACTER REFERENCE] as a faithful supporting accent or, when there is no presenter photo, as the lower-half hero. Preserve its distinctive illustrated/sticker style. If it accompanies a presenter, let it replace the story object rather than adding both. Omit this instruction when no character fits.
- If the scene has room, include one small blocky voxel/pixel-art potted plant in a distant corner as a quiet recurring background detail; it must not compete with the title or subject.
- Maintain a clean thumbnail silhouette and safe margins; avoid a dense collage or tiny interface text.

VISUAL THEME: [Insert theme-specific motif from Step 1 table above]. Use exact 9K Labs brand green #166434 and brand orange #E85A02 visibly. Default to warm cream/off-white, dark ink #0A111A lettering, a short #E85A02 title highlight, and a #166434 subtitle or supporting graphic. Theme colors may supplement these; do not replace or recolor the brand pair.

REFERENCE IMAGE INTEGRATION:
- Preserve a referenced person's likeness, useful clothing/equipment, and important visual details of a base image.
- Simplify screenshots into one legible card or object; remove incidental text and UI chrome unless explicitly requested.
- Match lighting, perspective, and color so the elements belong in one scene.
- Keep chosen character art recognizable and its original hand-drawn or voxel form intact; do not turn it into a generic 3D mascot.
- Use a few restrained #E85A02 sparks or one pixel pointer only if they support the topic.

TYPOGRAPHY:
- Title: Thmanyah Serif Display Black (900), bold display treatment — [ALIGNMENT]
- Subtitle: Thmanyah Sans Bold (700), smaller than the title
- Render the specified title and subtitle verbatim with correct Arabic shaping, ligatures, diacritics, and right-to-left order
- Keep the text sharp and legible at mobile thumbnail size; prefer #0A111A type on the warm light field. Use a restrained shadow only when contrast requires it.

OVERALL FEEL: Bold editorial tech creator cover, warm and playful, with cinematic portrait lighting and one instantly understandable story cue. Eye-catching at mobile thumbnail size.

Do NOT add watermarks, logos, or text other than what's specified.
```

Replace `[TITLE]`, `[SUBTITLE]`, `[SCRIPT-SPECIFIC STORY OBJECT]`, `[ONE SELECTED CHARACTER REFERENCE]`, `[VISUAL THEME]`, `<language>`, and `[ALIGNMENT]` with actual values for this script:

- `<language>` → the language detected in Step 1 (e.g. `Arabic` or `English`).
- `[ALIGNMENT]` → `right-aligned` for Arabic titles, `left or center aligned` for English titles.

If the user skipped the subtitle in Step 3, remove the subtitle line entirely from the LAYOUT section — do not leave a placeholder. Remove the character line when no character fits; remove the separate story-object line when the character fills that role. Any story object must come from this reel's content, not from the example cover.

### Step 5 — Present the Final Prompt for Review

**Do not generate the image yet.** Show the fully constructed prompt to the user inside a fenced code block so it's easy to copy, and ask how they want to proceed:

> **Here's the final prompt:**
>
> ```
> <full constructed prompt>
> ```
>
> You can either:
> 1. **Copy this prompt** and use it with another image generation agent/tool
> 2. **Continue with me** — I'll generate the cover for you
>
> Which would you like?

Wait for the user's response.
- If they choose option 1 (copy / use elsewhere) → acknowledge and stop. Do not call any generation tool.
- If they choose option 2 (continue here) → proceed to Step 6.

### Step 6 — Request Required Assets

Only enter this step if the user chose to continue here in Step 5.

Use at least one reference image. The user can provide either a person image or another base image. Extra assets are optional but recommended. If the user already supplied a video with a usable on-screen person or product, extract a clean still and use that as the reference image; there is no need to ask for a separate image. A relevant, accessible character file listed above can also serve as the reference. Ask for an image only when no usable reference is available.

**If working in Codex:** the user can paste, copy, upload, or attach the image directly in the chat. They can also provide absolute file paths if that is easier.

**If working in Claude with Gemini MCP:** ask for absolute file paths to the reference assets — every run, no caching, no auto-pickup, no inline uploads. `gemini:generate_image` needs real `filePath` values on disk.

If a reference is needed, prompt the user in English, adapting the first line to the current environment:

Codex:

> Great! Before I generate, send at least one reference image. You can paste or attach it directly here, or send an absolute file path if you prefer:
>
> - **Person image:** a clear portrait or half-body photo if you want a person in the cover
> - **Base image:** a screenshot, product image, app UI, or scene you want the cover to build around
>
> You can also add extra assets, like logos, screenshots, device mockups, charts, or UI captures. The more relevant assets you provide, the better I can include them in the cover and produce a stronger result.

Claude/Gemini:

> Great! Before I generate, send the **absolute file path** to at least one reference image:
>
> - **Person image:** a clear portrait or half-body photo if you want a person in the cover
> - **Base image:** a screenshot, product image, app UI, or scene you want the cover to build around
>
> You can also send extra asset paths, like logos, screenshots, device mockups, charts, or UI captures. The more relevant assets you provide, the better I can include them in the cover and produce a stronger result.
>
> 💡 **Tip — copy a file's path quickly:**
> - **macOS:** select the file in Finder, then press **Cmd + Option + C**
> - **Windows:** select the file in Explorer, then press **Ctrl + Shift + C**
>
> Paste the path or paths here and I'll take it from there.

Proceed to Step 7 once a supplied image or extracted video still is ready. If neither is available, wait for the user to provide a reference image.

- In Codex, accept pasted/copied/uploaded/attached images directly, or accept absolute file paths.
- In Claude/Gemini, do **not** accept inline image uploads for generation. If they attach an image inline, ask them to save it locally and send the absolute path. If they point to a folder instead of a file, ask them to pick specific images. Do not proceed until at least one path is in hand.

### Step 7 — Generate the Cover

#### Codex

Use Codex's image generation/editing capability with the final prompt and the user-provided reference image assets. If the user pasted or attached images directly, use those images as references; do not ask for file paths again.

#### Claude/Gemini

Use `gemini:generate_image`, NOT `gemini:edit_image`. This is critical:

- `generate_image` supports `aspectRatio: "9:16"` — required for Reels.
- `edit_image` has **no** `aspectRatio` parameter; its output ratio follows the input reference image, which breaks the 9:16 requirement when the user uploads a square or landscape asset.

The person photo, base image, and any extra assets go in as **reference images** to guide the generation, while the prompt + aspect ratio fully control composition.

#### Call

```
gemini:generate_image
  prompt:       <constructed prompt from Step 4>
  aspectRatio:  "9:16"
  images:       [{ "filePath": "<real absolute path to reference image>" }, { "filePath": "<optional extra asset path>" }]
  outputPath:   "<real absolute path>/reel-cover-<topic-slug>.png"   # optional
```

Notes on the `images` parameter:
- The schema accepts `filePath` directly — the server reads the file itself, bypassing the MCP transport limit. You do **not** need to base64-encode or call `load_image_from_path` first.
- `mimeType` is auto-detected from `filePath`, so you can omit it.
- If an asset path is very large or transient, base64 `data` + `mimeType` also works but is subject to MCP transport size limits.

If `outputPath` is omitted the server saves to its configured `GEMINI_IMAGE_OUTPUT_DIR` (or its built-in default) with an auto-generated name — providing an explicit path keeps the file findable.

#### Iteration / refinement turns

When the user asks for tweaks ("make the title red", "different background"), regenerate with an updated prompt and the **same reference image assets** unless the user provides replacements.

- In Codex, use the same pasted/attached images or file-path references from the previous generation.
- In Claude/Gemini, call `gemini:generate_image` again. Do not switch to `edit_image` for refinements — the 9:16 ratio must be preserved.

### Step 8 — Present & Offer Iteration

After generating:
1. Show the generated image
2. Display the final title, subtitle, and theme used
3. Offer refinements **in English**:

> How's the cover? If you want to tweak anything — colors, title, visual effect, person placement, or asset placement — just say the word and I'll regenerate.

---

## Quality Checklist

Before presenting the final image:
- [ ] Title is short, punchy, and matches script topic
- [ ] Theme matches the script's mood
- [ ] Exact brand green #166434 and orange #E85A02 are both visible
- [ ] Person image, base image, and extra assets are naturally integrated where provided
- [ ] Oversized headline, smaller subtitle, and prominent subject remain legible at phone size
- [ ] One topic-specific supporting object tells the story without tiny UI copy or a crowded collage
- [ ] Any selected brand character retains its original identity and art style; the voxel plant, if present, stays a subtle background detail
- [ ] 9:16 portrait ratio
- [ ] Title uses Thmanyah Serif Display Black (900); subtitle uses Thmanyah Sans Bold (700)
- [ ] Arabic shaping and right-to-left order are correct
- [ ] Text is legible at small sizes

---

## Example Titles by Theme

### Arabic

| Script topic | Theme | Generated title | Subtitle |
|---|---|---|---|
| Claude usage limits | `ai-futuristic` | "Claude بيقولك لا؟ عرفت ليه" | "Usage Limits Explained" |
| NVIDIA GTC announcement | `breaking-news` | "NVIDIA غيرت قواعد اللعبة" | "GTC 2025" |
| OpenAI vs Gemini | `vs-comparison` | "مين أحسن؟ الحقيقة اللي محدش بيقولها" | "OpenAI vs Gemini" |
| Cybersecurity breach | `cybersecurity` | "اتهكر بدون ما تعرف 🚨" | "تحذير أمني" |
| Weekly AI recap | `weekly-recap` | "أهم أخبار الـAI الأسبوع ده" | "AI Weekly" |
| How transformers work | `educational` | "الـAI بيفكر إزاي؟ الحقيقة جوا" | "Deep Dive" |
| Controversial AI take | `opinion-hot-take` | "رأيي في الـAI هيزعلك" | "رأي صريح" |

### English

| Script topic | Theme | Generated title | Subtitle |
|---|---|---|---|
| Claude usage limits | `ai-futuristic` | "Why Claude Said No To Me" | "Usage Limits Explained" |
| NVIDIA GTC announcement | `breaking-news` | "NVIDIA Just Changed Everything" | "GTC 2025" |
| OpenAI vs Gemini | `vs-comparison` | "The Truth Nobody Tells You" | "OpenAI vs Gemini" |
| Cybersecurity breach | `cybersecurity` | "You Got Hacked and Don't Know It 🚨" | "Security Warning" |
| Weekly AI recap | `weekly-recap` | "This Week in AI — Big Moves" | "AI Weekly" |
| How transformers work | `educational` | "How AI Actually Thinks" | "Deep Dive" |
| Controversial AI take | `opinion-hot-take` | "My AI Take Will Upset You" | "Hot Take" |
