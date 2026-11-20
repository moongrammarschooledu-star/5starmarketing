import sharp from "sharp";

/** The company logo (PNG) for a Word file, fetched from the site itself and made small
 *  (the original is a large picture). Undefined if it cannot be loaded. */
export async function fetchLogoPng(requestUrl: string): Promise<Buffer | undefined> {
  try {
    const res = await fetch(new URL("/images/logo.png", requestUrl), { cache: "force-cache" });
    if (!res.ok) return undefined;
    const original = Buffer.from(await res.arrayBuffer());
    return await sharp(original).resize({ width: 700, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  } catch {
    return undefined;
  }
}
