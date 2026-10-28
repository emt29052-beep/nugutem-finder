import { Composition, Folder } from "remotion";
import { AD_DURATION, ChakAd } from "./ChakAd";
import { COMIC_DURATION, ComicAd } from "./comic/ComicAd";
import { ComicEnd } from "./comic/ComicEnd";
import { ComicFeatures } from "./comic/ComicFeatures";
import { ComicHook } from "./comic/ComicHook";
import { ComicMoreDeep } from "./comic/ComicMoreDeep";
import { ComicPain } from "./comic/ComicPain";
import { ComicPouch } from "./comic/ComicPouch";
import { ComicReveal } from "./comic/ComicReveal";
import { ComicTwist } from "./comic/ComicTwist";
import { DetailScene } from "./scenes/DetailScene";
import { EndScene } from "./scenes/EndScene";
import { HeroScene } from "./scenes/HeroScene";
import { HookScene } from "./scenes/HookScene";
import { LifestyleScene } from "./scenes/LifestyleScene";
import { MoreDeepScene } from "./scenes/MoreDeepScene";
import { PouchScene } from "./scenes/PouchScene";
import { RealShotScene } from "./scenes/RealShotScene";
import { FPS, HEIGHT, WIDTH } from "./theme";

const scene = { fps: FPS, width: WIDTH, height: HEIGHT };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="ChakAd" component={ChakAd} durationInFrames={AD_DURATION} {...scene} />
      <Composition
        id="ChakAdNarrated"
        component={ChakAd}
        durationInFrames={AD_DURATION}
        defaultProps={{ narration: "cinematic" as const }}
        {...scene}
      />
      <Folder name="ChakAd-Scenes">
        <Composition id="Hook" component={HookScene} durationInFrames={75} {...scene} />
        <Composition id="Hero" component={HeroScene} durationInFrames={120} {...scene} />
        <Composition id="Detail" component={DetailScene} durationInFrames={180} {...scene} />
        <Composition id="Lifestyle" component={LifestyleScene} durationInFrames={90} {...scene} />
        <Composition id="Pouch" component={PouchScene} durationInFrames={120} {...scene} />
        <Composition id="RealShot" component={RealShotScene} durationInFrames={90} {...scene} />
        <Composition id="MoreDeep" component={MoreDeepScene} durationInFrames={150} {...scene} />
        <Composition id="End" component={EndScene} durationInFrames={135} {...scene} />
      </Folder>
      <Composition id="ChakComic" component={ComicAd} durationInFrames={COMIC_DURATION} {...scene} />
      <Composition
        id="ChakComicNarrated"
        component={ComicAd}
        durationInFrames={COMIC_DURATION}
        defaultProps={{ narration: "comic" as const }}
        {...scene}
      />
      <Folder name="ChakComic-Scenes">
        <Composition id="ComicHook" component={ComicHook} durationInFrames={90} {...scene} />
        <Composition id="ComicPain" component={ComicPain} durationInFrames={120} {...scene} />
        <Composition id="ComicReveal" component={ComicReveal} durationInFrames={90} {...scene} />
        <Composition id="ComicFeatures" component={ComicFeatures} durationInFrames={180} {...scene} />
        <Composition id="ComicPouch" component={ComicPouch} durationInFrames={90} {...scene} />
        <Composition id="ComicTwist" component={ComicTwist} durationInFrames={120} {...scene} />
        <Composition id="ComicMoreDeep" component={ComicMoreDeep} durationInFrames={90} {...scene} />
        <Composition id="ComicEnd" component={ComicEnd} durationInFrames={90} {...scene} />
      </Folder>
    </>
  );
};
