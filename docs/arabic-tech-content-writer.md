# Arabic Tech Content Writer

Arabic short-form content writing skill for educational tech videos, reels, TikToks, and YouTube Shorts.

This skill helps an assistant write conversational Arabic scripts about AI, programming, cybersecurity, developer tools, and technology trends. It is tuned for 1-2 minute videos with a strong hook, simple technical explanation, natural pacing, and an engagement-focused ending.

It now supports platform-specific adaptation and multiple script variants, so the same idea can be shaped differently for Instagram Reels, TikTok, YouTube Shorts, or LinkedIn.

## What It Produces

The skill always returns content in this structure:

```markdown
## النص

[Full Arabic video script]

## الوصف

[Short Arabic video description]

## الهاشتاجات

[Relevant Arabic and English hashtags]
```

The writing style blends Egyptian Arabic with Modern Standard Arabic, keeps technical terms like `AI`, `API`, `Framework`, and product names in English when useful, and uses pauses, rhetorical questions, examples, and light humor to keep the script natural on camera.

When you ask for variants, it returns separate versions with different angles, such as urgent warning, contrarian opinion, practical tutorial, story/news, funny/relatable, or comparison.

## Best For

- AI model or product announcements
- Cybersecurity and privacy warnings
- Programming and developer tool explainers
- Comparisons between tools such as ChatGPT, Claude, Gemini, Python, or JavaScript
- Opinion pieces about technology, AI ethics, learning, and the future of programming
- Trend-driven social content for Instagram Reels, TikTok, and YouTube Shorts
- Platform-specific versions for Reels, TikTok, YouTube Shorts, and LinkedIn
- Multiple hooks or script variants for A/B testing content angles

## Files

All in [`plugins/arabic-tech-content/skills/arabic-tech-content-writer/`](../plugins/arabic-tech-content/skills/arabic-tech-content-writer/):

- `SKILL.md` - Main skill instructions, output format, tone rules, writing process, and quality checklist.
- `references/script_patterns.md` - Reusable Arabic tech script patterns, phrase library, structure guidance, and hashtag strategy.
- `references/example_scripts.md` - Example scripts organized by content type.

## Installation

**Claude Code**, as a plugin:

```
/plugin marketplace add ismail9k/skills
/plugin install arabic-tech-content@ismail9k
```

**Codex and other agents**, via the Skills CLI:

```bash
npx skills add ismail9k/media-skills --skill arabic-tech-content-writer
```

Restart your agent or reload skills after installing so it discovers the skill.

The skill writes the script; [`reel-cover-generator`](reel-cover-generator.md) can then make its cover.

## Usage

Ask for a short Arabic script and include the topic, platform, and any angle you want.

Example prompts:

```text
اكتبلي سكريبت Reel عن خطورة مشاركة صورك مع تطبيقات AI.
```

```text
Create a 1-minute Arabic YouTube Short script about Claude Code and why developers use it.
```

```text
اكتب سكريبت قصير يقارن بين ChatGPT و Gemini و Claude للمبرمجين.
```

```text
اكتبلي 3 نسخ مختلفة لنفس الفكرة: نسخة تحذيرية، نسخة مضحكة، ونسخة عملية.
```

```text
Turn this topic into a LinkedIn-style Arabic short script, then make a punchier TikTok version.
```

For stronger results, include:

- The target audience
- The target platform
- The desired tone
- The number of variants or hooks you want
- Any facts, links, or announcements that must be included
- Whether the content should feel urgent, educational, funny, opinionated, or practical

## Quality Checklist

Before using the final script, make sure it:

- Opens with a hook that creates curiosity in the first 5 seconds
- Matches the requested platform
- Uses a clear angle and retention loop
- Explains the technical idea clearly without sounding like a lecture
- Uses natural spoken Arabic
- Includes specific details, examples, or numbers where possible
- Has a clear ending that asks the audience to comment, think, or take action
- Includes a compelling description and relevant Arabic/English hashtags
- Makes each variant meaningfully different when variants are requested

## Notes

For current news, vulnerabilities, product launches, pricing, model names, or fast-changing technical claims, verify the facts before generating the script. The skill provides the writing structure and voice, but factual accuracy still depends on the source material.
