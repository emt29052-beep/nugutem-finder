import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Bubbles, Grain, shake } from "../components/Overlays";
import { BrushChak, StaggerText } from "../components/Type";
import { DISPLAY, SANS } from "../theme";

// 0 - 75f. Black water: "노즈클립, 또 바꿨어요?" then the brush "착" slams on the beat (45f).
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const SLAM = 45;
  return (
    <AbsoluteFill style={{ backgroundColor: "#020304", overflow: "hidden" }}>
      <AbsoluteFill style={{ translate: shake(frame, SLAM, 30, 16) }}>
        {/* light beam from the surface */}
        <AbsoluteFill
          style={{
            background:
              "conic-gradient(from 168deg at 50% -8%, rgba(0,0,0,0) 0deg, rgba(150,210,255,0.22) 12deg, rgba(0,0,0,0) 24deg)",
            opacity: interpolate(frame, [0, 20, SLAM, SLAM + 2], [0, 0.8, 1, 1.6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            rotate: `${interpolate(frame, [0, 75], [-3, 3])}deg`,
          }}
        />
        <Bubbles count={30} seed="hook" opacity={0.45} />

        {/* pre-slam line */}
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: interpolate(frame, [SLAM - 4, SLAM], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <StaggerText
            text="노즈클립,"
            at={3}
            step={2}
            style={{ fontFamily: SANS, fontWeight: 900, fontSize: 96, color: "white", letterSpacing: -2 }}
          />
          <StaggerText
            text="또 바꿨어요?"
            at={12}
            step={2}
            style={{ fontFamily: SANS, fontWeight: 900, fontSize: 96, color: "white", letterSpacing: -2 }}
          />
          <StaggerText
            text="NOSECLIP NOMAD"
            at={24}
            step={1}
            style={{
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: 36,
              letterSpacing: 14,
              color: "#8fcfff",
              marginTop: 30,
            }}
          />
        </AbsoluteFill>

        {/* the slam */}
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <BrushChak at={SLAM} size={560} />
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: 40,
              letterSpacing: 22,
              color: "white",
              marginTop: 10,
              opacity: interpolate(frame, [SLAM + 8, SLAM + 18], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: `0px ${interpolate(frame, [SLAM + 8, SLAM + 20], [30, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}px`,
            }}
          >
            NOSECLIP PRO
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* impact flash */}
      <AbsoluteFill
        style={{
          backgroundColor: "white",
          opacity: interpolate(frame, [SLAM - 1, SLAM, SLAM + 5], [0, 0.9, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <Grain opacity={0.14} />
    </AbsoluteFill>
  );
};
