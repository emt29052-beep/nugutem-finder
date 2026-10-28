import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile } from "remotion";
import { duckMusic, Narration, NarrationCut } from "../components/Narration";
import { FlashOverlay } from "../components/Overlays";
import { ComicEnd } from "./ComicEnd";
import { ComicFeatures } from "./ComicFeatures";
import { ComicHook } from "./ComicHook";
import { ComicMoreDeep } from "./ComicMoreDeep";
import { ComicPain } from "./ComicPain";
import { ComicPouch } from "./ComicPouch";
import { ComicReveal } from "./ComicReveal";
import { ComicTwist } from "./ComicTwist";

// Comic cut, 30fps / 120 BPM. Scene starts (frames):
// Hook 0 · Pain 90 · Reveal 210 · Features 300 · Pouch 480 · Twist 570 (scratch at 615) · MoreDeep 690 · End 780 · total 870.
export const COMIC_DURATION = 870;

const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.8 }) => (
  <Sequence from={at} name={src} layout="none">
    <Audio src={staticFile(`sfx/${src}.wav`)} volume={volume} />
  </Sequence>
);

export const ComicAd: React.FC<{ narration?: NarrationCut }> = ({ narration }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={90}>
          <ComicHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Pain" durationInFrames={120}>
          <ComicPain />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Reveal" durationInFrames={90}>
          <ComicReveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={6}>
          <FlashOverlay />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="Features" durationInFrames={180}>
          <ComicFeatures />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Pouch" durationInFrames={90}>
          <ComicPouch />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Twist" durationInFrames={120}>
          <ComicTwist />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={6}>
          <FlashOverlay />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="MoreDeep" durationInFrames={90}>
          <ComicMoreDeep />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="End" durationInFrames={90}>
          <ComicEnd />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Audio
        src={staticFile("audio/music-comic.wav")}
        volume={(f) =>
          interpolate(f, [0, 3, 850, 870], [0, 0.7, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
          duckMusic(f, narration)
        }
      />
      {/* Hook */}
      <Sfx at={0} src="boing" />
      {[3, 8, 13, 18, 23].map((f) => (
        <Sfx key={f} at={f} src="pop" volume={0.5} />
      ))}
      <Sfx at={38} src="boing" volume={0.6} />
      {/* Pain */}
      <Sfx at={91} src="pop" />
      <Sfx at={110} src="chak" volume={0.7} />
      <Sfx at={151} src="pop" />
      <Sfx at={170} src="slide-down" volume={0.6} />
      <Sfx at={172} src="boing" volume={0.5} />
      {/* Reveal */}
      <Sfx at={212} src="pop" volume={0.5} />
      <Sfx at={234} src="whoosh-short" />
      <Sfx at={240} src="chak" volume={0.9} />
      <Sfx at={243} src="boing" volume={0.6} />
      {/* Features */}
      <Sfx at={300} src="whoosh-short" volume={0.6} />
      <Sfx at={310} src="pop" />
      <Sfx at={360} src="whoosh-short" volume={0.6} />
      <Sfx at={370} src="chak" volume={0.6} />
      <Sfx at={376} src="chak" volume={0.6} />
      <Sfx at={420} src="whoosh-short" volume={0.6} />
      <Sfx at={434} src="slide-down" volume={0.5} />
      {/* Pouch */}
      <Sfx at={484} src="pop" volume={0.6} />
      <Sfx at={520} src="ding" volume={0.7} />
      {/* Twist: record scratch on the freeze, music drops for a beat */}
      <Sfx at={572} src="pop" volume={0.5} />
      <Sfx at={590} src="pop" volume={0.5} />
      <Sfx at={615} src="scratch" volume={0.9} />
      <Sfx at={645} src="pop" />
      {/* MoreDeep */}
      <Sfx at={690} src="bubbles" volume={0.6} />
      <Sfx at={702} src="pop" />
      {/* End */}
      <Sfx at={780} src="boing" volume={0.6} />
      <Sfx at={808} src="pop" />
      {narration ? <Narration cut={narration} /> : null}
    </AbsoluteFill>
  );
};
