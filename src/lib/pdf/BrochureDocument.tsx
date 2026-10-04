/* eslint-disable jsx-a11y/alt-text -- this is react-pdf's own <Image>
   primitive (rendered into a PDF, not the DOM), which has no `alt` prop;
   the lint rule doesn't distinguish it from a real HTML <img>. */
import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import type { BrochureSectionKey, BrochureType } from "@/lib/models/brochure";
import { LOGO_DATA_URI, LOGO_ASPECT } from "./logoData";
import { site } from "@/lib/site";

const RED = "#C81E2C";
const DARK_RED = "#7A1219";
const SOFT_RED = "#FDF1F2";
const PINK = "#F9D9DC";
const INK = "#1A1A1A";
const MUTED = "#6B6B6B";
const LINE = "#E8CDD0";

// The brochure is a single-page A4 flyer carrying ALL selected information.
// Rather than cutting content, the layout measures how much there is and
// picks the largest type scale at which everything still fits.
const PAGE_W = 595;
const PAGE_H = 841;
const SIDE = 28;
const COL_GAP = 16;
const SCALES = [1, 0.94, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58];
// Deliberately short: a clean, readable flyer beats a crammed one. The
// full details stay on the property's web page (linked by the QR code).
const MAX_DESCRIPTION = 480;
const MAX_LIST_ITEMS = 6;
const STRIP_H = 24;

// Taken from the company's own website copy (homepage stats and "Why
// Choose 5STAR.M" list) - nothing here is invented for the brochure.
const COMPANY_HIGHLIGHTS = [
  "LDA-Approved Society Focus",
  "Cash / Easy Installments",
  "100% Transparent Dealings",
  "Property & Construction Expertise",
];
// The company's own description of what it does (stated by the owner).
const COMPANY_SERVICES = ["Buying & Selling", "Development", "Construction", "Rental Services"];
// From the "Why Choose 5STAR.M" list on the company website.
const COMPANY_WHY = [
  "Professional Real Estate Guidance",
  "Trusted Property Solutions",
  "Customer-Focused Service",
  "Long-Term Support",
];

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  whatsappUrl: string;
}

interface TargetInfo {
  name: string;
  location: string;
  images: string[];
  description: string;
  publicUrl: string;
  mapsQuery?: string;
  directionsUrl?: string;
  // property-only
  propertyType?: string;
  purpose?: string;
  size?: string;
  price?: string;
  status?: string;
  features?: string[];
  amenities?: string[];
  // project-only
  projectStatus?: string;
  highlights?: string[];
  availablePropertyTypes?: string[];
  paymentOptionsList?: string[];
}

interface PaymentPlanInfo {
  propertyPrice: number;
  downPayment: number;
  remainingAmount: number;
  installmentAmount?: number;
  frequency: string;
  duration: number;
  scheduleItems: { installmentNumber: number; dueDate?: string; amount: string; description: string }[];
}

interface QrCodes {
  propertyUrl?: string;
  whatsapp?: string;
  maps?: string;
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number) {
  const c = clean(value);
  if (c.length <= max) return c;
  return `${c.slice(0, max).replace(/\s+\S*$/, "")}...`;
}

/** Rough text height: how many wrapped lines `text` needs in a column of
 *  `width` points at `fontSize`, times the line height. Helvetica averages
 *  ~0.45em per glyph; 0.47 leaves a small safety margin. */
function textHeight(text: string, width: number, fontSize: number, lineHeight: number) {
  const perLine = Math.max(8, Math.floor(width / (fontSize * 0.47)));
  return Math.max(1, Math.ceil(text.length / perLine)) * fontSize * lineHeight;
}

interface Plan {
  s: number;
  heroH: number;
  galleryH: number;
  factsH: number;
  footerH: number;
  bodyH: number;
  need: number;
}

