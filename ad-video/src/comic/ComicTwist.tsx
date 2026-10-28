import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { shake } from "../components/Overlays";
import { IMAGES, Photo } from "../components/Photo";
import { COMIC, POP } from "../theme";
import { MemeCaption, popIn, SpeechBubble } from "./Comic";

// 120f: "근데 노즈클립만 있으면 나도 딥다이버?" → record scratch, freeze → "아니요." → "배워야 됩니다 :)"
export const ComicTwist: React.FC = () => {
  const frame = useCurrentFrame();
  const FREEZE = 45;
  const f = Math.min(frame, FREEZE);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#222" }}>
      <AbsoluteFill
        style={{
          filter: frame >= FREEZE ? "grayscale(1) contrast(1.2)" : undefined,
          scale: frame >= FREEZE ? 1.08 : 1,
          translate: shake(frame, FREEZE, 24, 12),
        }}
      >
        <Photo
          {...IMAGES.pouchHand1}
          cam={{ fx: 0.5, fy: 0.45, px: 540, py: 960, zoom: interpolate(f, [0, FREEZE], [1.05, 1.2]) }}
        />
        <div style={{ position: "absolute", top: 200, left: 60, right: 60, display: "flex", justifyContent: "center" }}>
          <MemeCaption words={["근데", "노즈클립만", "있으면"]} at={2} step={5} fontSize={88} />
        </div>
        <div style={{ position: "absolute", top: 440, left: 60, right: 60, display: "flex", justifyContent: "center" }}>
          <MemeCaption words={["나도", "딥다이버?"]} at={20} step={6} bg="#ffe600" fontSize={100} rotate={2} />
        </div>
      </AbsoluteFill>
      {frame >= FREEZE ? (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <div
            style={{
              fontFamily: POP,
              fontSize: 260,
              color: "#ff2d55",
              WebkitTextStroke: "6px #111",
              textShadow: "14px 14px 0 #111",
              rotate: "-6deg",
              scale: popIn(frame, FREEZE, 5),
            }}
          >
            아니요.
          </div>
        </AbsoluteFill>
      ) : null}
      <SpeechBubble x={150} y={1500} width={780} text="배워야 됩니다 :)" at={75} tailX={540} tailY={1300} fontSize={76} />
      {frame >= 75 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 1760,
            textAlign: "center",
            fontFamily: COMIC,
            fontSize: 42,
            color: "white",
            textShadow: "0 3px 10px rgba(0,0,0,0.8)",
            opacity: interpolate(frame, [80, 88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          깊은 다이빙은 반드시 교육받은 버디와 함께
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
