import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Bubbles } from "../components/Overlays";
import { WaterBackground } from "../components/Water";
import { COMIC, POP } from "../theme";
import { popIn } from "./Comic";

const PILLARS = ["안전하고", "재밌고", "스트레스 없이"];

// 90f: where to learn — 모어딥 프리다이빙.
export const ComicMoreDeep: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <WaterBackground />
      <Bubbles count={40} seed="comic-md" opacity={0.6} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 80 }}>
        <div style={{ fontFamily: COMIC, fontSize: 70, color: "#d6f1ff", scale: popIn(frame, 2, 8) }}>
          그래서 준비한 곳
        </div>
        <div
          style={{
            fontFamily: POP,
            fontSize: 140,
            color: "white",
            WebkitTextStroke: "5px #111",
            textShadow: "10px 10px 0 #111",
            marginTop: 30,
            rotate: "-3deg",
            scale: popIn(frame, 12, 8),
          }}
        >
          모어딥 프리다이빙
        </div>
        <div style={{ fontFamily: COMIC, fontSize: 56, color: "#d6f1ff", marginTop: 34, scale: popIn(frame, 24, 8) }}>
          프리다이빙 · 머메이드 교육센터
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 80 }}>
          {PILLARS.map((p, i) => (
            <div
              key={p}
              style={{
                padding: "16px 32px",
                borderRadius: 999,
                backgroundColor: ["#ffe600", "#ff9ec4", "#7fd3ff"][i],
                border: "6px solid #111",
                boxShadow: "6px 6px 0 #111",
                fontFamily: COMIC,
                fontSize: 50,
                color: "#111",
                scale: popIn(frame, 36 + i * 6, 7),
              }}
            >
              {p}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: COMIC, fontSize: 54, color: "white", marginTop: 70, scale: popIn(frame, 58, 8) }}>
          노즈클립 쓰는 법부터 차근차근
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
