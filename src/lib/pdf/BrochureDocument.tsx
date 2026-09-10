/* eslint-disable jsx-a11y/alt-text -- this is react-pdf's own <Image>
   primitive (rendered into a PDF, not the DOM), which has no `alt` prop;
   the lint rule doesn't distinguish it from a real HTML <img>. */
import { Document, Page, View, Text, Image, StyleSheet, Link } from "@react-pdf/renderer";
import type { BrochureSectionKey, BrochureType } from "@/lib/models/brochure";

const RED = "#C81E2C";
const DARK_RED = "#7A1219";
const INK = "#1A1A1A";
const MUTED = "#6B6B6B";
const BORDER = "#E5E5E5";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: INK, paddingTop: 60, paddingBottom: 50, paddingHorizontal: 40 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: RED,
  },
  headerText: { fontSize: 9, fontWeight: 700, color: DARK_RED },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 34,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: { fontSize: 8, color: MUTED },
  h1: { fontSize: 20, fontWeight: 700, color: INK, marginBottom: 4 },
  h2: { fontSize: 14, fontWeight: 700, color: DARK_RED, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  muted: { color: MUTED },
  coverPage: { padding: 0 },
  coverImage: { width: "100%", height: 420, objectFit: "cover" },
  coverOverlay: { position: "absolute", top: 0, left: 0, right: 0, height: 420, backgroundColor: "rgba(0,0,0,0.35)" },
  coverBrand: { position: "absolute", top: 30, left: 40, fontSize: 12, fontWeight: 700, color: "#FFFFFF", letterSpacing: 2 },
  coverBadge: {
    position: "absolute",
    top: 30,
    right: 40,
    backgroundColor: RED,
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 700,
    paddingVertical: 5,
    paddingHorizontal: 10,
    letterSpacing: 1,
  },
  coverBody: { padding: 40 },
  coverTitle: { fontSize: 26, fontWeight: 700, color: INK, marginBottom: 6 },
  coverLocation: { fontSize: 13, color: MUTED, marginBottom: 20 },
  cardsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  card: { width: "31%", borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 10 },
  cardLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", marginBottom: 3, letterSpacing: 0.5 },
  cardValue: { fontSize: 12, fontWeight: 700, color: INK },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  galleryImage: { width: "48.5%", height: 180, objectFit: "cover", borderRadius: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 5, alignItems: "flex-start" },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: RED, marginTop: 4, marginRight: 6 },
  bulletText: { fontSize: 10, color: INK, flex: 1 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 14 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 7, paddingHorizontal: 10 },
  tableRowLast: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10 },
  tableLabel: { fontSize: 9, color: MUTED, width: "50%" },
  tableValue: { fontSize: 10, fontWeight: 700, color: INK, width: "50%", textAlign: "right" },
  scheduleHeaderRow: { flexDirection: "row", backgroundColor: "#F7F7F7", paddingVertical: 6, paddingHorizontal: 8 },
  scheduleHeaderCell: { fontSize: 8, fontWeight: 700, color: MUTED, textTransform: "uppercase" },
  scheduleRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: BORDER },
  scheduleCell: { fontSize: 9, color: INK },
  ctaBox: { borderWidth: 2, borderColor: RED, borderRadius: 6, padding: 24, alignItems: "center", marginTop: 20 },
  ctaTitle: { fontSize: 16, fontWeight: 700, color: INK, marginBottom: 4, textAlign: "center" },
  ctaSubtitle: { fontSize: 10, color: MUTED, marginBottom: 14, textAlign: "center" },
  ctaPhone: { fontSize: 14, fontWeight: 700, color: RED, marginBottom: 14 },
  qr: { width: 110, height: 110 },
  disclaimerBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 12, backgroundColor: "#FAFAFA" },
  disclaimerText: { fontSize: 8.5, color: MUTED, lineHeight: 1.5, marginBottom: 8 },
});

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

