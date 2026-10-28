import { Composition, Folder } from "remotion";
import { AD_DURATION, ChakAd } from "./ChakAd";
import { DetailScene } from "./scenes/DetailScene";
import { EndScene } from "./scenes/EndScene";
import { HeroScene } from "./scenes/HeroScene";
import { HookScene } from "./scenes/HookScene";
import { LifestyleScene } from "./scenes/LifestyleScene";
import { PouchScene } from "./scenes/PouchScene";
import { RealShotScene } from "./scenes/RealShotScene";
import { FPS, HEIGHT, WIDTH } from "./theme";

const scene = { fps: FPS, width: WIDTH, height: HEIGHT };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="ChakAd" component={ChakAd} durationInFrames={AD_DURATION} {...scene} />
      <Folder name="ChakAd-Scenes">
        <Composition id="Hook" component={HookScene} durationInFrames={75} {...scene} />
        <Composition id="Hero" component={HeroScene} durationInFrames={120} {...scene} />
        <Composition id="Detail" component={DetailScene} durationInFrames={180} {...scene} />
        <Composition id="Lifestyle" component={LifestyleScene} durationInFrames={90} {...scene} />
        <Composition id="Pouch" component={PouchScene} durationInFrames={120} {...scene} />
        <Composition id="RealShot" component={RealShotScene} durationInFrames={90} {...scene} />
        <Composition id="End" component={EndScene} durationInFrames={135} {...scene} />
      </Folder>
    </>
  );
};
