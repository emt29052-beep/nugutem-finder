import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, Sequence, staticFile } from "remotion";
import cinematic from "../voiceover/cinematic.json";
import comic from "../voiceover/comic.json";
import { FPS } from "../theme";

export type NarrationCut = "cinematic" | "comic";

type Line = { file: string; start: number; duration: number; text: string };

// Written by scripts/make-voiceover.py (Supertonic TTS).
const TIMELINES: Record<NarrationCut, Line[]> = { cinematic, comic };

/** Music gain multiplier: dips under every narration line with short ramps. */
export const duckMusic = (frame: number, cut: NarrationCut | undefined, depth = 0.32) => {
  if (!cut) return 1;
  const ramp = 4;
  let gain = 1;
  for (const l of TIMELINES[cut]) {
    const a = l.start * FPS;
    const b = (l.start + l.duration) * FPS;
    const g = interpolate(frame, [a - ramp, a, b, b + ramp * 2], [1, depth, depth, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    gain = Math.min(gain, g);
  }
  return gain;
};

export const Narration: React.FC<{ cut: NarrationCut; volume?: number }> = ({ cut, volume = 1 }) => (
  <>
    {TIMELINES[cut].map((l) => (
      <Sequence key={l.file} from={Math.round(l.start * FPS)} name={l.text} layout="none">
        <Audio src={staticFile(l.file)} volume={volume} />
      </Sequence>
    ))}
  </>
);
