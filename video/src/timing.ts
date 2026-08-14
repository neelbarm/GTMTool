import mediaJson from "./media.json";

export type MediaItem = {
  src: string;
  type: "image" | "video";
  seconds: number;
  caption: string | null;
};

export const media = mediaJson as MediaItem[];

export const FPS = 30;

const OPENING_SECONDS = 3.2;
const CLOSING_SECONDS = 4.5;

/** How much neighbouring scenes overlap, which is also the crossfade length. */
export const OVERLAP = Math.round(0.5 * FPS);

export type Scene =
  | { kind: "opening"; from: number; durationInFrames: number }
  | { kind: "closing"; from: number; durationInFrames: number }
  | { kind: "media"; from: number; durationInFrames: number; item: MediaItem; index: number };

/**
 * Lays every scene out on one timeline. Each scene starts OVERLAP frames before
 * the previous one ends, which is what gives us the crossfade.
 */
export const buildTimeline = (): { scenes: Scene[]; totalFrames: number } => {
  const durations: { kind: "opening" | "closing" | "media"; frames: number; item?: MediaItem }[] = [
    { kind: "opening", frames: Math.round(OPENING_SECONDS * FPS) },
    ...media.map((item) => ({
      kind: "media" as const,
      frames: Math.max(OVERLAP * 2 + 1, Math.round(item.seconds * FPS)),
      item,
    })),
    { kind: "closing", frames: Math.round(CLOSING_SECONDS * FPS) },
  ];

  const scenes: Scene[] = [];
  let cursor = 0;
  let mediaIndex = 0;

  for (const entry of durations) {
    if (entry.kind === "media" && entry.item) {
      scenes.push({
        kind: "media",
        from: cursor,
        durationInFrames: entry.frames,
        item: entry.item,
        index: mediaIndex++,
      });
    } else {
      scenes.push({
        kind: entry.kind as "opening" | "closing",
        from: cursor,
        durationInFrames: entry.frames,
      });
    }
    cursor += entry.frames - OVERLAP;
  }

  const last = scenes[scenes.length - 1];
  return { scenes, totalFrames: last.from + last.durationInFrames };
};
