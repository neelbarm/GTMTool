import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "./config";
import { body, display } from "./fonts";

type Line = { text: string; size: number; family: string; weight: number; color: string; delay: number };

/** Each line rises into place a couple of frames after the one above it. */
const Rise: React.FC<{ line: Line }> = ({ line }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - line.delay,
    fps,
    config: { damping: 200, mass: 0.6 },
  });

  return (
    <div
      style={{
        fontFamily: line.family,
        fontSize: line.size,
        fontWeight: line.weight,
        color: line.color,
        lineHeight: 1.15,
        letterSpacing: line.family === body ? "0.02em" : "-0.02em",
        textAlign: "center",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [28, 0])}px)`,
        textWrap: "balance",
      }}
    >
      {line.text}
    </div>
  );
};

export const Card: React.FC<{
  kicker?: string;
  title: string;
  subtitle?: string;
  signoff?: string;
}> = ({ kicker, title, subtitle, signoff }) => {
  const { width } = useVideoConfig();
  const { theme } = config;
  // Scale type off the frame width so all three aspect ratios look right.
  const u = width / 1080;

  const lines: Line[] = [];
  if (kicker) {
    lines.push({
      text: kicker.toUpperCase(),
      size: 30 * u,
      family: body,
      weight: 500,
      color: theme.accent,
      delay: 0,
    });
  }
  lines.push({
    text: title,
    size: 86 * u,
    family: display,
    weight: 600,
    color: theme.text,
    delay: lines.length * 5,
  });
  if (subtitle) {
    lines.push({
      text: subtitle,
      size: 40 * u,
      family: body,
      weight: 400,
      color: theme.text,
      delay: lines.length * 5,
    });
  }
  if (signoff) {
    lines.push({
      text: signoff,
      size: 32 * u,
      family: body,
      weight: 400,
      color: theme.accent,
      delay: lines.length * 5 + 8,
    });
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${110 * u}px`,
        gap: 22 * u,
      }}
    >
      {lines.map((line, i) => (
        <Rise key={i} line={line} />
      ))}
    </AbsoluteFill>
  );
};
