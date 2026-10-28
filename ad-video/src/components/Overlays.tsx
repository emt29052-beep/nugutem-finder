import { lightLeak } from "@remotion/effects/light-leak";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  Solid,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/** Animated film grain: SVG turbulence with a new seed every 2 frames. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.09 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Cinematic letterbox-free vignette done in CSS so it sits above text too. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** Cool-toned light leak, played over cuts (water/light motif). */
export const LightLeakOverlay: React.FC<{ seed?: number; hueShift?: number }> = ({
  seed = 0,
  hueShift = 190,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, height, width } = useVideoConfig();
  return (
    <Solid
      width={width}
      height={height}
      style={{ mixBlendMode: "screen" }}
      effects={[
        lightLeak({
          seed,
          hueShift,
          progress: interpolate(frame, [0, durationInFrames - 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }),
      ]}
    />
  );
};

/** Hard white flash that decays — used on beat cuts. */
export const FlashOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        opacity: interpolate(
          frame,
          [0, durationInFrames / 2, durationInFrames],
          [0, 0.85, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          },
        ),
      }}
    />
  );
};

/** Rising bubbles — underwater feeling for the dark scenes. */
export const Bubbles: React.FC<{ count?: number; seed?: string; opacity?: number }> = ({
  count = 26,
  seed = "b",
  opacity = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(count).fill(0).map((_, i) => {
        const size = 4 + random(`${seed}-s-${i}`) * 18;
        const speed = 2 + random(`${seed}-v-${i}`) * 5;
        const x0 = random(`${seed}-x-${i}`) * width;
        const y = height + 40 - ((random(`${seed}-y-${i}`) * height + frame * speed) % (height + 80));
        const wobble = Math.sin(frame / (8 + i % 5) + i) * 10;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x0 + wobble,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              border: "1.5px solid rgba(200,235,255,0.8)",
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), rgba(255,255,255,0) 60%)",
              opacity: opacity * (0.4 + random(`${seed}-o-${i}`) * 0.6),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Camera shake offset in px for a decaying impact starting at `at`. */
export const shake = (frame: number, at: number, power = 26, duration = 14) => {
  const t = frame - at;
  if (t < 0 || t > duration) return "0px 0px";
  const decay = 1 - t / duration;
  const x = (random(`sx-${at}-${t}`) - 0.5) * 2 * power * decay;
  const y = (random(`sy-${at}-${t}`) - 0.5) * 2 * power * decay;
  return `${x}px ${y}px`;
};