export function BrochureDocument({
  type,
  sections,
  business,
  target,
  qrCodes,
  badge,
}: {
  type: BrochureType;
  sections: BrochureSectionKey[];
  business: BusinessInfo;
  target: TargetInfo;
  /** Accepted for callers that still pass it, but the one-page flyer no
   *  longer shows a payment plan - the description takes its place. */
  paymentPlan?: PaymentPlanInfo;
  qrCodes: QrCodes;
  badge?: string;
}) {
  const has = (s: BrochureSectionKey) => sections.includes(s);

  // ---- what to show -------------------------------------------------
  const heroImage = has("cover") ? target.images[0] : undefined;
  const galleryImages = has("gallery") ? target.images.slice(heroImage ? 1 : 0, (heroImage ? 1 : 0) + 5) : [];
  const showFacts = has("overview");

  const description = has("overview") ? truncate(target.description || "", MAX_DESCRIPTION) : "";
  const aboutText = has("overview") ? description || "Information not provided." : "";

  const listA =
    type === "property"
      ? has("features") ? target.features ?? [] : []
      : has("features") ? target.highlights ?? [] : [];
  const listB =
    type === "property"
      ? has("amenities") ? target.amenities ?? [] : []
      : has("overview") ? target.availablePropertyTypes ?? [] : [];
  const titleA = type === "property" ? "Features" : "Project Highlights";
  const titleB = type === "property" ? "Amenities" : "Property Types";
  const itemsA = listA.map(clean).filter(Boolean).slice(0, MAX_LIST_ITEMS);
  const itemsB = listB.map(clean).filter(Boolean).slice(0, MAX_LIST_ITEMS);

  const showLocation = has("location");
  const showContact = has("contact");
  const showCta = has("whatsappCta");

  const mapsQr = showLocation && qrCodes.maps && target.directionsUrl ? qrCodes.maps : undefined;
  const footerQrs: { src: string; caption: string }[] = [];
  if (showCta && qrCodes.whatsapp) footerQrs.push({ src: qrCodes.whatsapp, caption: "WhatsApp" });
  if (showCta && qrCodes.propertyUrl)
    footerQrs.push({ src: qrCodes.propertyUrl, caption: type === "property" ? "View Property" : "View Project" });

  // Left: features/amenities lists, then the company card (this is a public
  // company document, so it always carries the company's own information).
  // Right: the property description card and the location card.
  const hasLists = itemsA.length > 0 || itemsB.length > 0;
  const hasLeft = true;
  const hasRight = true; // the "Why Choose" company card is always on the right
  const tagline = `${site.tagline} - ${site.taglineSecondary}`;

  // ---- fit: pick the largest scale at which everything fits ---------
  const fits = (s: number): Plan & { ok: boolean } => {
    const heroH = (heroImage ? 205 : 150) * s;
    const galleryH = galleryImages.length > 0 ? 88 * s : 0;
    const factsH = showFacts ? 50 * s : 0;
    const footerH = Math.max(100, 116 * Math.max(s, 0.85)) + STRIP_H;
    const bodyH = PAGE_H - heroH - galleryH - factsH - footerH - 30 * s;

    const inner = PAGE_W - SIDE * 2 - (hasLeft && hasRight ? COL_GAP : 0);
    const leftW = hasRight ? inner * 0.6 : inner;
    const rightW = hasLeft ? inner * 0.4 : inner;
    const f = 9.2 * s;
    const head = 26 * s;

    let left = 0;
    if (hasLists) {
      const both = itemsA.length > 0 && itemsB.length > 0;
      const colW = both ? (leftW - 12) / 2 : leftW;
      const colH = (items: string[]) =>
        head + items.reduce((acc, it) => acc + textHeight(it, colW - 10, 8.8 * s, 1.3) + 4 * s, 0);
      left += Math.max(itemsA.length ? colH(itemsA) : 0, itemsB.length ? colH(itemsB) : 0) + 12 * s;
    }
    // company card: header + intro + director + services label + two rows of tiles + tagline
    left +=
      24 * s + 22 * s + textHeight(site.description, leftW - 22 * s, 8.8 * s, 1.5) + 7 * s + 16 * s + 14 * s + 2 * 30 * s + 6 * s + 8 * s + 16 * s;

    let right = 0;
    if (aboutText) {
      right += 26 * s + 22 * s + textHeight(aboutText, rightW - 22 * s, f, 1.55) + 12 * s;
    }
    if (showLocation) {
      right += head + textHeight(target.location, rightW - 24, 9.5 * s, 1.35) + (target.mapsQuery ? 14 * s : 0) + 22 * s;
      if (mapsQr) right += 66 * s;
    }

    // "Why Choose" card: header + padding + one line per point
    right += 24 * s + 22 * s + COMPANY_WHY.length * 17 * s + 12 * s;

    const need = Math.max(left, right);
    return { s, heroH, galleryH, factsH, footerH, bodyH, need, ok: need <= bodyH };
  };

  let plan = fits(SCALES[SCALES.length - 1]);
  for (const sc of SCALES) {
    const p = fits(sc);
    if (p.ok) {
      plan = p;
      break;
    }
  }
  const { s, factsH, footerH } = plan;
  let { heroH } = plan;
  const { galleryH, bodyH } = plan;

  // Sparse content: give the hero a little extra height; the photo strip
  // (flex-grow, see styles.gallery) absorbs the rest.
  const spare = Math.max(0, plan.bodyH - plan.need - 18);
  if (heroImage) heroH += Math.min(spare * 0.4, 50);
  const u = (n: number) => Math.round(n * s * 100) / 100;

  const styles = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: u(9), color: INK, backgroundColor: "#FFFFFF" },
    root: { position: "relative", height: PAGE_H, overflow: "hidden" },
    hero: { position: "relative", width: "100%", height: heroH, backgroundColor: DARK_RED },
    heroImage: { position: "absolute", top: 0, left: 0, width: "100%", height: heroH, objectFit: "cover" },
    heroTint: { position: "absolute", top: 0, left: 0, right: 0, height: heroH, backgroundColor: "rgba(74,10,16,0.28)" },
    heroShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: heroH * 0.62, backgroundColor: "rgba(30,2,6,0.62)" },
    heroStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: u(4), backgroundColor: RED },
    // The real logo has a baked-in white background, so it always sits on
    // a white card to stay crisp and readable over any photo.
    logoCard: {
      position: "absolute",
      top: u(14),
      left: SIDE,
      backgroundColor: "#FFFFFF",
      borderRadius: 5,
      padding: u(6),
      borderBottomWidth: 3,
      borderBottomColor: RED,
    },
    logo: { width: u(118), height: u(118) / LOGO_ASPECT },
    badge: {
      position: "absolute",
      top: u(20),
      right: SIDE,
      backgroundColor: RED,
      color: "#FFFFFF",
      fontSize: u(8),
      fontWeight: 700,
      paddingVertical: u(5),
      paddingHorizontal: u(12),
      borderRadius: 10,
      letterSpacing: 1,
    },
    heroBottom: {
      position: "absolute",
      left: SIDE,
      right: SIDE,
      bottom: u(16),
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    title: { fontSize: u(19), fontWeight: 700, color: "#FFFFFF", lineHeight: 1.15 },
    location: { fontSize: u(9.5), color: PINK, marginTop: u(4) },
    priceChip: { backgroundColor: RED, paddingVertical: u(7), paddingHorizontal: u(12), marginLeft: u(12), alignItems: "flex-end" },
    priceLabel: { fontSize: u(6.5), color: PINK, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: u(2) },
    priceValue: { fontSize: u(14), fontWeight: 700, color: "#FFFFFF" },
    facts: { height: factsH, flexDirection: "row", backgroundColor: SOFT_RED, borderBottomWidth: 1, borderBottomColor: LINE },
    fact: { flexGrow: 1, flexBasis: 0, justifyContent: "center", paddingHorizontal: u(10) },
    factDivider: { borderLeftWidth: 1, borderLeftColor: LINE },
    factLabel: { fontSize: u(6.8), color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: u(3) },
    factValue: { fontSize: u(10.5), fontWeight: 700, color: DARK_RED },
    body: { flexDirection: "row", gap: COL_GAP, paddingHorizontal: SIDE, paddingTop: u(14), maxHeight: bodyH, overflow: "hidden" },
    leftCol: { width: "60%" },
    rightCol: { width: "40%" },
    sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: u(7) },
    sectionSquare: { width: u(7), height: u(7), backgroundColor: RED, marginRight: u(6) },
    sectionTitle: { fontSize: u(9.5), fontWeight: 700, color: DARK_RED, textTransform: "uppercase", letterSpacing: 1 },
    sectionRule: { flexGrow: 1, height: 1, backgroundColor: LINE, marginLeft: u(8) },
    about: { fontSize: u(9.2), lineHeight: 1.55, color: INK },
    listsRow: { flexDirection: "row", gap: 12 },
    listCol: { flexGrow: 1, flexBasis: 0 },
    bulletRow: { flexDirection: "row", marginBottom: u(4), alignItems: "flex-start" },
    bulletDot: { width: u(4.5), height: u(4.5), backgroundColor: RED, marginTop: u(3), marginRight: u(6) },
    bulletText: { fontSize: u(8.8), lineHeight: 1.3, color: INK, flex: 1 },
    card: { borderWidth: 1, borderColor: LINE, marginBottom: u(12) },
    // The last card in each column stretches so both columns end level
    // and no blank patch is left under the shorter one.
    cardGrow: { flexGrow: 1, marginBottom: 0 },
    cardBodyGrow: { flexGrow: 1, justifyContent: "space-between" },
    cardHead: { backgroundColor: DARK_RED, paddingVertical: u(6), paddingHorizontal: u(10) },
    cardHeadText: { fontSize: u(8.5), fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 1 },
    cardBody: { backgroundColor: SOFT_RED, padding: u(10) },
    companyLine: { fontSize: u(8.8), color: INK, marginBottom: u(7) },
    companyLabel: { fontWeight: 700, color: DARK_RED },
    companyLabelBlock: { fontSize: u(7.4), fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.9, marginBottom: u(5) },
    servicesWrap: { flexDirection: "row", flexWrap: "wrap", gap: u(6), marginBottom: u(8) },
    serviceTile: {
      width: "48.5%",
      backgroundColor: "#FFFFFF",
      borderTopWidth: 2,
      borderTopColor: RED,
      paddingVertical: u(7),
      paddingHorizontal: u(8),
      alignItems: "center",
    },
    serviceText: { fontSize: u(9), fontWeight: 700, color: DARK_RED },
    tagline: { fontSize: u(7.4), fontWeight: 700, color: RED, letterSpacing: 0.8, marginTop: u(2) },
    note: { fontSize: u(7.4), color: MUTED, marginTop: u(3) },
    locationBody: { padding: u(10), flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    // Takes all remaining vertical room above the footer, so a short
    // description or few features never leaves a blank gap on the page.
    gallery: {
      flexGrow: 1,
      minHeight: galleryH,
      paddingHorizontal: SIDE,
      paddingTop: u(10),
      paddingBottom: footerH + u(12),
    },
    galleryRow: { flexGrow: 1, flexDirection: "row", gap: u(7) },
    galleryImage: { flexGrow: 1, flexBasis: 0, height: "100%", objectFit: "cover", borderRadius: 3 },
    footer: { position: "absolute", bottom: 0, left: 0, right: 0, height: footerH, backgroundColor: DARK_RED },
    strip: {
      height: STRIP_H,
      backgroundColor: RED,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SIDE,
    },
    stripItem: { flexDirection: "row", alignItems: "center" },
    stripDot: { width: 4, height: 4, backgroundColor: "#FFFFFF", marginRight: 4 },
    stripText: { fontSize: 6.9, fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 0.5 },
    footerInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: SIDE, paddingTop: 9 },
    footerLogo: { backgroundColor: "#FFFFFF", borderRadius: 4, padding: 4, marginRight: 12 },
    footerLogoImg: { width: 78, height: 78 / LOGO_ASPECT },
    footerLine: { fontSize: 8.6, color: PINK, marginBottom: 2.5 },
    footerLink: { fontSize: 8.6, fontWeight: 700, color: "#FFFFFF", textDecoration: "none", marginBottom: 2.5 },
    footerCta: { fontSize: 9, fontWeight: 700, color: "#FFFFFF", marginTop: 4 },
    qrRow: { flexDirection: "row", gap: 10 },
    qrItem: { alignItems: "center" },
    qrBox: { backgroundColor: "#FFFFFF", padding: 3, borderRadius: 3 },
    qr: { width: 52, height: 52 },
    qrCaption: { fontSize: 6.5, color: PINK, marginTop: 3, textAlign: "center" },
    disclaimer: { position: "absolute", left: SIDE, right: SIDE, bottom: 6, fontSize: 6.3, color: "#E3A9AE", lineHeight: 1.3 },
  });

  const factCards: { label: string; value: string }[] = [];
  if (type === "property") {
    if (target.propertyType) factCards.push({ label: "Type", value: target.propertyType });
    if (target.purpose) factCards.push({ label: "Purpose", value: target.purpose });
    if (target.size) factCards.push({ label: "Size", value: truncate(target.size, 20) });
    if (target.status) factCards.push({ label: "Status", value: target.status });
  } else {
    if (target.projectStatus) factCards.push({ label: "Status", value: target.projectStatus });
    if (target.availablePropertyTypes && target.availablePropertyTypes.length > 0)
      factCards.push({ label: "Offering", value: truncate(target.availablePropertyTypes.join(", "), 40) });
  }

  const heroChip =
    type === "property" && target.price
      ? { label: "Demand", value: truncate(target.price, 24) }
      : type === "project" && target.projectStatus
        ? { label: "Project", value: target.projectStatus }
        : undefined;

  return (
    <Document title={`${target.name} - ${business.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.root}>
          <View style={styles.hero}>
            {heroImage && <Image src={heroImage} style={styles.heroImage} />}
            {heroImage && <View style={styles.heroTint} />}
            <View style={styles.heroShade} />
            <View style={styles.heroStripe} />
            <View style={styles.logoCard}>
              <Image src={LOGO_DATA_URI} style={styles.logo} />
            </View>
            {badge && <Text style={styles.badge}>{badge}</Text>}
            <View style={styles.heroBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{truncate(target.name, 70)}</Text>
                <Text style={styles.location}>{truncate(target.location, 95)}</Text>
              </View>
              {heroChip && (
                <View style={styles.priceChip}>
                  <Text style={styles.priceLabel}>{heroChip.label}</Text>
                  <Text style={styles.priceValue}>{heroChip.value}</Text>
                </View>
              )}
            </View>
          </View>

          {showFacts && factCards.length > 0 && (
            <View style={styles.facts}>
              {factCards.map((c, i) => (
                <View key={c.label} style={i > 0 ? [styles.fact, styles.factDivider] : styles.fact}>
                  <Text style={styles.factLabel}>{c.label}</Text>
                  <Text style={styles.factValue}>{c.value}</Text>
                </View>
              ))}
            </View>
          )}

          {(hasLeft || hasRight) && (
            <View style={styles.body}>
              {hasLeft && (
                <View style={hasRight ? styles.leftCol : { width: "100%" }}>
                  {hasLists && (
                    <View style={[styles.listsRow, { marginBottom: u(12) }]}>
                      {itemsA.length > 0 && <BulletList styles={styles} title={titleA} items={itemsA} />}
                      {itemsB.length > 0 && <BulletList styles={styles} title={titleB} items={itemsB} />}
                    </View>
                  )}

                  <View style={[styles.card, styles.cardGrow]}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardHeadText}>About {site.fullName}</Text>
                    </View>
                    <View style={[styles.cardBody, styles.cardBodyGrow]}>
                      <Text style={[styles.about, { marginBottom: u(7) }]}>{site.description}</Text>
                      <Text style={styles.companyLine}>
                        <Text style={styles.companyLabel}>{site.directorTitle}: </Text>
                        {site.director}
                      </Text>
                      <Text style={styles.companyLabelBlock}>Our Services</Text>
                      <View style={styles.servicesWrap}>
                        {COMPANY_SERVICES.map((svc) => (
                          <View key={svc} style={styles.serviceTile}>
                            <Text style={styles.serviceText}>{svc}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.tagline}>{tagline}</Text>
                    </View>
                  </View>
                </View>
              )}

              {hasRight && (
                <View style={hasLeft ? styles.rightCol : { width: "100%" }}>
                  {aboutText && (
                    <View style={styles.card}>
                      <View style={styles.cardHead}>
                        <Text style={styles.cardHeadText}>{type === "property" ? "About This Property" : "About This Project"}</Text>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.about}>{aboutText}</Text>
                      </View>
                    </View>
                  )}

                  {showLocation && (
                    <View style={styles.card}>
                      <View style={styles.cardHead}>
                        <Text style={styles.cardHeadText}>Location</Text>
                      </View>
                      <View style={[styles.cardBody, styles.locationBody]}>
                        <View style={{ flex: 1, paddingRight: mapsQr ? 8 : 0 }}>
                          <Text style={{ fontSize: u(9.5), fontWeight: 700, color: INK, lineHeight: 1.35 }}>{target.location}</Text>
                          {target.mapsQuery && clean(target.mapsQuery) !== clean(target.location) && (
                            <Text style={styles.note}>{truncate(target.mapsQuery, 120)}</Text>
                          )}
                          {mapsQr && <Text style={styles.note}>Scan for directions</Text>}
                        </View>
                        {mapsQr && (
                          <View style={{ backgroundColor: "#FFFFFF", padding: 3 }}>
                            <Image src={mapsQr} style={{ width: u(54), height: u(54) }} />
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  <View style={[styles.card, styles.cardGrow]}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardHeadText}>Why Choose {site.name}</Text>
                    </View>
                    <View style={[styles.cardBody, styles.cardBodyGrow]}>
                      {COMPANY_WHY.map((w) => (
                        <View key={w} style={styles.bulletRow}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{w}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {galleryImages.length > 0 && (
            <View style={styles.gallery}>
              <View style={styles.galleryRow}>
                {galleryImages.map((src, i) => (
                  <Image key={i} src={src} style={styles.galleryImage} />
                ))}
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <View style={styles.strip}>
              {COMPANY_HIGHLIGHTS.map((h) => (
                <View key={h} style={styles.stripItem}>
                  <View style={styles.stripDot} />
                  <Text style={styles.stripText}>{h}</Text>
                </View>
              ))}
            </View>
            <View style={styles.footerInner}>
              <View style={styles.footerLogo}>
                <Image src={LOGO_DATA_URI} style={styles.footerLogoImg} />
              </View>
              <View style={{ flexGrow: 1, paddingRight: 14 }}>
                {showContact && (
                  <>
                    <Text style={styles.footerLine}>{truncate(business.address, 80)}</Text>
                    <Text style={styles.footerLine}>{business.phone}</Text>
                    <Text style={styles.footerLine}>{business.email}</Text>
                    <Link src={site.websiteUrl} style={styles.footerLink}>
                      {site.websiteUrl.replace(/^https?:\/\//, "")}
                    </Link>
                  </>
                )}
                {showCta && (
                  <Text style={styles.footerCta}>
                    Interested in this {type === "property" ? "property" : "project"}? Scan to chat on WhatsApp.
                  </Text>
                )}
              </View>
              {footerQrs.length > 0 && (
                <View style={styles.qrRow}>
                  {footerQrs.map((q) => (
                    <View key={q.caption} style={styles.qrItem}>
                      <View style={styles.qrBox}>
                        <Image src={q.src} style={styles.qr} />
                      </View>
                      <Text style={styles.qrCaption}>{q.caption}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            {has("disclaimer") && (
              <Text style={styles.disclaimer}>
                For general information only; not a legal offer or contract. Demand, availability and terms are subject to
                change and must be confirmed with {business.name} Estate &amp; Builders.
              </Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

type S = ReturnType<typeof StyleSheet.create>;

function SectionTitle({ styles, text }: { styles: S; text: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionSquare} />
      <Text style={styles.sectionTitle}>{text}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function BulletList({ styles, title, items }: { styles: S; title: string; items: string[] }) {
  return (
    <View style={styles.listCol}>
      <SectionTitle styles={styles} text={title} />
      {items.map((it, i) => (
        <View key={`${it}-${i}`} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}
