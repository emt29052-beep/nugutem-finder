import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Bubbles, shake } from "../components/Overlays";
import { WaterBackground } from "../components/Water";
import { POP } from "../theme";
import { Burst, Halftone, MemeCaption, popIn, SpeedLines } from "./Comic";

const BigLine: React.FC<{ text: string; at: number; color?: string; wobble?: boolean }> = ({
  text,
  at,
  color = "#111",
  wobble,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        fontFamily: POP,
        fontSize: 132,
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

const Trait1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Halftone bg="#7fd3ff" dot="rgba(0,40,90,0.18)" />
      <SpeedLines opacity={interpolate(frame, [18, 22], [0, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 70 }}>
        <MemeCaption words={["특징", "1"]} at={1} bg="#ffe600" fontSize={90} />
        <div>
          <BigLine text="잠수할 때" at={6} />
          <BigLine text="한 손은 항상 코" at={12} />
        </div>
      </AbsoluteFill>
      <Burst x={790} y={1430} size={380} text="꽉!" at={20} rotate={12} />
    </AbsoluteFill>
  );
};

const Trait2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ translate: shake(frame, 20, 22, 20) }}>
      <WaterBackground descend={0.6} />
      <Bubbles
        count={frame < 20 ? 10 : 60}
        seed="glug"
        opacity={0.8}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 70 }}>
        <MemeCaption words={["특징", "2"]} at={1} bg="#ffe600" fontSize={90} />
        <div>
          <BigLine text="손 놓는 순간" at={6} color="white" />
          <BigLine text="코로 물 콸콸" at={20} color="#7fd3ff" wobble />
        </div>
      </AbsoluteFill>
      <Burst
        x={300}
        y={1500}
        size={420}
        text="꼬르륵…"
        at={26}
        rotate={-14}
        fill="#ffffff"
        fontSize={92}
      />
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

// 120f: two "traits" of people who get water up their nose.
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
