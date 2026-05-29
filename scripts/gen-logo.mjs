// One-shot: derive transparent logo variants from the supplied source SVG.
// Removes the baked-in white background rect; splits the speech-bubble mark
// from the "gonatter" wordmark so we can recolour per background.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = process.argv[2];
const OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });

const raw = readFileSync(SRC, "utf8");

// Pull every <path .../> in document order.
const paths = [...raw.matchAll(/<path\b[^>]*\/>/g)].map((m) => m[0]);
// Index 0 = white full-canvas background rect → drop it.
// 1..3 = mark (coral bubble, navy overlap, teal bubble). 4..end = wordmark.
const mark = paths.slice(1, 4);
const wordmark = paths.slice(4);

const SVG_OPEN_FULL =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1768" height="707" viewBox="0 0 1768 707" role="img" aria-label="gonatter">';
const SVG_OPEN_MARK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="395" height="395" viewBox="176 146 395 395" role="img" aria-label="gonatter">';
const SVG_CLOSE = "</svg>";

const recolourForDark = (p) =>
  p
    .replace(/fill="#1C3045"/g, 'fill="#FFFFFF"')
    .replace(/fill="white"/g, 'fill="#1C3045"');

// Light backgrounds: navy wordmark, white counters (as drawn).
writeFileSync(
  `${OUT}/logo-light.svg`,
  SVG_OPEN_FULL + mark.join("") + wordmark.join("") + SVG_CLOSE,
);

// Dark backgrounds: white wordmark + navy counters; mark left intact.
writeFileSync(
  `${OUT}/logo-dark.svg`,
  SVG_OPEN_FULL + mark.join("") + wordmark.map(recolourForDark).join("") + SVG_CLOSE,
);

// Mark only (app icon), tight square viewBox.
writeFileSync(`${OUT}/logo-mark.svg`, SVG_OPEN_MARK + mark.join("") + SVG_CLOSE);

console.log(`Wrote logo-light.svg, logo-dark.svg, logo-mark.svg (${paths.length} source paths) to ${OUT}`);
