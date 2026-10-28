import React from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { COMIC, POP } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Pop-in scale with overshoot, for stickers and bubbles. */
export const popIn = (frame: number, at: number, dur = 8) =>
  interpolate(frame, [at, at + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.6)) });

/** Googly eye: pupil swings and settles after every bump frame. */
const Eye: React.FC<{ x: number; y: number; size: number; bumps: number[]; seed: number; blinkAt?: number }> = ({
  x,
  y,
  size,
  bumps,
  seed,
  blinkAt,
}) => {
  const frame = useCurrentFrame();
  const last = Math.max(...bumps.filter((b) => b <= frame), -1000);
  const t = frame - last;
  const amp = size * 0.2 * Math.exp(-t / 9);
  const ang = random(`eye-${seed}-${last}`) * Math.PI * 2;
  const swing = Math.cos(t / 2.2);
  const px = Math.cos(ang) * amp * swing;
  const py = size * 0.12 + Math.sin(ang) * amp * swing; // gravity pulls pupil down
  const blink = blinkAt !== undefined && frame >= blinkAt && frame < blinkAt + 8;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: blink ? size * 0.12 : size,
        marginTop: blink ? size * 0.44 : 0,
        borderRadius: blink ? 20 : "50%",
        backgroundColor: blink ? "#111" : "white",
        border: `${size * 0.06}px solid #111`,
        boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      {blink ? null : (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: size * 0.46,
            height: size * 0.46,
            borderRadius: "50%",
            backgroundColor: "#111",
            translate: `calc(-50% + ${px}px) calc(-50% + ${py}px)`,
          }}
        />
      )}
    </div>
  );
};

export const GooglyEyes: React.FC<{
  a: { x: number; y: number };
  b: { x: number; y: number };
  size: number;
  bumps: number[];
  appearAt?: number;
  winkAt?: number;
}> = ({ a, b, size, bumps, appearAt = 0, winkAt }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, scale: popIn(frame, appearAt, 6), transformOrigin: `${(a.x + b.x) / 2}px ${(a.y + b.y) / 2}px` }}>
      <Eye {...a} size={size} bumps={[appearAt, ...bumps]} seed={1} />
      <Eye {...b} size={size} bumps={[appearAt, ...bumps]} seed={2} blinkAt={winkAt} />
    </div>
  );
};

/** Comic speech bubble with a tail pointing at (tailX, tailY). */
export const SpeechBubble: React.FC<{
  x: number;
  y: number;
  width: number;
  text: string;
  at: number;
  tailX: number;
  tailY: number;
  fontSize?: number;
}> = ({ x, y, width, text, at, tailX, tailY, fontSize = 64 }) => {
  const frame = useCurrentFrame();
  const s = popIn(frame, at, 9);
  const cx = x + width / 2;
  return (
    <div style={{ position: "absolute", inset: 0, scale: s, transformOrigin: `${tailX}px ${tailY}px` }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <path
          d={`M ${cx - 50} ${y + 60} L ${tailX} ${tailY} L ${cx + 50} ${y + 60} Z`}
          fill="white"
          stroke="#111"
          strokeWidth={8}
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y - 60,
          width,
          padding: "34px 40px",
          backgroundColor: "white",
          border: "8px solid #111",
          borderRadius: 70,
          fontFamily: COMIC,
          fontSize,
          lineHeight: 1.2,
          textAlign: "center",
          color: "#111",
          boxShadow: "10px 12px 0 #111",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Jagged starburst sticker with a sound-effect word ("착!", "꽉!"). */
export const Burst: React.FC<{
  x: number;
  y: number;
  size: number;
  text: string;
  at: number;
  fill?: string;
  rotate?: number;
  fontSize?: number;
}> = ({ x, y, size, text, at, fill = "#ffe600", rotate = -10, fontSize }) => {
  const frame = useCurrentFrame();
  const spikes = 14;
  const pts = new Array(spikes * 2)
    .fill(0)
    .map((_, i) => {
      const r = i % 2 === 0 ? 50 : 34 + random(`burst-${text}-${i}`) * 6;
      const a = (i / (spikes * 2)) * Math.PI * 2;
      return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
    })
    .join(" ");
  const wobble = Math.sin((frame - at) / 3) * 3;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        scale: popIn(frame, at, 7),
        rotate: `${rotate + wobble}deg`,
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <polygon points={pts} fill="#111" transform="translate(3 4)" />
        <polygon points={pts} fill={fill} stroke="#111" strokeWidth={2.2} strokeLinejoin="round" />
      </svg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: POP,
            fontSize: fontSize ?? size * 0.3,
            color: "#ff2d55",
            WebkitTextStroke: `${size * 0.012}px #111`,
            textShadow: "4px 4px 0 #111",
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    </div>
  );
};

/** Manga speed lines radiating from a point, re-randomized every 2 frames. */
export const SpeedLines: React.FC<{ cx?: number; cy?: number; color?: string; opacity?: number }> = ({
  cx = 540,
  cy = 960,
  color = "#111",
  opacity = 0.5,
}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity }}>
      {new Array(70).fill(0).map((_, i) => {
        const a = (i / 70) * Math.PI * 2 + random(`sl-a-${seed}-${i}`) * 0.05;
        const r0 = 380 + random(`sl-r-${seed}-${i}`) * 220;
        const w = 4 + random(`sl-w-${seed}-${i}`) * 14;
        const r1 = 1500;
        const x0 = cx + Math.cos(a) * r0;
        const y0 = cy + Math.sin(a) * r0;
        const nx = -Math.sin(a) * w;
        const ny = Math.cos(a) * w;
        return (
          <polygon
            key={i}
            points={`${x0},${y0} ${cx + Math.cos(a) * r1 + nx},${cy + Math.sin(a) * r1 + ny} ${
              cx + Math.cos(a) * r1 - nx
            },${cy + Math.sin(a) * r1 - ny}`}
            fill={color}
          />
        );
      })}
    </svg>
  );
};

/** Flat comic background with halftone dots. */
export const Halftone: React.FC<{ bg: string; dot?: string; size?: number }> = ({ bg, dot = "rgba(0,0,0,0.12)", size = 22 }) => (
  <AbsoluteFill
    style={{
      backgroundColor: bg,
      backgroundImage: `radial-gradient(${dot} 28%, transparent 30%)`,
      backgroundSize: `${size}px ${size}px`,
    }}
  />
);

/** Meme caption: words pop in one by one inside a bold box. */
export const MemeCaption: React.FC<{
  words: string[];
  at: number;
  step?: number;
  bg?: string;
  color?: string;
  fontSize?: number;
  rotate?: number;
}> = ({ words, at, step = 5, bg = "white", color = "#111", fontSize = 92, rotate = -2 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 22px",
        padding: "22px 40px",
        backgroundColor: bg,
        border: "8px solid #111",
        boxShadow: "12px 12px 0 #111",
        rotate: `${rotate}deg`,
        scale: popIn(frame, at - 2, 6),
        fontFamily: POP,
        fontSize,
        lineHeight: 1.15,
        color,
      }}
    >
      {words.map((w, i) => (
        <span key={i} style={{ display: "inline-block", scale: popIn(frame, at + i * step, 6) }}>
          {w}
        </span>
      ))}
    </div>
  );
};

/** Thick-bordered, tilted comic panel. */
export const Panel: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, rotate = 0, children, style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      border: "10px solid #111",
      boxShadow: "16px 16px 0 #111",
      overflow: "hidden",
      rotate: `${rotate}deg`,
      backgroundColor: "white",
      ...style,
    }}
  >
    {children}
  </div>
);
