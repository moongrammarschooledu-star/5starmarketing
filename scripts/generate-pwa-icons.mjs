// One-off generator for PWA icons from the existing brand mark
// (src/app/icon.svg) — run with `node scripts/generate-pwa-icons.mjs`.
// Not part of the build; output is committed to public/icons/ like any
// other static asset.
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "src/app/icon.svg");
const outDir = path.join(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);
const BRAND_BG = "#ffffff";

async function plainIcon(size, filename) {
  await sharp(svg).resize(size, size).png().toFile(path.join(outDir, filename));
}

/** Maskable icons need real padding (~20%) since Android/iOS crop to a
 *  shape (circle/squircle) that would otherwise clip the full-bleed
 *  artwork in icon.svg. */
async function maskableIcon(size, filename) {
  const inner = Math.round(size * 0.6);
  const mark = await sharp(svg).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, filename));
}

async function main() {
  await plainIcon(192, "icon-192.png");
  await plainIcon(512, "icon-512.png");
  await maskableIcon(192, "icon-192-maskable.png");
  await maskableIcon(512, "icon-512-maskable.png");
  await plainIcon(180, "apple-touch-icon.png");
  // A couple of standard shortcut icon sizes for manifest "shortcuts".
  await plainIcon(96, "shortcut-search.png");
  await plainIcon(96, "shortcut-favorites.png");
  console.log("PWA icons written to public/icons/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
