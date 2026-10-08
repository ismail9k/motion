# Install

This guide gets `9k-motion` and `9k-montage` running in your coding agent. It takes about 10 minutes, most of it waiting for downloads.

**You need an agent with a shell.** The skills write code, render it in a headless browser, run ffmpeg and look at the frames they produced. Claude Code, Codex and other terminal agents can do that. The Claude chat apps (claude.ai, Claude Desktop chat) cannot render, so the skills won't work there.

## 1. Install the tools

macOS with [Homebrew](https://brew.sh):

```bash
brew install node ffmpeg whisper-cpp
```

On Linux, install Node 20+ and ffmpeg from your package manager, and build [whisper.cpp](https://github.com/ggml-org/whisper.cpp) so `whisper-cli` is on your `PATH`. On Windows, use WSL.

| Tool | Needed by | What it does |
|---|---|---|
| Node 20+ and npm | both | Runs the render scripts. Each new project installs Playwright, Chromium and the IBM Plex fonts itself |
| `ffmpeg` / `ffprobe` | both | Encodes frames to MP4, mixes audio, makes the review contact sheets |
| `whisper-cli` | 9k-montage | Transcribes your footage word by word for cuts and captions |

Optional extras:

```bash
# Beat-sync a music track you supply (9k-motion)
pip install numpy librosa soundfile

# Download a reference video from a link (see references.md)
brew install yt-dlp
```

Arabic text uses the Thmanyah fonts if they're installed, and IBM Plex Sans Arabic otherwise.

## 2. Download a whisper model (9k-montage only)

9k-montage looks for a multilingual model in `~/.cache/hyperframes/whisper/models/`. `large-v3-turbo` is the best balance of speed and accuracy (about 1.6 GB):

```bash
mkdir -p ~/.cache/hyperframes/whisper/models
curl -L -o ~/.cache/hyperframes/whisper/models/ggml-large-v3-turbo.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

Skip this if you only want motion graphics.

## 3. Add the skills

With the [Skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add ismail9k/motion
```

It asks which skills to install and which agents to install them for. Pick **both skills**: 9k-montage copies its engine and brand files from 9k-motion, so it fails on its own.

To install both for Claude Code, for every project, without the prompts:

```bash
npx skills add ismail9k/motion -g -y --skill '*' -a claude-code
```

`-g` installs them at user level, so they work in any folder. Leave it out to install into the current project only.

To change the skills yourself, clone the repo and link it instead, so your edits apply immediately:

```bash
git clone https://github.com/ismail9k/motion && cd motion
ln -sfn "$PWD/skills/9k-motion" ~/.claude/skills/9k-motion
ln -sfn "$PWD/skills/9k-montage" ~/.claude/skills/9k-montage
```

## 4. Set up the model

The course this skill is built on ([why it works](course.md)) recommends the strongest model at high effort for new work. In Claude Code:

```bash
claude --model claude-opus-5-5
```

Then use `/model` to set the effort: **xhigh** for a new film, **max** when the first seconds have to carry a launch, **medium** for small fixes and re-renders.

## 5. Check it works

In your agent, ask for something small:

```text
Make a 10-second title card that says "Hello" for a YouTube video.
```

or type `/9k-motion`. The skill should start with a questionnaire: three short rounds about format, sound, references and content. That's the sign it loaded. Answer them, and the first thing it builds is a shot list for you to approve.

For 9k-montage, hand it a video: `do the montage for ~/Videos/take-1.mov`, or type `/9k-montage`.

9k-montage creates its projects in `~/films/` by default.

## Troubleshooting

| Problem | Fix |
|---|---|
| The skill doesn't trigger | Run `npx skills list` to confirm it's installed for your agent, then restart the agent. Typing `/9k-motion` always works |
| `9k-montage` can't find `9k-motion/templates/lib` | Install both skills, side by side in the same skills folder |
| `No whisper model in ~/.cache/hyperframes/whisper/models` | Do step 2 |
| `whisper-cli: command not found` | Install whisper.cpp (step 1) and open a new terminal |
| Playwright or Chromium errors on the first render | In the project folder, run `npx playwright install chromium` |

Next: [find references on whatships.com](references.md).
