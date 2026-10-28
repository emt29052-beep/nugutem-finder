import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { frameImage, IMAGES, Photo } from "../components/Photo";
import { GooglyEyes, MemeCaption, SpeechBubble } from "./Comic";

// 90f: the clip gets googly eyes and calls you out. Moves from frame 0 (zoom punch + wobble).
export const ComicHook: React.FC = () => {
  const frame = useCurrentFrame();
  const img = IMAGES.macro1;
  const cam = {
    fx: 0.45,
    fy: 0.5,
    px: 540,
    py: 1080,
    zoom: interpolate(frame, [0, 10], [1.5, 1.15], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.8)),
    }),
  };
  const box = frameImage(img.iw, img.ih, cam);
  const at = (fx: number, fy: number) => ({ x: box.left + fx * box.w, y: box.top + fy * box.h });
  const eyeA = at(0.36, 0.52);
  const eyeB = at(0.5, 0.45);
  return (
    <AbsoluteFill style={{ backgroundColor: "#eee", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          rotate: `${Math.sin(frame / 3) * 4 * Math.exp(-frame / 18)}deg`,
          scale: 1.06,
        }}
      >
        <Photo {...img} cam={cam} />
        <GooglyEyes a={eyeA} b={eyeB} size={130} bumps={[38, 66]} appearAt={2} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 170, left: 90, right: 90, display: "flex", justifyContent: "center" }}>
        <MemeCaption words={["코로", "물", "먹는", "사람", "특징"]} at={3} step={5} fontSize={104} />
      </div>
      <SpeechBubble
        x={170}
        y={1500}
        width={740}
        text="너 또 코로 물 먹었지?"
        at={38}
        tailX={(eyeA.x + eyeB.x) / 2}
        tailY={Math.max(eyeA.y, eyeB.y) + 110}
        fontSize={70}
      />
    </AbsoluteFill>
  );
};
