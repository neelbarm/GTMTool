import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Backdrop, Vignette } from "./Backdrop";
import { Card } from "./Card";
import { MediaShot } from "./MediaShot";
import { config } from "./config";
import { OVERLAP, buildTimeline, media } from "./timing";

/**
 * Fades a scene in over the overlap window. Scenes are stacked in timeline
 * order, so a scene fading in simply covers the one still playing underneath —
 * that's the crossfade. No fade-out needed, which avoids a dip to black
 * between shots.
 */
const CrossfadeIn: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, frames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** Black in at the start, black out at the end. */
const FilmEdges: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 18, durationInFrames - 28, durationInFrames - 1],
    [1, 0, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity, pointerEvents: "none" }} />;
};

const EmptyState: React.FC = () => (
  <Card
    kicker="nothing here yet"
    title="Add your photos and videos"
    subtitle="Drop them into video/public/media, then run npm run studio again."
  />
);

export const HighlightReel: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const { scenes } = buildTimeline();

  return (
    <AbsoluteFill style={{ backgroundColor: config.theme.background }}>
      <Backdrop />

      {media.length === 0 ? (
        <EmptyState />
      ) : (
        scenes.map((scene, i) => (
          <Sequence
            key={i}
            from={scene.from}
            durationInFrames={scene.durationInFrames}
            layout="none"
          >
            <CrossfadeIn frames={i === 0 ? 1 : OVERLAP}>
              {scene.kind === "opening" ? (
                <Card {...config.opening} />
              ) : scene.kind === "closing" ? (
                <Card {...config.closing} />
              ) : (
                <MediaShot item={scene.item} index={scene.index} />
              )}
            </CrossfadeIn>
          </Sequence>
        ))
      )}

      <Vignette />
      <FilmEdges />

      {config.music ? (
        <Audio
          src={staticFile(config.music)}
          volume={(f) =>
            interpolate(
              f,
              [0, 30, durationInFrames - 60, durationInFrames],
              [0, config.musicVolume, config.musicVolume, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
