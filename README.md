# Media skills

Agent skills for making video and images: motion graphics, full edits of your own footage, and Instagram Reel covers. They ship as two Claude Code plugins.

| Plugin | Skill | Input | Output |
|---|---|---|---|
| `9k-video` | [`9k-motion`](plugins/9k-video/skills/9k-motion/SKILL.md) | A brief: segment, promo, title card, end card | A motion film built from code. It starts with a questionnaire and asks for references |
| `9k-video` | [`9k-montage`](plugins/9k-video/skills/9k-montage/SKILL.md) | **A video of you**: raw takes or a rough cut | The edited montage: tightened cut, jump-cut punch-ins, word-by-word Arabic/English captions, 9k graphics timed to the words, SFX, −14 LUFS, end card. There is one plan gate and no questionnaire |
| `reel-covers` | [`reel-cover-generator`](plugins/reel-covers/skills/reel-cover-generator/SKILL.md) | A reel script | A 9:16 cover image: agreed title and subtitle, bold editorial tech style. [Full guide](docs/reel-cover-generator.md) |

`9k-video` styles every frame from the 9k design system (design.the9klabs.com): colors, type, the Ismail9k → 9k wordmark, Nino. Install it to make 9k content, not as a general-purpose motion kit.

## Install

Both plugins are listed in the [`ismail9k/skills`](https://github.com/ismail9k/skills) marketplace:

```
/plugin marketplace add ismail9k/skills
/plugin install 9k-video@ismail9k
/plugin install reel-covers@ismail9k
```

For Codex and other agents, use the [Skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add ismail9k/media-skills --skill reel-cover-generator
```

To hack on the skills, clone the repo and link them, so edits take effect immediately:

```bash
git clone https://github.com/ismail9k/media-skills && cd media-skills
ln -sfn "$PWD/plugins/9k-video/skills/9k-motion" ~/.claude/skills/9k-motion
ln -sfn "$PWD/plugins/9k-video/skills/9k-montage" ~/.claude/skills/9k-montage
ln -sfn "$PWD/plugins/reel-covers/skills/reel-cover-generator" ~/.claude/skills/reel-cover-generator
```

`9k-montage` copies its engine and brand files from the sibling `9k-motion/templates/lib`, so keep both skills together.

## Requirements

**9k-video**
- Node 20+ and npm (each project installs Playwright + Chromium and the IBM Plex fonts on scaffold)
- `ffmpeg` and `ffprobe`
- For 9k-montage: `whisper-cpp` (`whisper-cli`) with a multilingual ggml model in `~/.cache/hyperframes/whisper/models/`
- Optional: Python 3 with `numpy librosa soundfile` for beat-syncing a supplied music track
- Optional: the Thmanyah fonts for Arabic (otherwise IBM Plex Sans Arabic is used)

**reel-covers**
- Image generation: built into Codex; Claude Code and Claude Desktop need [Gemini MCP](docs/reel-cover-generator.md#configure-gemini-mcp). Without it, the skill still writes the image prompt for you to use elsewhere.

## Use

- Ask for a motion graphic, or type `/9k-motion`
- "Do the montage for <video>", or type `/9k-montage`
- Drop a reel script and ask for a cover, or type `/reel-cover-generator`
- By hand: `bash plugins/9k-video/skills/9k-motion/scripts/new-film.sh ~/films/my-film`, or `bash plugins/9k-video/skills/9k-montage/scripts/new-montage.sh <video>`, then follow the house rules in the generated `CLAUDE.md`

Film and montage projects are scaffolded into `~/films/` by default. A `films/` folder in this repo is ignored by git.
