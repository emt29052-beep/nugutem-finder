import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Bubbles, Grain } from "../components/Overlays";
import { StaggerText } from "../components/Type";
import { WaterBackground } from "../components/Water";
import { DISPLAY, SANS } from "../theme";

const PILLARS = ["안전하고", "재밌고", "스트레스 없이"];

// 120f: the camera sinks into blue water — "learn it properly at 모어딥 프리다이빙".
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

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120 }}>
        <StaggerText
          text="노즈클립, 제대로 쓰고 싶다면"
          at={4}
          step={1}
          style={{ fontFamily: SANS, fontWeight: 500, fontSize: 50, color: "#d6f1ff" }}
        />
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 38,
            letterSpacing: 16,
            color: "#9fdcff",
            marginTop: 70,
            opacity: interpolate(frame, [16, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          LEARN WITH
        </div>
        <div style={{ overflow: "hidden", marginTop: 6 }}>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: 124,
              letterSpacing: -3,
              color: "white",
              textShadow: "0 10px 40px rgba(0,40,80,0.6)",
              translate: `0px ${interpolate(frame, [20, 36], [110, 0], {
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
            opacity: interpolate(frame, [34, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          프리다이빙 · 머메이드 교육센터
        </div>

        <div style={{ display: "flex", gap: 22, marginTop: 80 }}>
          {PILLARS.map((p, i) => {
            const at = 52 + i * 8;
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
