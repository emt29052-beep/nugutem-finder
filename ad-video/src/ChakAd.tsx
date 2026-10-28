import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile } from "remotion";
import { FlashOverlay, LightLeakOverlay } from "./components/Overlays";
import { DetailScene } from "./scenes/DetailScene";
import { EndScene } from "./scenes/EndScene";
import { HeroScene } from "./scenes/HeroScene";
import { HookScene } from "./scenes/HookScene";
import { LifestyleScene } from "./scenes/LifestyleScene";
import { PouchScene } from "./scenes/PouchScene";
import { RealShotScene } from "./scenes/RealShotScene";

// 30fps, 120 BPM: one beat = 15 frames. Cuts only use overlays so scene starts stay on the grid:
// Hook 0 · Hero 75 · Detail 195 · Lifestyle 375 · Pouch 465 · Real 585 · End 675 · total 810.
export const AD_DURATION = 810;

const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.8 }) => (
  <Sequence from={at} name={src} layout="none">
    <Audio src={staticFile(`sfx/${src}.wav`)} volume={volume} />
  </Sequence>
);

export const ChakAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={75}>
          <HookScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={24}>
          <LightLeakOverlay seed={3} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="Hero" durationInFrames={120}>
          <HeroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={6}>
          <FlashOverlay />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="Detail" durationInFrames={180}>
          <DetailScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={20}>
          <LightLeakOverlay seed={8} hueShift={200} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="Lifestyle" durationInFrames={90}>
          <LifestyleScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={6}>
          <FlashOverlay />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="Pouch" durationInFrames={120}>
          <PouchScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={24}>
          <LightLeakOverlay seed={12} hueShift={180} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="RealShot" durationInFrames={90}>
          <RealShotScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="End" durationInFrames={135}>
          <EndScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Audio
        src={staticFile("audio/music.wav")}
        volume={(f) => interpolate(f, [0, 6, 780, 810], [0, 0.75, 0.75, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <Sfx at={45} src="chak" volume={0.7} />
      <Sfx at={63} src="whoosh" />
      <Sfx at={109} src="shine" volume={0.35} />
      <Sfx at={190} src="whoosh-short" />
      <Sfx at={203} src="chak" volume={0.6} />
      <Sfx at={250} src="whoosh-short" />
      <Sfx at={263} src="chak" volume={0.6} />
      <Sfx at={310} src="whoosh-short" />
      <Sfx at={323} src="chak" volume={0.6} />
      <Sfx at={365} src="whoosh" volume={0.6} />
      <Sfx at={460} src="whoosh-short" />
      <Sfx at={483} src="shine" volume={0.35} />
      <Sfx at={535} src="whoosh-short" volume={0.6} />
      <Sfx at={591} src="shutter" />
      <Sfx at={609} src="shutter" />
      <Sfx at={627} src="shutter" />
      <Sfx at={645} src="shutter" />
      <Sfx at={675} src="chak" volume={0.7} />
    </AbsoluteFill>
  );
};
