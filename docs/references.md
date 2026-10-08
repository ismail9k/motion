# Finding references on whatships.com

Every 9k-motion film starts with a questionnaire, and its third round always asks for **references**. A reference is the biggest single upgrade you can give it: without one, an AI motion film drifts toward the same default look (centered title, gradient, everything fading in). With one, it copies a real film's pacing, transitions and camera.

[whatships.com](https://whatships.com) is the best free place to find them: a curated, daily-updated gallery of product launch videos posted on X by startups and studios.

## What a reference is for

The skill splits the work clearly:

| The reference sets | 9k sets (always) |
|---|---|
| Pacing and shot lengths | Colors |
| Transitions and camera moves | Fonts and type |
| How text enters and exits | Shapes, radii, shadows |
| Composition and rhythm | Easing (springs) |

So pick references for **how they move**, not how they look ([what 9k sets](identity.md)). A film with the wrong colors is fine; the skill restates everything in 9k tokens. It takes the grammar of a reference, never its content, logos or characters.

## Find one

1. Open [whatships.com](https://whatships.com) and filter by category. **Motion** and **Design** are the richest for motion graphics; **Developer Tools** and **AI** are full of product launch films with UI.
2. Match the length and format you're making. Each card shows the duration. A 15-second sting and a 2-minute launch film have different rhythm, so pick something close to your length.
3. Open the entry. Its page shows the product, category, duration and tags, a **View on X** link to the original post, and a row of similar launches, which is a fast way to find 2–3 films in the same style.
4. Watch it a few times and name what you want from it, in a few words: "the cursor driving each UI change", "hard cuts on every beat", "the type that scales up from the center then snaps left".

One strong reference beats five vague ones. Two or three is the most that helps.

Also good: [whatships.com/studios](https://whatships.com/studios/) lists studios whose launch films are worth studying, and [whatships.com/tools](https://whatships.com/tools/) lists motion tools, mockup tools and other agent skills.

## Hand it to the skill

When round 3 asks for references, give the skill one of these, best first:

**A video file.** The skill extracts frames itself and studies them shot by shot. With [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) you can save a public X post's video for private reference:

```bash
yt-dlp -o ~/refs/launch.mp4 "https://x.com/<account>/status/<id>"
```

**Screenshots.** Pause on 2–4 frames that show the look you want and save them. Good when you want one specific moment, such as a title layout or a transition mid-way.

**The link.** Paste the whatships or X link. The agent needs `yt-dlp` installed to pull the video down, so a file is more reliable.

Then say what to take and what to leave. For example:

```text
1. References:
   - ~/refs/launch.mp4 (from whatships.com/videos/<slug>/). Take the pacing: a cut on every
     beat, and the cursor driving each UI change. Ignore the purple gradient and the 3D logo.
   - ~/refs/title.png. Take how the headline sits: huge, left-aligned, cropped by the frame edge.
```

No reference is a valid answer too: say "none", and the 9k house style becomes the reference.

## Use them fairly

References are for studying, the way a designer keeps a mood board. Keep downloaded clips private, don't put other people's footage, logos or characters into your film, and credit the original if you share how you made yours.

Back: [Install](install.md) · Next: [the course behind the skill](course.md)
