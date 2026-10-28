import { contrast } from "@remotion/effects/contrast";
import React from "react";
import { AbsoluteFill, Easing, interpolate, Series, useCurrentFrame } from "remotion";
import { Camera, IMAGES, Photo } from "../components/Photo";
import { COMIC } from "../theme";
import { Burst, Halftone, MemeCaption, Panel, popIn } from "./Comic";

type Img = (typeof IMAGES)[keyof typeof IMAGES];

const Feature: React.FC<{
  img: Img;
  cam: Camera;
  bg: string;
  tilt: number;
  sticker: string;
  title: string;
  sub: string;
}> = ({ img, cam, bg, tilt, sticker, title, sub }) => {
  const frame = useCurrentFrame();
  const zoom = cam.zoom * interpolate(frame, [0, 8], [1.35, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.6)),
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Halftone bg={bg} />
      <Panel x={100} y={250} w={880} h={1000} rotate={tilt}>
        <Photo {...img} vw={880} vh={1000} cam={{ ...cam, zoom }} effects={[contrast({ amount: 1.15 })]} />
      </Panel>
      <Burst x={tilt > 0 ? 200 : 870} y={300} size={300} text={sticker} at={10} rotate={tilt * 5} />
      <div style={{ position: "absolute", top: 1360, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <MemeCaption words={[title]} at={4} bg="#111" color="white" fontSize={100} rotate={-tilt} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1560,
          left: 80,
          right: 80,
          textAlign: "center",
          fontFamily: COMIC,
          fontSize: 66,
          lineHeight: 1.25,
          color: "#111",
          scale: popIn(frame, 14, 8),
        }}
      >
        {sub}
      </div>
    </AbsoluteFill>
  );
};

// 180f: three 60f feature gags.
export const ComicFeatures: React.FC = () => (
  <AbsoluteFill>
    <Series>
      <Series.Sequence name="Slider" durationInFrames={60}>
        <Feature
          img={IMAGES.macro1}
          cam={{ fx: 0.45, fy: 0.5, px: 440, py: 500, zoom: 1.6 }}
          bg="#ffe600"
          tilt={-2}
          sticker="딸깍"
          title="톱니 슬라이드"
          sub="코 크기? 딸깍딸깍 맞추면 끝"
        />
      </Series.Sequence>
      <Series.Sequence name="Pads" durationInFrames={60}>
        <Feature
          img={IMAGES.macro3}
          cam={{ fx: 0.82, fy: 0.64, px: 500, py: 480, zoom: 1.9 }}
          bg="#ff9ec4"
          tilt={2}
          sticker="말랑"
          title="소프트 패드"
          sub="코 꼬집는 아픔 말고, 말랑하게"
        />
      </Series.Sequence>
      <Series.Sequence name="Strap" durationInFrames={60}>
        <Feature
          img={IMAGES.side}
          cam={{ fx: 0.42, fy: 0.3, px: 440, py: 420, zoom: 1.4 }}
          bg="#7fd3ff"
          tilt={-2}
          sticker="휴~"
          title="넥 스트랩"
          sub="목에 걸면 바다에 기부할 일 없음"
        />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
