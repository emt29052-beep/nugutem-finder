import { contrast } from "@remotion/effects/contrast";
import { shine } from "@remotion/effects/shine";
import { vignette } from "@remotion/effects/vignette";
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Bubbles, Grain } from "../components/Overlays";
import { IMAGES, Photo } from "../components/Photo";
import { StaggerText } from "../components/Type";
import { DISPLAY, SANS } from "../theme";

// 120f. Spotlight hero: slow crane down the strap onto the clip, shine sweeps the plastic.
export const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const img = IMAGES.spotlight;
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <Photo
        {...img}
        cam={{
          fx: 0.5,
          fy: interpolate(frame, [0, 120], [0.3, 0.52], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.45, 0, 0.2, 1),
          }),
          px: 540,
          py: 820,
          zoom: interpolate(frame, [0, 120], [1.45, 1.12], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.45, 0, 0.2, 1),
          }),
        }}
        effects={[
          contrast({ amount: 1.12 }),
          shine({
            progress: interpolate(frame, [34, 74], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.inOut(Easing.cubic),
            }),
            angle: 24,
            coreIntensity: 0.55,
            haloIntensity: 0.35,
          }),
          vignette({ amount: 0.6, radius: 0.55 }),
        ]}
      />
      <Bubbles count={14} seed="hero" opacity={0.25} />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 190,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 32%)",
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 110,
            color: "white",
            letterSpacing: interpolate(frame, [12, 60], [60, 12], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            opacity: interpolate(frame, [12, 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            filter: `blur(${interpolate(frame, [12, 30], [16, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px)`,
          }}
        >
          NOSECLIP PRO
        </div>
        <div
          style={{
            height: 3,
            backgroundColor: "#9fdcff",
            marginTop: 16,
            marginBottom: 26,
            width: interpolate(frame, [30, 56], [0, 420], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.65, 0, 0.35, 1),
            }),
          }}
        />
        <StaggerText
          text="이름처럼, 착."
          at={44}
          step={2}
          style={{ fontFamily: SANS, fontWeight: 900, fontSize: 70, color: "white", letterSpacing: -1 }}
        />
      </AbsoluteFill>
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};
