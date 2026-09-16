// One-off generator for PWA icons from the REAL brand logo
// (public/images/logo.png) — run with `node scripts/generate-pwa-icons.mjs`.
// Not part of the build; output is committed to public/icons/ like any
// other static asset.
//
// Previously sourced from a hand-drawn SVG recreation (src/app/icon.svg)
// that didn't actually match the real logo closely enough — the
// business flagged this as "the wrong logo" showing up on PWA install.
// Every icon below is now derived directly from the actual logo file.
import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const logoPath = path.join(root, "public/images/logo.png");
const outDir = path.join(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const BRAND_BG = { r: 255, g: 255, b: 255, alpha: 1 };

/** logo.png is a wide (1774x887) flat export with a near-white
 *  background already baked in — "contain" fit pads it to a square on
 *  the same white, so there's no visible seam. */
async function plainIcon(size, filename) {
  await sharp(logoPath)
    .resize(size, size, { fit: "contain", background: BRAND_BG })
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(path.join(outDir, filename));
}

/** Maskable icons need extra padding (~20%) since Android/iOS crop to a
 *  shape (circle/squircle) that would otherwise clip the logo. */
async function maskableIcon(size, filename) {
  const inner = Math.round(size * 0.7);
  const mark = await sharp(logoPath)
    .resize(inner, inner, { fit: "contain", background: BRAND_BG })
    .png()
    .toBuffer();
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
  // Browser-tab favicon (replaces the old hand-drawn src/app/icon.svg).
  await sharp(logoPath)
    .resize(32, 32, { fit: "contain", background: BRAND_BG })
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(path.join(root, "src/app/icon.png"));
  console.log("PWA icons written to public/icons/, favicon written to src/app/icon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
