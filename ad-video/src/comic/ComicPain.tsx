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

/** Trait 1 — free fall, but one hand is stuck pinching the nose (bye bye streamline). */
const Trait1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Halftone bg="#7fd3ff" dot="rgba(0,40,90,0.18)" />
      <SpeedLines opacity={interpolate(frame, [18, 22], [0, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 60 }}>
        <MemeCaption words={["특징", "1"]} at={1} bg="#ffe600" fontSize={90} />
        <div>
          <BigLine text="프리폴 중에도" at={6} />
          <BigLine text="한 손은 코에" at={12} />
        </div>
        <Aside text="유선형? 그게 뭐죠" at={30} />
      </AbsoluteFill>
      <Burst x={820} y={1500} size={360} text="꽉!" at={20} rotate={12} />
    </AbsoluteFill>
  );
};

/** A free-immersion line hanging through the frame. */
const Rope: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 36,
      top: -40,
      bottom: -40,
      width: 22,
      borderRadius: 11,
      background: "repeating-linear-gradient(160deg, #f4f4f4 0px, #f4f4f4 10px, #c9c9c9 10px, #c9c9c9 20px)",
      boxShadow: "6px 0 0 rgba(0,0,0,0.35)",
    }}
  />
);

/** Trait 2 — free immersion: both hands belong on the rope, one is on the nose. */
const Trait2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ translate: shake(frame, 20, 22, 20) }}>
      <WaterBackground descend={0.6} />
      <Rope />
      <Bubbles count={16} seed="fim" opacity={0.6} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 60 }}>
        <MemeCaption words={["특징", "2"]} at={1} bg="#ffe600" fontSize={90} />
        <div>
          <BigLine text="FIM 할 때" at={6} color="white" />
          <BigLine text="로프 잡을 손 실종" at={20} color="#7fd3ff" wobble size={100} />
        </div>
        <Aside text="(한 손으로 영차영차)" at={32} color="#d6f1ff" />
      </AbsoluteFill>
      <Burst x={860} y={1560} size={340} text="어?!" at={22} rotate={-12} fill="#ffffff" />
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

// 120f: two deep-diver "traits" — equalizing by hand ruins free fall and FIM.
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
