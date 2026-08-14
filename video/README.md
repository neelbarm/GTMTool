# Highlight reel

Drop in your photos and videos, get back a finished MP4 you can text her.

It handles mixed portrait/landscape media automatically — every shot sits over a
blurred version of itself, so nothing gets cropped and nothing sits on black bars.
Photos get a slow push-in, videos play as-is, and everything crossfades.

---

## First time (about five minutes)

**1. Install Node.js** if you don't have it — <https://nodejs.org> (get the LTS button).

**2. Open Terminal** and go into this folder:

```bash
cd path/to/video
npm install
```

That's the setup done. You never have to do it again.

---

## Making the video

**1. Put your photos and videos in `public/media/`.**

Anything works: `.jpg` `.png` `.heic`→(export as jpg first) `.mp4` `.mov`.
Straight from your phone or Photos app is fine.

**2. Name them so they play in the right order.** They sort by filename:

```
01.jpg
02.mov
03.jpg
```

**Want a caption on screen?** Put it after a ` -- ` in the filename:

```
01 -- the drive home.jpg
02 -- you dancing badly.mov
03 -- that stupid face you make.jpg
```

No ` -- ` means no caption. Mix and match freely.

**3. Write the opening and closing words.** Open `src/config.ts` — it's the only
file you need to edit, and it's all plain text at the top:

```ts
opening: {
  kicker: "for you",
  title: "Today was a lot.",
  subtitle: "So here's everything else.",
},
closing: {
  title: "Still my favourite person.",
  subtitle: "Bad day and all.",
  signoff: "— me",
},
```

**4. Preview it:**

```bash
npm run studio
```

Opens in your browser. Scrub the timeline, check it feels right. Leave it running —
it live-reloads when you change `config.ts` or add more photos.

**5. Export the MP4:**

```bash
npm run render
```

Lands at `out/highlight-reel.mp4`. Vertical, ready to text.

---

## Music

Drop an `.mp3` or `.m4a` into `public/` (not `public/media/`), then in `src/config.ts`:

```ts
music: "song.mp3",
musicVolume: 0.55,
```

It fades in at the start and out at the end automatically.

If you'd rather hear the audio from your own clips, set `keepClipAudio: true` —
though with music playing too it usually sounds like a mess.

---

## Other shapes

Vertical is the default. If you want it for a laptop or a feed:

```bash
npm run render:wide     # 16:9  -> out/highlight-reel-wide.mp4
npm run render:square   # 1:1   -> out/highlight-reel-square.mp4
```

Same video, recomposed — the text scales and the blur fill re-fits.

---

## Want to finish it in iMovie?

Render it, then drag `out/highlight-reel.mp4` into iMovie. You can trim it, drop
a different song over it, or splice in extra clips by hand from there.

---

## Timing knobs

If shots feel too fast or too slow, edit the constants at the top of
`scripts/scan.mjs`:

```js
const PHOTO_SECONDS = 3;      // how long each photo holds
const VIDEO_MIN_SECONDS = 2;
const VIDEO_MAX_SECONDS = 5;  // long clips get cut off here
```

Then run `npm run studio` again. Video clips are measured automatically, so a
2-second clip won't sit frozen on its last frame.

Card lengths and the crossfade are in `src/timing.ts`.

---

## If something goes wrong

**"Nothing shows up"** — run `npm run scan` and check it reports the number of
files you expect. Files starting with `.` are skipped.

**A `.heic` photo won't load** — iPhone's default format isn't supported by
browsers. In Photos: File → Export → Export Unmodified Original, or just change
your iPhone camera setting to "Most Compatible".

**Render is slow** — that's normal, it's rendering every frame. A 20-second reel
takes a couple of minutes.

Your photos, videos, and music are gitignored, so they never leave your machine.
