import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Bubbles, shake } from "../components/Overlays";
import { WaterBackground } from "../components/Water";
import { COMIC, POP } from "../theme";
import { Burst, Halftone, MemeCaption, popIn, SpeedLines } from "./Comic";

const BigLine: React.FC<{ text: string; at: number; color?: string; wobble?: boolean; size?: number }> = ({
  text,
  at,
  color = "#111",
  wobble,
  size = 132,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        fontFamily: POP,
        fontSize: size,
        lineHeight: 1.15,
        color,
        textAlign: "center",
        WebkitTextStroke: color === "#111" ? undefined : "4px #111",
        textShadow: color === "#111" ? undefined : "8px 8px 0 #111",
        scale: popIn(frame, at, 7),
      }}
    >
      {[...text].map((ch, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            translate: wobble ? `0px ${Math.sin(frame / 2.5 + i) * 14}px` : undefined,
          }}
        >
          {ch}
        </span>
      ))}
    </div>
  );
};

const Aside: React.FC<{ text: string; at: number; color?: string }> = ({ text, at, color = "#111" }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily: COMIC, fontSize: 64, color, scale: popIn(frame, at, 8), rotate: "-3deg" }}>
      {text}
    </div>
  );
};

/** Trait 1 — a drawer full of nose clips that never fit. */
const Trait1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Halftone bg="#7fd3ff" dot="rgba(0,40,90,0.18)" />
      <SpeedLines opacity={interpolate(frame, [18, 22], [0, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 60 }}>
        <MemeCaption words={["특징", "1"]} at={1} bg="#ffe600" fontSize={90} />
        <div>
          <BigLine text="노즈클립만" at={6} />
          <BigLine text="벌써 5개째" at={12} />
        </div>
        <Aside text="(전부 서랍 속에 잠들어 있음)" at={30} />
      </AbsoluteFill>
      <Burst x={800} y={1500} size={420} text="또 샀어?!" at={20} rotate={12} fontSize={84} />
    </AbsoluteFill>
  );
};

/** Trait 2 — too loose it slips, too tight it hurts. */
const Trait2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ translate: shake(frame, 20, 22, 20) }}>
      <WaterBackground descend={0.6} />
      <Bubbles count={16} seed="nomad" opacity={0.6} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 60 }}>
        <MemeCaption words={["특징", "2"]} at={1} bg="#ffe600" fontSize={90} />
        <div>
          <BigLine text="헐렁하면 스르륵" at={6} color="white" size={110} />
          <BigLine text="꽉 끼면 아야" at={20} color="#7fd3ff" wobble />
        </div>
        <Aside text="(내 코만 이상한가…)" at={32} color="#d6f1ff" />
      </AbsoluteFill>
      <Burst x={860} y={1560} size={340} text="아야!" at={22} rotate={-12} fill="#ffffff" />
      <AbsoluteFill
        style={{
          backgroundColor: "#7fd3ff",
          opacity: interpolate(frame, [20, 22, 30], [0, 0.5, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          }),
        }}
      />
    </AbsoluteFill>
  );
};

// 120f: two nose-clip-nomad "traits" — a drawer of clips, and none of them fit.
export const ComicPain: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#7fd3ff", overflow: "hidden" }}>
    <Sequence name="Trait1" durationInFrames={60} layout="absolute-fill">
      <Trait1 />
    </Sequence>
    <Sequence name="Trait2" from={60} durationInFrames={60} layout="absolute-fill">
      <Trait2 />
    </Sequence>
  </AbsoluteFill>
);
