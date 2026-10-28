import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { IMAGES, Photo } from "../components/Photo";
import { COMIC, POP } from "../theme";
import { Halftone, Panel, popIn } from "./Comic";

// 90f: "파우치는 그냥 덤인데" → red stamp "덤이 더 예쁨".
export const ComicPouch: React.FC = () => {
  const frame = useCurrentFrame();
  const STAMP = 40;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Halftone bg="#ff9ec4" />
      <Panel x={120} y={220} w={840} h={1080} rotate={-2}>
        <Photo
          {...IMAGES.pouchWhite}
          vw={840}
          vh={1080}
          cam={{ fx: 0.5, fy: 0.5, px: 420, py: 540, zoom: interpolate(frame, [0, 90], [1.02, 1.12]) }}
        />
      </Panel>
      <div
        style={{
          position: "absolute",
          top: 1400,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: COMIC,
          fontSize: 82,
          color: "#111",
          scale: popIn(frame, 4, 8),
        }}
      >
        파우치는 그냥 덤인데
      </div>
      <div
        style={{
          position: "absolute",
          left: 200,
          top: 1020,
          padding: "14px 44px",
          border: "12px solid #e0002a",
          borderRadius: 24,
          fontFamily: POP,
          fontSize: 120,
          color: "#e0002a",
          backgroundColor: "rgba(255,255,255,0.65)",
          rotate: "-12deg",
          opacity: frame < STAMP ? 0 : 0.95,
          scale: interpolate(frame, [STAMP, STAMP + 6], [2.4, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.quad),
          }),
        }}
      >
        덤이 더 예쁨
      </div>
    </AbsoluteFill>
  );
};
