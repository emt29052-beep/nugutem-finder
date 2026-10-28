import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Bubbles, Grain } from "../components/Overlays";
import { StaggerText } from "../components/Type";
import { WaterBackground } from "../components/Water";
import { SANS } from "../theme";

const PILLARS = ["안전하고", "재밌고", "스트레스 없이"];

// 150f: sinking into blue water — "노즈클립만으로 딥다이버가 될까요?" → "아니요." → learn it at 모어딥 프리다이빙.
export const MoreDeepScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#021422", overflow: "hidden" }}>
      <WaterBackground />
      <Bubbles count={34} seed="moredeep" opacity={0.55} />

      {/* depth line with ticks scrolling up — feeling of going deeper, no numbers */}
      <div style={{ position: "absolute", right: 70, top: 0, bottom: 0, width: 40, overflow: "hidden" }}>
        {new Array(24).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              right: 0,
              top: ((i * 90 - frame * 6) % 2160 + 2160) % 2160 - 120,
              width: i % 4 === 0 ? 40 : 18,
              height: 3,
              backgroundColor: "rgba(200,235,255,0.45)",
            }}
          />
        ))}
      </div>

      {/* beat 1 (0-57f): the question — a clip alone doesn't make a deep diver */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 120,
          opacity: interpolate(frame, [52, 57], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <StaggerText
          text="노즈클립만으로"
          at={3}
          step={2}
          style={{ fontFamily: SANS, fontWeight: 900, fontSize: 92, color: "white", letterSpacing: -2 }}
        />
        <StaggerText
          text="딥다이버가 될까요?"
          at={14}
          step={2}
          style={{ fontFamily: SANS, fontWeight: 900, fontSize: 92, color: "#9fdcff", letterSpacing: -2 }}
        />
      </AbsoluteFill>

      {/* beat 2 (57-78f): the answer */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 120,
          opacity: interpolate(frame, [56, 58, 74, 79], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 210,
            letterSpacing: -6,
            color: "white",
            textShadow: "0 14px 50px rgba(0,30,60,0.7)",
            scale: interpolate(frame, [57, 63], [1.6, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.back(1.8)),
            }),
          }}
        >
          아니요.
        </div>
      </AbsoluteFill>

      {/* beat 3 (78-150f): where to learn it properly */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 120,
          opacity: interpolate(frame, [78, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 48, color: "#d6f1ff" }}>제대로 배우는 곳</div>
        <div style={{ overflow: "hidden", marginTop: 14 }}>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: 124,
              letterSpacing: -3,
              color: "white",
              textShadow: "0 10px 40px rgba(0,40,80,0.6)",
              translate: `0px ${interpolate(frame, [82, 96], [110, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}%`,
            }}
          >
            모어딥 프리다이빙
          </div>
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 44,
            color: "#d6f1ff",
            marginTop: 18,
            opacity: interpolate(frame, [94, 104], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          이퀄라이징부터 차근차근
        </div>

        <div style={{ display: "flex", gap: 22, marginTop: 80 }}>
          {PILLARS.map((p, i) => {
            const at = 104 + i * 6;
            return (
              <div
                key={p}
                style={{
                  padding: "18px 34px",
                  borderRadius: 999,
                  border: "2px solid rgba(214,241,255,0.8)",
                  backgroundColor: "rgba(4,42,69,0.55)",
                  fontFamily: SANS,
                  fontWeight: 900,
                  fontSize: 42,
                  color: "white",
                  opacity: interpolate(frame, [at, at + 6], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  scale: interpolate(frame, [at, at + 8], [0.6, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.out(Easing.back(2.2)),
                  }),
                }}
              >
                {p}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};
