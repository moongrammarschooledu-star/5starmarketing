import "server-only";
import { ImageResponse } from "next/og";
import type { brochureService } from "@/services/brochureService";
import { site } from "@/lib/site";
import { LOGO_DATA_URI, LOGO_ASPECT } from "@/lib/pdf/logoData";
import { LIBERATION_REGULAR_B64, LIBERATION_BOLD_B64 } from "@/lib/fonts/liberationData";

type RenderData = Awaited<ReturnType<typeof brochureService.buildRenderData>>;

const SIZE = 1080;
const RED = "#C81E2C";
const DARK_RED = "#7A1219";
const SOFT_RED = "#FDF1F2";
const PINK = "#F9D9DC";
const MUTED = "#6B6B6B";
const LINE = "#E8CDD0";

const FACTS_H = 118;
const FOOTER_H = 196;
const THUMBS_H = 250;

interface PostTarget {
  name: string;
  slug: string;
  location: string;
  images: string[];
  propertyType?: string;
  purpose?: string;
  size?: string;
  price?: string;
  projectStatus?: string;
  availablePropertyTypes?: string[];
}

function truncate(value: string, max: number) {
  const c = value.replace(/\s+/g, " ").trim();
  if (c.length <= max) return c;
  return `${c.slice(0, max).replace(/\s+\S*$/, "")}...`;
}

