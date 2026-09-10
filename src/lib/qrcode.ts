import "server-only";
import QRCode from "qrcode";

/** Renders a QR code as a base64 PNG data URI — embeddable directly in
 *  the PDF (react-pdf's <Image> accepts data URIs) with no separate
 *  file to store. Always points at a real, already-public URL passed in
 *  by the caller — never a placeholder. */
export async function generateQrCodeDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    margin: 1,
    width: 240,
    color: { dark: "#1A1A1A", light: "#FFFFFF" },
  });
}
