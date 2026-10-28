import React from "react";
import { CanvasImage, EffectsProp, staticFile } from "remotion";
import { HEIGHT, WIDTH } from "../theme";

export type Camera = {
  /** focal point in the source image, 0..1 */
  fx: number;
  fy: number;
  /** where the focal point should sit on screen, px */
  px: number;
  py: number;
  /** zoom on top of the cover fit, 1 = cover */
  zoom: number;
};

/**
 * Lays an image out so a focal point lands at a screen position at a given zoom,
 * then clamps so no image edge ever shows. Returns the box plus where the focal
 * point actually landed (used to pin callouts onto product details).
 */
export const frameImage = (iw: number, ih: number, cam: Camera) => {
  const cover = Math.max(WIDTH / iw, HEIGHT / ih);
  const w = iw * cover * cam.zoom;
  const h = ih * cover * cam.zoom;
  const left = Math.min(0, Math.max(WIDTH - w, cam.px - cam.fx * w));
  const top = Math.min(0, Math.max(HEIGHT - h, cam.py - cam.fy * h));
  return { left, top, w, h, focusX: left + cam.fx * w, focusY: top + cam.fy * h };
};

export const Photo: React.FC<{
  src: string;
  iw: number;
  ih: number;
  cam: Camera;
  effects?: EffectsProp;
  rotate?: number;
}> = ({ src, iw, ih, cam, effects, rotate = 0 }) => {
  const box = frameImage(iw, ih, cam);
  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.w,
        height: box.h,
        rotate: `${rotate}deg`,
      }}
    >
      <CanvasImage
        src={staticFile(src)}
        width={iw}
        height={ih}
        effects={effects}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export const IMAGES = {
  concrete: { src: "img/concrete.jpg", iw: 1122, ih: 1402 },
  spotlight: { src: "img/spotlight.jpg", iw: 1122, ih: 1402 },
  pouchDark: { src: "img/pouch-dark.jpg", iw: 1122, ih: 1402 },
  pouchWhite: { src: "img/pouch-white.jpg", iw: 1122, ih: 1402 },
  macro1: { src: "img/macro1.jpg", iw: 1500, ih: 2000 },
  macro2: { src: "img/macro2.jpg", iw: 1500, ih: 2000 },
  macro3: { src: "img/macro3.jpg", iw: 1500, ih: 2000 },
  side: { src: "img/side.jpg", iw: 1500, ih: 2000 },
  silhouette: { src: "img/silhouette.jpg", iw: 1500, ih: 2000 },
  pouchFlat: { src: "img/pouch-flat.jpg", iw: 1500, ih: 2000 },
  pouchHand1: { src: "img/pouch-hand1.jpg", iw: 1500, ih: 2000 },
  pouchHand2: { src: "img/pouch-hand2.jpg", iw: 1500, ih: 2000 },
} as const;