function toArrayBuffer(b64: string): ArrayBuffer {
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

// Next's built-in og font has no bold weight, so the bold look needs real
// font data; it is embedded in the code (see liberationData.ts).
const FONTS = [
  { name: "Liberation", data: toArrayBuffer(LIBERATION_REGULAR_B64), weight: 400 as const, style: "normal" as const },
  { name: "Liberation", data: toArrayBuffer(LIBERATION_BOLD_B64), weight: 700 as const, style: "normal" as const },
];

/** 1080x1080 social-media post image built only from the brochure's own
 *  property/project data (same source as the PDF brochure). */
export async function renderFacebookPostImage(data: RenderData, download: boolean) {
  const t = data.target as PostTarget;
  const isProperty = data.brochure.type === "property";
  const images = t.images;
  const hasThumbs = images.length >= 4;
  const thumbsH = hasThumbs ? THUMBS_H : 0;
  const heroH = SIZE - FACTS_H - FOOTER_H - thumbsH;
  const logoW = 290;

  const facts: { label: string; value: string }[] = isProperty
    ? [
        { label: "Type", value: t.propertyType ?? "" },
        { label: "Size", value: truncate(t.size ?? "", 18) },
        { label: "Purpose", value: t.purpose ?? "" },
      ]
    : [
        { label: "Status", value: t.projectStatus ?? "" },
        { label: "Offering", value: truncate((t.availablePropertyTypes ?? []).join(", "), 30) },
      ];
  const shownFacts = facts.filter((f) => f.value);

  const chip = isProperty
    ? t.price ? { label: "Demand", value: truncate(t.price, 22) } : undefined
    : t.projectStatus ? { label: "Project", value: t.projectStatus } : undefined;

  const phones = [data.business.phone, site.phoneDisplay2].filter((p, i, a) => p && a.indexOf(p) === i).join("  /  ");
  const badge = data.badge;

  return new ImageResponse(
    (
      <div style={{ width: SIZE, height: SIZE, display: "flex", flexDirection: "column", background: "#FFFFFF", fontFamily: "Liberation" }}>
        <div style={{ position: "relative", display: "flex", width: SIZE, height: heroH, background: DARK_RED }}>
          {images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt="" width={SIZE} height={heroH} style={{ position: "absolute", top: 0, left: 0, width: SIZE, height: heroH, objectFit: "cover" }} />
          )}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SIZE,
              height: heroH,
              display: "flex",
              backgroundImage: "linear-gradient(to bottom, rgba(40,4,8,0.20), rgba(30,2,6,0.82))",
            }}
          />
          <div style={{ position: "absolute", top: 38, left: 44, display: "flex", background: "#FFFFFF", borderRadius: 18, padding: 14, borderBottom: `6px solid ${RED}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_DATA_URI} alt="" width={logoW} height={Math.round(logoW / LOGO_ASPECT)} />
          </div>
          {badge && (
            <div style={{ position: "absolute", top: 46, right: 44, display: "flex", background: RED, color: "#FFFFFF", fontSize: 26, fontWeight: 700, padding: "10px 28px", borderRadius: 30, letterSpacing: 2 }}>
              {badge}
            </div>
          )}
          <div style={{ position: "absolute", left: 44, right: 44, bottom: 38, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: chip ? 650 : 990 }}>
              <div style={{ display: "flex", color: "#FFFFFF", fontSize: 54, fontWeight: 700, lineHeight: 1.12 }}>{truncate(t.name, 58)}</div>
              <div style={{ display: "flex", color: PINK, fontSize: 28, marginTop: 10 }}>{truncate(t.location, 70)}</div>
            </div>
            {chip && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", background: RED, padding: "14px 26px" }}>
                <div style={{ display: "flex", color: PINK, fontSize: 20, letterSpacing: 3, textTransform: "uppercase" }}>{chip.label}</div>
                <div style={{ display: "flex", color: "#FFFFFF", fontSize: 44, fontWeight: 700, marginTop: 4 }}>{chip.value}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", height: FACTS_H, background: SOFT_RED, borderBottom: `2px solid ${LINE}` }}>
          {shownFacts.map((f, i) => (
            <div
              key={f.label}
              style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, flexBasis: 0, padding: "0 30px", borderLeft: i > 0 ? `2px solid ${LINE}` : "none" }}
            >
              <div style={{ display: "flex", color: MUTED, fontSize: 20, letterSpacing: 2, textTransform: "uppercase" }}>{f.label}</div>
              <div style={{ display: "flex", color: DARK_RED, fontSize: 36, fontWeight: 700, marginTop: 6 }}>{f.value}</div>
            </div>
          ))}
        </div>

        {hasThumbs && (
          <div style={{ display: "flex", height: thumbsH, padding: "20px 44px", background: "#FFFFFF" }}>
            {images.slice(1, 4).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" width={316} height={thumbsH - 40} style={{ width: 316, height: thumbsH - 40, objectFit: "cover", borderRadius: 14, marginLeft: i > 0 ? 16 : 0 }} />
            ))}
          </div>
        )}

        <div style={{ display: "flex", height: FOOTER_H, background: DARK_RED, borderTop: `8px solid ${RED}`, padding: "0 44px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 800 }}>
            <div style={{ display: "flex", color: "#FFFFFF", fontSize: 38, fontWeight: 700 }}>{site.fullName}</div>
            <div style={{ display: "flex", color: PINK, fontSize: 21, marginTop: 6 }}>Buying & Selling  |  Development  |  Construction  |  Rental Services</div>
            <div style={{ display: "flex", color: "#FFFFFF", fontSize: 32, fontWeight: 700, marginTop: 14 }}>{phones}</div>
            <div style={{ display: "flex", color: PINK, fontSize: 22, marginTop: 4 }}>{site.websiteUrl.replace(/^https?:\/\//, "")}</div>
          </div>
          {data.qrCodes.propertyUrl && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", background: "#FFFFFF", padding: 8, borderRadius: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qrCodes.propertyUrl} alt="" width={128} height={128} />
              </div>
              <div style={{ display: "flex", color: PINK, fontSize: 17, marginTop: 6 }}>Scan for details</div>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: FONTS,
      headers: {
        "Cache-Control": "no-store",
        ...(download ? { "Content-Disposition": `attachment; filename="5STAR-M-${t.slug}-facebook-post.png"` } : {}),
      },
    }
  );
}
