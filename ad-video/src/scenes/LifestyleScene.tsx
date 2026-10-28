import { contrast } from "@remotion/effects/contrast";
import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Grain, Vignette } from "../components/Overlays";
import { IMAGES, Photo } from "../components/Photo";
import { DISPLAY, SANS } from "../theme";

const Word: React.FC<{ ko: string; en: string; dark?: boolean }> = ({ ko, en, dark }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0px 90px 130px" }}>
      <div style={{ overflow: "hidden" }}>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 150,
            letterSpacing: -4,
            color: dark ? "#0b0b0c" : "white",
            translate: `0px ${interpolate(frame, [2, 16], [105, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })}%`,
          }}
        >
          {ko}
        </div>
      </div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 300,
          fontSize: 40,
          letterSpacing: 16,
          color: dark ? "#2a2e33" : "#cfe9ff",
          opacity: interpolate(frame, [10, 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {en}
      </div>
    </AbsoluteFill>
  );
};

// 90f: two moods. Sunlit concrete (light) -> backlit silhouette (dark).
export const LifestyleScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <Sequence name="Light" durationInFrames={45} layout="absolute-fill">
        <Photo
          {...IMAGES.concrete}
          cam={{
            fx: 0.6,
            fy: 0.62,
            px: interpolate(frame, [0, 45], [620, 520]),
            py: 900,
            zoom: interpolate(frame, [0, 45], [1.1, 1.22]),
          }}
          effects={[contrast({ amount: 1.08 })]}
        />
        <Word ko="가볍게." en="LIGHT AS AIR" dark />
      </Sequence>
      <Sequence name="Strong" from={45} durationInFrames={45} layout="absolute-fill">
        <Photo
          {...IMAGES.silhouette}
          cam={{
            fx: 0.5,
            fy: 0.66,
            px: 1000,
            py: 820,
            zoom: interpolate(frame, [45, 90], [1.06, 1.0]),
          }}
          effects={[contrast({ amount: 1.5 })]}
        />
        <Vignette strength={0.5} />
        <Word ko="단단하게." en="BUILT TO GRIP" dark />
      </Sequence>
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};
