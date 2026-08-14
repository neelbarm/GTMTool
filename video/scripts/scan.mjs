/**
 * Scans public/media and writes src/media.json.
 *
 * Ordering: files play in filename order, so name them 01-..., 02-..., etc.
 * Captions: anything after a " -- " in the filename becomes an on-screen caption.
 *   e.g. "03 -- the night you laughed at your own joke.jpg"
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mediaDir = path.join(root, "public", "media");
const outFile = path.join(root, "src", "media.json");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".m4v", ".mkv"]);

// How long each item stays on screen.
const PHOTO_SECONDS = 3;
const VIDEO_MIN_SECONDS = 2;
const VIDEO_MAX_SECONDS = 5;

/** Ask Remotion's bundled ffprobe how long a video is. Returns null if it can't tell. */
const probeDuration = (file) => {
  try {
    const raw = execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["remotion", "ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", file],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 },
    );
    const start = raw.indexOf("{");
    if (start === -1) return null;
    const seconds = Number(JSON.parse(raw.slice(start))?.format?.duration);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
};

const parseName = (filename) => {
  const base = filename.replace(/\.[^.]+$/, "");
  const [, caption] = base.split(/\s+--\s+/, 2);
  return caption?.trim() || null;
};

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

const files = fs
  .readdirSync(mediaDir)
  .filter((f) => !f.startsWith("."))
  .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()) || VIDEO_EXT.has(path.extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

const items = files.map((filename) => {
  const isVideo = VIDEO_EXT.has(path.extname(filename).toLowerCase());
  let seconds = PHOTO_SECONDS;

  if (isVideo) {
    const actual = probeDuration(path.join(mediaDir, filename));
    // Never run past the end of a short clip, never sit on a long one.
    seconds = actual
      ? Math.min(VIDEO_MAX_SECONDS, Math.max(VIDEO_MIN_SECONDS, actual))
      : VIDEO_MAX_SECONDS;
    if (actual && actual < VIDEO_MIN_SECONDS) seconds = actual;
  }

  return {
    src: `media/${filename}`,
    type: isVideo ? "video" : "image",
    seconds: Number(seconds.toFixed(3)),
    caption: parseName(filename),
  };
});

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(items, null, 2)}\n`);

const videos = items.filter((i) => i.type === "video").length;
console.log(
  items.length === 0
    ? `No media found. Drop photos and videos into ${path.relative(process.cwd(), mediaDir)} and run this again.`
    : `Found ${items.length} item${items.length === 1 ? "" : "s"} (${items.length - videos} photo, ${videos} video) -> src/media.json`,
);
