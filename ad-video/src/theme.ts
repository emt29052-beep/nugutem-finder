import { loadFont as loadLocalFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fonts are bundled + glyph-subsetted (scripts/fetch-fonts.mjs): renders stay fast and offline.
export const BRUSH = "ChakBrush";
export const SANS = "ChakSans";

loadLocalFont({ family: BRUSH, url: staticFile("fonts/brush.woff2") });
loadLocalFont({ family: SANS, url: staticFile("fonts/sans-900.woff2"), weight: "900" });
loadLocalFont({ family: SANS, url: staticFile("fonts/sans-500.woff2"), weight: "500" });

export const DISPLAY = "ChakDisplay";
loadLocalFont({ family: DISPLAY, url: staticFile("fonts/oswald-300.woff2"), weight: "300" });
loadLocalFont({ family: DISPLAY, url: staticFile("fonts/oswald-600.woff2"), weight: "600" });

// Comic cut: round & cute (Jua) for speech, heavy impact (Black Han Sans) for gags.
export const COMIC = "ChakComic";
export const POP = "ChakPop";
loadLocalFont({ family: COMIC, url: staticFile("fonts/jua.woff2") });
loadLocalFont({ family: POP, url: staticFile("fonts/blackhan.woff2") });

export const COLORS = {
  ink: "#050506",
  paper: "#f2f1ee",
  steel: "#9aa3ad",
  water: "#7fd3ff",
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
