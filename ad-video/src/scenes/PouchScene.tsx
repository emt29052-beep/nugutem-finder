import { contrast } from "@remotion/effects/contrast";
import { shine } from "@remotion/effects/shine";
import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Bubbles, Grain, Vignette } from "../components/Overlays";
import { IMAGES, Photo } from "../components/Photo";
import { Headline } from "../components/Type";

// 120f: the pouch. Dark pedestal hero (with shine) then a hard cut to the clean white packshot.
export const PouchScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <Sequence name="Dark" durationInFrames={70} layout="absolute-fill">
        <Photo
          {...IMAGES.pouchDark}
          cam={{
            fx: 0.5,
            fy: 0.45,
            px: 540,
            py: 900,
            zoom: interpolate(frame, [0, 70], [1.3, 1.08], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 0.7, 0.3, 1),
            }),
          }}
          rotate={interpolate(frame, [0, 70], [-2, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
          effects={[
            contrast({ amount: 1.1 }),
            shine({
              progress: interpolate(frame, [18, 58], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.inOut(Easing.cubic),
              }),
              angle: -30,
              coreIntensity: 0.5,
            }),
          ]}
        />
        <Bubbles count={16} seed="pouch" opacity={0.3} />
        <AbsoluteFill
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 30%)",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 170,
          }}
        >
          <Headline
            kicker="IN THE BOX"
            title="전용 지퍼 파우치"
            sub="어디든 쏙, 깔끔한 보관"
            at={10}
            align="center"
          />
        </AbsoluteFill>
      </Sequence>
      <Sequence name="White" from={70} durationInFrames={50} layout="absolute-fill">
        <Photo
          {...IMAGES.pouchWhite}
          cam={{
            fx: 0.5,
            fy: 0.5,
            px: 540,
            py: 900,
            zoom: interpolate(frame, [70, 120], [1.06, 1.16]),
          }}
          effects={[contrast({ amount: 1.05 })]}
        />
        <Vignette strength={0.2} />
      </Sequence>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};
