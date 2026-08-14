import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "./config";

/**
 * The warm, slowly drifting glow that sits behind everything. Two blurred
 * blobs on opposite orbits so the light never sits still.
 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const { theme } = config;

  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const orbit = t * Math.PI * 2;
  const drift = width * 0.12;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${theme.glowA}, transparent 62%)`,
          opacity: 0.45,
          filter: "blur(80px)",
          transform: `translate(${Math.cos(orbit) * drift}px, ${Math.sin(orbit) * drift * 0.7}px) scale(1.3)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${theme.glowB}, transparent 60%)`,
          opacity: 0.32,
          filter: "blur(90px)",
          transform: `translate(${Math.cos(orbit + Math.PI) * drift}px, ${Math.sin(orbit + Math.PI) * drift * 0.8}px) scale(1.25)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Darkened edges, so the eye lands in the middle of the frame. */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.42) 100%)",
      pointerEvents: "none",
    }}
  />
);
