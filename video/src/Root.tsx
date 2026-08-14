import React from "react";
import { Composition } from "remotion";
import { HighlightReel } from "./HighlightReel";
import { FPS, buildTimeline } from "./timing";

const { totalFrames } = buildTimeline();

export const RemotionRoot: React.FC = () => (
  <>
    {/* Vertical — for texting it to her, or a story. This is the one to use. */}
    <Composition
      id="HighlightReel"
      component={HighlightReel}
      durationInFrames={totalFrames}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="HighlightReelSquare"
      component={HighlightReel}
      durationInFrames={totalFrames}
      fps={FPS}
      width={1080}
      height={1080}
    />
    <Composition
      id="HighlightReelWide"
      component={HighlightReel}
      durationInFrames={totalFrames}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
