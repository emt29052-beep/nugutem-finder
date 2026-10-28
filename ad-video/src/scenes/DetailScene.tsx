import { contrast } from "@remotion/effects/contrast";
import { saturation } from "@remotion/effects/saturation";
import { zoomBlur } from "@remotion/effects/zoom-blur";
import React from "react";
import { AbsoluteFill, Easing, interpolate, Series, useCurrentFrame } from "remotion";
import { Grain, Vignette } from "../components/Overlays";
import { Camera, frameImage, IMAGES, Photo } from "../components/Photo";
import { Callout, Headline } from "../components/Type";

type Img = (typeof IMAGES)[keyof typeof IMAGES];

/** One macro shot: punch-in with zoom blur, drift, callout pinned to the detail. */
const DetailShot: React.FC<{
  img: Img;
  from: Camera;
  to: Camera;
  label: { x: number; y: number };
  kicker: string;
  title: string;
  sub: string;
}> = ({ img, from, to, label, kicker, title, sub }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.1, 0.8, 0.3, 1),
  });
  const cam: Camera = {
    fx: from.fx + (to.fx - from.fx) * t,
    fy: from.fy + (to.fy - from.fy) * t,
    px: from.px + (to.px - from.px) * t,
    py: from.py + (to.py - from.py) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t,
  };
  const box = frameImage(img.iw, img.ih, cam);
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <Photo
        {...img}
        cam={cam}
        effects={[
          saturation({ amount: 0 }),
          contrast({ amount: 1.28 }),
          zoomBlur({
            amount: interpolate(frame, [0, 9], [70, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            center: [cam.fx, cam.fy],
          }),
        ]}
      />
      <Vignette strength={0.6} />
      <AbsoluteFill
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0) 48%)",
        }}
      />
      <Callout x={box.focusX} y={box.focusY} toX={label.x} toY={label.y} at={8} />
      <div style={{ position: "absolute", left: 90, right: 90, top: label.y + 24 }}>
        <Headline kicker={kicker} title={title} sub={sub} at={14} />
      </div>
    </AbsoluteFill>
  );
};

// 180f = 3 beat-synced macro shots of 60f.
export const DetailScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Series>
        <Series.Sequence name="Slider" durationInFrames={60}>
          <DetailShot
            img={IMAGES.macro1}
            from={{ fx: 0.45, fy: 0.5, px: 540, py: 700, zoom: 2.3 }}
            to={{ fx: 0.45, fy: 0.5, px: 560, py: 700, zoom: 1.75 }}
            label={{ x: 90, y: 1180 }}
            kicker="01 · SLIDE ADJUST"
            title="톱니 슬라이드"
            sub="내 코에 딱 맞게 미세 조절"
          />
        </Series.Sequence>
        <Series.Sequence name="Pads" durationInFrames={60}>
          <DetailShot
            img={IMAGES.macro3}
            from={{ fx: 0.82, fy: 0.64, px: 620, py: 640, zoom: 2.6 }}
            to={{ fx: 0.82, fy: 0.64, px: 600, py: 700, zoom: 2.0 }}
            label={{ x: 90, y: 1180 }}
            kicker="02 · SOFT PAD"
            title="소프트 패드"
            sub="오래 껴도 편안한 밀착감"
          />
        </Series.Sequence>
        <Series.Sequence name="Strap" durationInFrames={60}>
          <DetailShot
            img={IMAGES.side}
            from={{ fx: 0.41, fy: 0.1, px: 560, py: 520, zoom: 2.1 }}
            to={{ fx: 0.41, fy: 0.3, px: 560, py: 620, zoom: 1.6 }}
            label={{ x: 90, y: 1180 }}
            kicker="03 · NECK STRAP"
            title="스토퍼 스트랩"
            sub="벗어도 잃어버리지 않게"
          />
        </Series.Sequence>
      </Series>
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};
