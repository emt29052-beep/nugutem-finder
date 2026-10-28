import { blur } from "@remotion/effects/blur";
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Bubbles, Grain, shake, Vignette } from "../components/Overlays";
import { IMAGES, Photo } from "../components/Photo";
import { InstaGlyph } from "../components/Water";
import { BrushChak, StaggerText } from "../components/Type";
import { DISPLAY, SANS } from "../theme";

// 135f end card: the brush "착" slams again on the final boom, then the CTA.
export const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const SLAM = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <AbsoluteFill style={{ translate: shake(frame, SLAM, 34, 18) }}>
        <Photo
          {...IMAGES.spotlight}
          cam={{ fx: 0.5, fy: 0.45, px: 540, py: 960, zoom: interpolate(frame, [0, 135], [1.25, 1.1]) }}
          effects={[blur({ radius: 18 })]}
        />
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.72)" }} />
        <Vignette strength={0.8} />
        <Bubbles count={20} seed="end" opacity={0.3} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 140 }}>
          <BrushChak at={SLAM} size={640} />
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: 66,
              letterSpacing: interpolate(frame, [10, 40], [40, 18], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
              color: "white",
              opacity: interpolate(frame, [10, 22], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            NOSECLIP PRO
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 200 }}>
          <StaggerText
            text="지금, 착."
            at={34}
            step={3}
            style={{ fontFamily: SANS, fontWeight: 900, fontSize: 96, color: "white", letterSpacing: -2 }}
          />
          <div
            style={{
              marginTop: 34,
              padding: "20px 48px",
              border: "2px solid rgba(255,255,255,0.85)",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: 50,
              letterSpacing: 2,
              color: "white",
              opacity: interpolate(frame, [52, 64], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(frame, [52, 64], [0.85, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.back(2)),
              }),
            }}
          >
            <InstaGlyph size={52} />
            @deepflow_korea
          </div>
          <div
            style={{
              marginTop: 26,
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 38,
              color: "#cfe9ff",
              opacity: interpolate(frame, [64, 76], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            with 모어딥 프리다이빙
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundColor: "white",
          opacity: interpolate(frame, [0, 6], [0.9, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <AbsoluteFill
        style={{
          backgroundColor: "black",
          opacity: interpolate(frame, [115, 135], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <Grain opacity={0.12} />
    </AbsoluteFill>
  );
};
