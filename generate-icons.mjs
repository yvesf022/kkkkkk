/**
 * generate-icons.mjs
 *
 * Generates all required PWA icons from a base SVG.
 * Run once with: node generate-icons.mjs
 *
 * Requires: sharp
 *   npm install --save-dev sharp
 */

import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "public", "icons");
mkdirSync(OUT_DIR, { recursive: true });

/* ── Base SVG (the K logo) ── */
const svgSource = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0033a0"/>
      <stop offset="100%" stop-color="#009543"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="114" fill="url(#g)"/>
  <text
    x="256" y="370"
    text-anchor="middle"
    font-size="300"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    fill="#ffffff"
  >K</text>
</svg>
`);

/* ── Maskable SVG (full bleed, K stays within safe zone) ── */
const svgMaskable = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0033a0"/>
      <stop offset="100%" stop-color="#009543"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <text
    x="256" y="330"
    text-anchor="middle"
    font-size="220"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    fill="#ffffff"
  >K</text>
</svg>
`);

/* ── All sizes needed ── */
const SIZES = [16, 32, 72, 96, 120, 128, 144, 152, 180, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

async function generate() {
  console.log("Generating PWA icons...\n");

  for (const size of SIZES) {
    const isMaskable = MASKABLE_SIZES.includes(size);
    const src = isMaskable ? svgMaskable : svgSource;

    await sharp(src)
      .resize(size, size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(join(OUT_DIR, `icon-${size}x${size}.png`));

    console.log(`  icon-${size}x${size}.png${isMaskable ? "  (maskable)" : ""}`);
  }

  /* Apple touch icons */
  await sharp(svgSource)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(join(OUT_DIR, "apple-touch-icon.png"));
  console.log("  apple-touch-icon.png (180x180)");

  for (const size of [76, 120, 144, 152]) {
    await sharp(svgSource)
      .resize(size, size)
      .png({ quality: 100 })
      .toFile(join(OUT_DIR, `apple-touch-icon-${size}x${size}.png`));
    console.log(`  apple-touch-icon-${size}x${size}.png`);
  }

  console.log("\nAll icons saved to /public/icons/");
}

generate().catch(console.error);
