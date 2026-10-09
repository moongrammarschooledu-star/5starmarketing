/** Draws an SVG element to a PNG and returns it as a blob. Anything marked
 *  data-export="skip" (grid, selection handles) is left out. */
export async function svgToPngBlob(svg: SVGSVGElement, widthPx = 2400): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export="skip"]').forEach((n) => n.remove());
  const vb = svg.viewBox.baseVal;
  const height = Math.round((widthPx * vb.height) / vb.width);
  clone.setAttribute("width", String(widthPx));
  clone.setAttribute("height", String(height));
  clone.removeAttribute("style");
  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not draw the picture."));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the picture.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, height);
  ctx.drawImage(img, 0, 0, widthPx, height);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the picture."))), "image/png"));
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadSvgAsPng(svg: SVGSVGElement, filename: string, widthPx = 2400) {
  const blob = await svgToPngBlob(svg, widthPx);
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "design";
}
