// Downloads glyph-subsetted fonts (Korean + Oswald) from Google Fonts for every Hangul
// character used in src/. Re-run after changing any Korean copy:
//   node scripts/fetch-fonts.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const source = walk(join(root, "src")).map((f) => readFileSync(f, "utf8")).join("");
const chars = [...new Set(source.match(/[가-힣]/g))].join("");
const text = chars + "0123456789.,!?·●~:)@_ ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const fonts = [
  { out: "brush.woff2", family: "East Sea Dokdo", weight: 400 },
  { out: "sans-900.woff2", family: "Noto Sans KR", weight: 900 },
  { out: "sans-500.woff2", family: "Noto Sans KR", weight: 500 },
  { out: "oswald-300.woff2", family: "Oswald", weight: 300 },
  { out: "oswald-600.woff2", family: "Oswald", weight: 600 },
  { out: "jua.woff2", family: "Jua", weight: 400 },
  { out: "blackhan.woff2", family: "Black Han Sans", weight: 400 },
];

mkdirSync(join(root, "public/fonts"), { recursive: true });
for (const f of fonts) {
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@${f.weight}&text=${encodeURIComponent(text)}`,
      // a modern UA makes Google serve woff2
      { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36" } },
    )
  ).text();
  const url = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error(`No font url for ${f.family}: ${css}`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(join(root, "public/fonts", f.out), buf);
  console.log(f.out, buf.length, "bytes");
}
console.log(`${chars.length} hangul glyphs`);
