import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { BRUSH, DISPLAY, SANS } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Brush-stroke "착" with an RGB split that settles after the slam. */
export const BrushChak: React.FC<{ at: number; size: number; color?: string }> = ({
  at,
  size,
  color = "white",
}) => {
  const frame = useCurrentFrame();
  const split = interpolate(frame, [at, at + 10], [22, 0], clamp);
  const base: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    fontFamily: BRUSH,
    fontSize: size,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  return (
    <div
      style={{
        position: "relative",
        width: size * 1.2,
        height: size * 1.1,
        opacity: frame < at ? 0 : 1,
        scale: interpolate(frame, [at, at + 7], [2.6, 1], {
          ...clamp,
          easing: Easing.bezier(0.2, 0.9, 0.2, 1),
          output: "perceptual-scale",
        }),
        filter: `blur(${interpolate(frame, [at, at + 5], [14, 0], clamp)}px)`,
      }}
    >
      <div style={{ ...base, color: "#ff2d55", translate: `${-split}px 0px`, mixBlendMode: "screen", opacity: 0.9 }}>
        착
      </div>
      <div style={{ ...base, color: "#2de1ff", translate: `${split}px 0px`, mixBlendMode: "screen", opacity: 0.9 }}>
        착
      </div>
      <div style={{ ...base, color }}>착</div>
    </div>
  );
};

/** Characters rise and un-blur one after another. */
export const StaggerText: React.FC<{
  text: string;
  at: number;
  step?: number;
  style?: React.CSSProperties;
}> = ({ text, at, step = 2, style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", justifyContent: "center", whiteSpace: "pre", ...style }}>
      {[...text].map((ch, i) => {
        const s = at + i * step;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: interpolate(frame, [s, s + 8], [0, 1], clamp),
              translate: `0px ${interpolate(frame, [s, s + 10], [40, 0], {
                ...clamp,
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}px`,
              filter: `blur(${interpolate(frame, [s, s + 8], [10, 0], clamp)}px)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** Big Korean headline + small english kicker, slide-masked in. */
export const Headline: React.FC<{
  kicker: string;
  title: string;
  sub?: string;
  at: number;
  align?: "left" | "center";
  dark?: boolean;
}> = ({ kicker, title, sub, at, align = "left", dark = false }) => {
  const frame = useCurrentFrame();
  const ink = dark ? "#0a0a0b" : "white";
  const reveal = (d: number) =>
    interpolate(frame, [at + d, at + d + 14], [110, 0], {
      ...clamp,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  return (
    <div style={{ textAlign: align, color: ink }}>
      <div style={{ overflow: "hidden" }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: 10,
            color: dark ? "#3a3f45" : "#9fdcff",
            translate: `0px ${reveal(0)}%`,
          }}
        >
          {kicker}
        </div>
      </div>
      <div style={{ overflow: "hidden", marginTop: 8 }}>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 104,
            lineHeight: 1.12,
            letterSpacing: -2,
            translate: `0px ${reveal(4)}%`,
          }}
        >
          {title}
        </div>
      </div>
      {sub ? (
        <div style={{ overflow: "hidden", marginTop: 14 }}>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 46,
              opacity: 0.86,
              translate: `0px ${reveal(9)}%`,
            }}
          >
            {sub}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** Dot pinned on a product detail + a line that draws out to the label. */
export const Callout: React.FC<{
  x: number;
  y: number;
  toX: number;
  toY: number;
  at: number;
}> = ({ x, y, toX, toY, at }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [at + 4, at + 16], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const len = Math.hypot(toX - x, toY - y);
  const pulse = interpolate((frame - at) % 30, [0, 30], [1, 2.6], clamp);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <circle
        cx={x}
        cy={y}
        r={22 * pulse}
        fill="none"
        stroke="white"
        strokeWidth={2}
        opacity={frame < at ? 0 : interpolate(pulse, [1, 2.6], [0.9, 0])}
      />
      <circle
        cx={x}
        cy={y}
        r={interpolate(frame, [at, at + 6], [0, 12], { ...clamp, easing: Easing.back(3) })}
        fill="white"
      />
      <line
        x1={x}
        y1={y}
        x2={toX}
        y2={toY}
        stroke="white"
        strokeWidth={3}
        strokeDasharray={len}
        strokeDashoffset={len * (1 - draw)}
      />
    </svg>
  );
};
