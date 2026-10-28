import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { frameImage, IMAGES, Photo } from "../components/Photo";
import { InstaGlyph } from "../components/Water";
import { COMIC, DISPLAY } from "../theme";
import { GooglyEyes, Halftone, Panel, popIn, SpeechBubble } from "./Comic";

const PANEL = { x: 190, y: 200, w: 700, h: 820 };

// 90f: the googly clip winks, says "착! 하고 와요", handle + MoreDeep.
export const ComicEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const img = IMAGES.macro1;
  const cam = { fx: 0.45, fy: 0.5, px: 350, py: 430, zoom: 1.25 };
  const box = frameImage(img.iw, img.ih, cam, PANEL.w, PANEL.h);
  const at = (fx: number, fy: number) => ({ x: PANEL.x + 10 + box.left + fx * box.w, y: PANEL.y + 10 + box.top + fy * box.h });
  const eyeA = at(0.36, 0.52);
  const eyeB = at(0.5, 0.45);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Halftone bg="#ffe600" dot="rgba(255,80,0,0.2)" />
      <div style={{ position: "absolute", inset: 0, scale: popIn(frame, 0, 8), transformOrigin: "540px 600px" }}>
        <Panel {...PANEL}>
          <Photo {...img} vw={PANEL.w} vh={PANEL.h} cam={cam} />
        </Panel>
        <GooglyEyes a={eyeA} b={eyeB} size={110} bumps={[20]} appearAt={4} winkAt={30} />
      </div>
      <SpeechBubble x={170} y={1130} width={740} text="착! 하고 와요" at={12} tailX={eyeB.x} tailY={eyeB.y + 120} fontSize={84} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 180 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "24px 54px",
            borderRadius: 999,
            backgroundColor: "#111",
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 64,
            color: "white",
            boxShadow: "10px 10px 0 #ff2d55",
            scale: popIn(frame, 28, 8),
          }}
        >
          <InstaGlyph size={64} />
          @deepflow_korea
        </div>
        <div style={{ fontFamily: COMIC, fontSize: 54, color: "#111", marginTop: 34, scale: popIn(frame, 38, 8) }}>
          with 모어딥 프리다이빙
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
