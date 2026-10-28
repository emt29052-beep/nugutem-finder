import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/** Deep-blue water column with drifting surface light — used for the MoreDeep scenes. */
export const WaterBackground: React.FC<{ descend?: number }> = ({ descend = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: "linear-gradient(to bottom, #2a8fc4 0%, #0b4f7a 30%, #042a45 65%, #010c16 100%)",
          height: "130%",
          translate: `0px ${interpolate(frame, [0, 120], [0, -300 * descend], {
            extrapolateRight: "extend",
          })}px`,
        }}
      />
      {/* caustic light rays from the surface */}
      {[0, 1, 2].map((i) => (
        <AbsoluteFill
          key={i}
          style={{
            background: `conic-gradient(from ${170 + i * 7}deg at ${30 + i * 22}% -12%, rgba(0,0,0,0) 0deg, rgba(190,235,255,${
              0.16 - i * 0.03
            }) ${6 + i * 2}deg, rgba(0,0,0,0) ${14 + i * 3}deg)`,
            rotate: `${Math.sin(frame / (22 + i * 9) + i) * 4}deg`,
            mixBlendMode: "screen",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Instagram-style glyph (rounded square + lens), drawn so it needs no assets. */
export const InstaGlyph: React.FC<{ size: number; color?: string }> = ({ size, color = "white" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.3" cy="6.7" r="1" fill={color} stroke="none" />
  </svg>
);
