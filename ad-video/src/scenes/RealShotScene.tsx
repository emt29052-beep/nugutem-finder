import React from "react";
import { AbsoluteFill, Easing, interpolate, random, staticFile, useCurrentFrame, Img } from "remotion";
import { Grain } from "../components/Overlays";
import { IMAGES } from "../components/Photo";
import { DISPLAY, SANS } from "../theme";

const SHOTS = [IMAGES.macro2, IMAGES.pouchFlat, IMAGES.pouchHand1, IMAGES.pouchHand2];
const STEP = 18;

/** Instant-photo print that drops onto the table with a slight random tilt. */
const Print: React.FC<{ src: string; i: number }> = ({ src, i }) => {
  const frame = useCurrentFrame();
  const at = 6 + i * STEP;
  const tilt = (random(`tilt-${i}`) - 0.5) * 18;
  const dx = (random(`dx-${i}`) - 0.5) * 140;
  const dy = (random(`dy-${i}`) - 0.5) * 120;
  const drop = interpolate(frame, [at, at + 9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 1.3, 0.4, 1),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - 330 + dx,
        top: 860 - 420 + dy,
        width: 660,
        padding: "26px 26px 110px",
        backgroundColor: "#f7f6f2",
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        opacity: frame < at ? 0 : 1,
        rotate: `${tilt + (1 - drop) * 25}deg`,
        scale: 1.6 - 0.6 * drop,
      }}
    >
      <Img src={staticFile(src)} style={{ width: "100%", height: 800, objectFit: "cover", display: "block" }} />
      {/* develop-in: starts washed out like an instant print */}
      <div
        style={{
          position: "absolute",
          left: 26,
          top: 26,
          right: 26,
          height: 800,
          backgroundColor: "#f7f6f2",
          opacity: interpolate(frame, [at, at + 14], [0.85, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
    </div>
  );
};

// 90f: "실제로 받은 그대로" — the user's own phone photos, dropped like prints on each beat.
export const RealShotScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #2a2d31 0%, #0b0c0d 75%)",
        overflow: "hidden",
      }}
    >
      {SHOTS.map((s, i) => (
        <Print key={s.src} src={s.src} i={i} />
      ))}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 180 }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 36,
            letterSpacing: 14,
            color: "#9fdcff",
            opacity: interpolate(frame, [4, 14], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          ● REAL SHOT · NO RETOUCH
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 92,
            color: "white",
            marginTop: 14,
            letterSpacing: -2,
            opacity: interpolate(frame, [10, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          받아보면 진짜 이래요
        </div>
      </AbsoluteFill>
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};