function PageChrome({ business, children }: { business: BusinessInfo; children: React.ReactNode }) {
  return (
    <>
      <View style={styles.header} fixed>
        <Text style={styles.headerText}>{business.name}</Text>
        <Text style={styles.headerText}>ESTATE & BUILDERS</Text>
      </View>
      {children}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>{business.address}</Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
}

export function BrochureDocument({
  type,
  sections,
  business,
  target,
  paymentPlan,
  qrCodes,
  badge,
}: {
  type: BrochureType;
  sections: BrochureSectionKey[];
  business: BusinessInfo;
  target: TargetInfo;
  paymentPlan?: PaymentPlanInfo;
  qrCodes: QrCodes;
  badge?: string;
}) {
  const has = (s: BrochureSectionKey) => sections.includes(s);
  const galleryImages = target.images.slice(0, 12);
  const galleryPages: string[][] = [];
  for (let i = 0; i < galleryImages.length; i += 4) galleryPages.push(galleryImages.slice(i, i + 4));

  return (
    <Document title={`${target.name} — ${business.name}`}>
      {has("cover") && (
        <Page size="A4" style={styles.coverPage}>
          <View>
            {target.images[0] && <Image src={target.images[0]} style={styles.coverImage} />}
            <View style={styles.coverOverlay} />
            <Text style={styles.coverBrand}>{business.name} ESTATE & BUILDERS</Text>
            {badge && <Text style={styles.coverBadge}>{badge}</Text>}
          </View>
          <View style={styles.coverBody}>
            <Text style={styles.coverTitle}>{target.name}</Text>
            <Text style={styles.coverLocation}>{target.location}</Text>
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                All details in this brochure are provided by {business.name} Estate &amp; Builders and are subject to
                confirmation. This document does not constitute a legal offer or contract.
              </Text>
            </View>
          </View>
        </Page>
      )}

      {has("overview") && (
        <Page size="A4" style={styles.page}>
          <PageChrome business={business}>
            <Text style={styles.h2}>{type === "property" ? "Property Overview" : "Project Overview"}</Text>
            <View style={styles.cardsRow}>
              <InfoCard label="Location" value={target.location} />
              {type === "property" && target.propertyType && <InfoCard label="Type" value={target.propertyType} />}
              {type === "property" && target.purpose && <InfoCard label="Purpose" value={target.purpose} />}
              {type === "property" && target.size && <InfoCard label="Size" value={target.size} />}
              {type === "property" && target.price && <InfoCard label="Price" value={target.price} />}
              {type === "property" && target.status && <InfoCard label="Status" value={target.status} />}
              {type === "project" && target.projectStatus && <InfoCard label="Status" value={target.projectStatus} />}
            </View>
            {target.description ? (
              <Text style={{ fontSize: 10, lineHeight: 1.6, color: INK }}>{target.description}</Text>
            ) : (
              <Text style={styles.muted}>Information not provided.</Text>
            )}

            {type === "project" && target.availablePropertyTypes && target.availablePropertyTypes.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.h2, { fontSize: 11 }]}>Available Property Types</Text>
                {target.availablePropertyTypes.map((t) => (
                  <View key={t} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </PageChrome>
        </Page>
      )}

      {has("gallery") &&
        galleryPages.map((group, pageIndex) => (
          <Page size="A4" style={styles.page} key={`gallery-${pageIndex}`}>
            <PageChrome business={business}>
              {pageIndex === 0 && <Text style={styles.h2}>Gallery</Text>}
              <View style={styles.galleryGrid}>
                {group.map((src, i) => (
                  <Image key={i} src={src} style={styles.galleryImage} />
                ))}
              </View>
            </PageChrome>
          </Page>
        ))}

      {(has("features") || has("amenities")) &&
        ((type === "property" && ((target.features?.length ?? 0) > 0 || (target.amenities?.length ?? 0) > 0)) ||
          (type === "project" && (target.highlights?.length ?? 0) > 0)) && (
          <Page size="A4" style={styles.page}>
            <PageChrome business={business}>
              {type === "property" && has("features") && target.features && target.features.length > 0 && (
                <View style={{ marginBottom: 18 }}>
                  <Text style={styles.h2}>Features</Text>
                  {target.features.map((f) => (
                    <View key={f} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
              {type === "property" && has("amenities") && target.amenities && target.amenities.length > 0 && (
                <View>
                  <Text style={styles.h2}>Amenities</Text>
                  {target.amenities.map((a) => (
                    <View key={a} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}
              {type === "project" && target.highlights && target.highlights.length > 0 && (
                <View>
                  <Text style={styles.h2}>Project Highlights</Text>
                  {target.highlights.map((h) => (
                    <View key={h} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{h}</Text>
                    </View>
                  ))}
                </View>
              )}
            </PageChrome>
          </Page>
        )}

      {has("paymentPlan") && (paymentPlan || (type === "project" && target.paymentOptionsList && target.paymentOptionsList.length > 0)) && (
        <Page size="A4" style={styles.page}>
          <PageChrome business={business}>
            <Text style={styles.h2}>Payment Plan</Text>
            {paymentPlan ? (
              <>
                <View style={styles.table}>
                  <Row label="Property Price" value={formatMoney(paymentPlan.propertyPrice)} />
                  <Row label="Down Payment" value={formatMoney(paymentPlan.downPayment)} />
                  <Row label="Remaining Amount" value={formatMoney(paymentPlan.remainingAmount)} />
                  {paymentPlan.installmentAmount !== undefined && (
                    <Row label={`Installment (${paymentPlan.frequency})`} value={formatMoney(paymentPlan.installmentAmount)} />
                  )}
                  <Row label="Duration" value={`${paymentPlan.duration} ${paymentPlan.frequency.toLowerCase()} period(s)`} last />
                </View>
                {paymentPlan.scheduleItems.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={[styles.h2, { fontSize: 11 }]}>Payment Schedule</Text>
                    <View style={styles.scheduleHeaderRow}>
                      <Text style={[styles.scheduleHeaderCell, { width: "10%" }]}>#</Text>
                      <Text style={[styles.scheduleHeaderCell, { width: "25%" }]}>Due Date</Text>
                      <Text style={[styles.scheduleHeaderCell, { width: "25%" }]}>Amount</Text>
                      <Text style={[styles.scheduleHeaderCell, { width: "40%" }]}>Description</Text>
                    </View>
                    {paymentPlan.scheduleItems.map((item) => (
                      <View style={styles.scheduleRow} key={item.installmentNumber}>
                        <Text style={[styles.scheduleCell, { width: "10%" }]}>{item.installmentNumber}</Text>
                        <Text style={[styles.scheduleCell, { width: "25%" }]}>{item.dueDate ?? "—"}</Text>
                        <Text style={[styles.scheduleCell, { width: "25%" }]}>{item.amount}</Text>
                        <Text style={[styles.scheduleCell, { width: "40%" }]}>{item.description || "—"}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              type === "project" &&
              target.paymentOptionsList && (
                <View>
                  <Text style={{ fontSize: 10, marginBottom: 8 }}>Payment Options</Text>
                  {target.paymentOptionsList.map((o) => (
                    <View key={o} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{o}</Text>
                    </View>
                  ))}
                </View>
              )
            )}
            <Text style={[styles.disclaimerText, { marginTop: 14 }]}>
              Payment details are subject to confirmation by {business.name} Estate &amp; Builders.
            </Text>
          </PageChrome>
        </Page>
      )}

      {has("location") && (
        <Page size="A4" style={styles.page}>
          <PageChrome business={business}>
            <Text style={styles.h2}>Location</Text>
            <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{target.location}</Text>
            {target.mapsQuery && <Text style={styles.muted}>{target.mapsQuery}</Text>}
            {qrCodes.maps && target.directionsUrl && (
              <View style={{ marginTop: 20, alignItems: "center" }}>
                <Image src={qrCodes.maps} style={styles.qr} />
                <Text style={{ fontSize: 9, marginTop: 8, color: MUTED }}>Scan for Google Maps Directions</Text>
                <Link src={target.directionsUrl} style={{ fontSize: 8, color: RED, marginTop: 4 }}>
                  {target.directionsUrl}
                </Link>
              </View>
            )}
          </PageChrome>
        </Page>
      )}

      {(has("contact") || has("whatsappCta")) && (
        <Page size="A4" style={styles.page}>
          <PageChrome business={business}>
            {has("contact") && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.h2}>Contact Information</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{business.name} Estate &amp; Builders</Text>
                <Text style={{ fontSize: 10, marginBottom: 3 }}>{business.address}</Text>
                <Text style={{ fontSize: 10, marginBottom: 3 }}>{business.phone}</Text>
                <Text style={{ fontSize: 10 }}>{business.email}</Text>
              </View>
            )}
            {has("whatsappCta") && (
              <View style={styles.ctaBox}>
                <Text style={styles.ctaTitle}>Interested in This {type === "property" ? "Property" : "Project"}?</Text>
                <Text style={styles.ctaSubtitle}>Contact {business.name} Estate &amp; Builders</Text>
                <Text style={styles.ctaPhone}>{business.phone}</Text>
                {qrCodes.whatsapp && (
                  <>
                    <Image src={qrCodes.whatsapp} style={styles.qr} />
                    <Text style={{ fontSize: 9, marginTop: 8, color: MUTED }}>Scan to Chat on WhatsApp</Text>
                  </>
                )}
                {qrCodes.propertyUrl && (
                  <View style={{ marginTop: 16, alignItems: "center" }}>
                    <Image src={qrCodes.propertyUrl} style={styles.qr} />
                    <Text style={{ fontSize: 9, marginTop: 8, color: MUTED }}>
                      Scan to View {type === "property" ? "Property" : "Project"}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </PageChrome>
        </Page>
      )}

      {has("disclaimer") && (
        <Page size="A4" style={styles.page}>
          <PageChrome business={business}>
            <Text style={styles.h2}>Disclaimer</Text>
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                This brochure is provided for general information purposes only by {business.name} Estate &amp;
                Builders and does not constitute a legal offer, contract, or guarantee of any kind.
              </Text>
              <Text style={styles.disclaimerText}>
                Payment figures shown are estimates for informational purposes only. Please contact {business.name}{" "}
                Estate &amp; Builders for the confirmed price and official payment schedule.
              </Text>
              <Text style={styles.disclaimerText}>
                Property availability, pricing and terms are subject to change without notice and must be confirmed
                directly with {business.name} Estate &amp; Builders before making any decision.
              </Text>
            </View>
          </PageChrome>
        </Page>
      )}
    </Document>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={last ? styles.tableRowLast : styles.tableRow}>
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={styles.tableValue}>{value}</Text>
    </View>
  );
}

function formatMoney(value: number) {
  return `Rs. ${Math.round(value).toLocaleString("en-US")}`;
}
