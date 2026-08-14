import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { config } from "./config";
import { body } from "./fonts";
import type { MediaItem } from "./timing";

/**
 * A blurred, zoomed copy of the same media filling the whole frame, so a
 * portrait photo in a landscape video (or the reverse) never sits on dead space.
 */
const BlurFill: React.FC<{ item: MediaItem; src: string }> = ({ item, src }) => {
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scale(1.2)",
    filter: "blur(40px) brightness(0.5) saturate(1.2)",
  };

  return (
    <AbsoluteFill>
      {item.type === "video" ? (
        <OffthreadVideo src={src} muted style={style} />
      ) : (
        <Img src={src} style={style} />
      )}
    </AbsoluteFill>
  );
};

export const MediaShot: React.FC<{ item: MediaItem; index: number }> = ({ item, index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width } = useVideoConfig();
  const { theme } = config;
  const u = width / 1080;
  const src = staticFile(item.src);

  // Slow push-in on stills so a photo never feels like a frozen frame.
  // Videos move on their own, so they get left alone.
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const kenBurns =
    item.type === "image"
      ? {
          scale: interpolate(progress, [0, 1], [1, 1.09]),
          // Flip the drift direction each shot so the motion doesn't get repetitive.
          x: interpolate(progress, [0, 1], [0, index % 2 === 0 ? -22 : 22]),
          y: interpolate(progress, [0, 1], [0, index % 3 === 0 ? 16 : -16]),
        }
      : { scale: 1, x: 0, y: 0 };

  const foreground: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    // drop-shadow traces the letterboxed image itself, not its layout box,
    // so the photo reads as floating above the blur.
    filter: "drop-shadow(0 24px 60px rgba(0,0,0,0.55))",
  };

  const captionEnter = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200, mass: 0.5 },
  });

  return (
    <AbsoluteFill>
      <BlurFill item={item} src={src} />

      <AbsoluteFill
        style={{
          padding: `${52 * u}px ${32 * u}px`,
          transform: `scale(${kenBurns.scale}) translate(${kenBurns.x}px, ${kenBurns.y}px)`,
        }}
      >
        {item.type === "video" ? (
          <OffthreadVideo src={src} muted={!config.keepClipAudio} style={foreground} />
        ) : (
          <Img src={src} style={foreground} />
        )}
      </AbsoluteFill>

      {item.caption ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            padding: `0 ${70 * u}px ${110 * u}px`,
          }}
        >
          <div
            style={{
              fontFamily: body,
              fontSize: 34 * u,
              fontWeight: 500,
              color: theme.text,
              textAlign: "center",
              textWrap: "balance",
              lineHeight: 1.3,
              padding: `${18 * u}px ${34 * u}px`,
              borderRadius: 999,
              background: "rgba(20,12,14,0.55)",
              backdropFilter: "blur(12px)",
              border: `1px solid rgba(255,255,255,0.14)`,
              opacity: captionEnter,
              transform: `translateY(${interpolate(captionEnter, [0, 1], [24, 0])}px)`,
            }}
          >
            {item.caption}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
