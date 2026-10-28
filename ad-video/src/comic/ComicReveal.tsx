import { contrast } from "@remotion/effects/contrast";
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { shake } from "../components/Overlays";
import { IMAGES, Photo } from "../components/Photo";
import { COMIC, POP } from "../theme";
import { Burst, Halftone, MemeCaption, Panel, popIn, SpeedLines } from "./Comic";

// 90f: "그래서 준비했습니다" → the product panel slams in with a giant "착!".
export const ComicReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const SLAM = 30;
  const slam = interpolate(frame, [SLAM, SLAM + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 1.4, 0.4, 1),
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Halftone bg="#fff3b0" dot="rgba(255,120,0,0.18)" />
      <AbsoluteFill style={{ translate: shake(frame, SLAM, 30, 16) }}>
        {frame >= SLAM ? <SpeedLines opacity={0.25} cy={900} /> : null}
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: frame < SLAM ? 1 : 0,
          }}
        >
          <MemeCaption words={["그래서", "준비했습니다"]} at={2} step={8} fontSize={110} />
        </AbsoluteFill>
        {frame >= SLAM ? (
          <div style={{ position: "absolute", inset: 0, scale: 3 - 2 * slam, rotate: `${(1 - slam) * 20 - 4}deg` }}>
            <Panel x={150} y={330} w={780} h={1060}>
              <Photo
                {...IMAGES.spotlight}
                vw={780}
                vh={1060}
                cam={{ fx: 0.5, fy: 0.5, px: 390, py: 560, zoom: 1.05 }}
                effects={[contrast({ amount: 1.1 })]}
              />
            </Panel>
          </div>
        ) : null}
        <Burst x={830} y={420} size={420} text="착!" at={SLAM + 3} rotate={14} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 1470,
            textAlign: "center",
            fontFamily: POP,
            fontSize: 110,
            color: "#111",
            scale: popIn(frame, SLAM + 14, 7),
          }}
        >
          착 노즈클립 PRO
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 1650,
            textAlign: "center",
            fontFamily: COMIC,
            fontSize: 70,
            color: "#111",
            scale: popIn(frame, SLAM + 24, 8),
          }}
        >
          손 없이 이퀄, 두 손은 자유
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
