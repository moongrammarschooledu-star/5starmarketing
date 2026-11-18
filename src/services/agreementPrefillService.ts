import "server-only";
import { leaseService } from "@/services/leaseService";
import { landlordService } from "@/services/landlordService";
import { tenantService } from "@/services/tenantService";
import { propertyService } from "@/services/propertyService";
import { ownerDetailsService } from "@/services/ownerDetailsService";
import { tokenReceiptService } from "@/services/tokenReceiptService";
import { fmtDate } from "@/lib/rentAgreement/content";
import { groupLakh } from "@/lib/rentAgreement/words";
import { emptyParty, type RentAgreementData } from "@/lib/rentAgreement/types";
import type { SaleAgreementData, SaleKind } from "@/lib/saleAgreement/types";

// Fills the agreement form from records the office already has, so nothing is typed twice.
// Only what is known is filled; the rest stays empty for the office to complete.

type Prefill = Partial<RentAgreementData>;
type SalePrefill = Partial<SaleAgreementData>;

/** Whole months between the start and the last day of a lease (the end day counts). */
function monthsBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso) + 86400000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 11;
  return Math.max(1, Math.round((end - start) / (30.4375 * 86400000)));
}

export const agreementPrefillService = {
  async fromLease(leaseId: string): Promise<Prefill | undefined> {
    const lease = await leaseService.getById(leaseId);
    if (!lease) return undefined;
    const [landlord, tenant] = await Promise.all([landlordService.getById(lease.landlordId).catch(() => undefined), tenantService.getById(lease.tenantId).catch(() => undefined)]);
    return {
      owner: { ...emptyParty(), name: landlord?.name ?? lease.landlordName ?? "", phone: landlord?.phone ?? "", address: landlord?.address ?? "" },
      tenant: { ...emptyParty(), name: tenant?.name ?? lease.tenantName ?? "", phone: tenant?.phone ?? "" },
      property: {
        description: [lease.propertyTitle, lease.unitNumber ? `Unit ${lease.unitNumber}` : ""].filter(Boolean).join(", "),
        area: "",
        city: "Lahore",
        size: "",
        purpose: "Residential",
        purposeNote: "",
        facilities: "",
        descriptionUr: "",
        areaUr: "",
        cityUr: "",
        sizeUr: "",
        facilitiesUr: "",
      },
      monthlyRent: lease.monthlyRent,
      securityDeposit: lease.securityDeposit,
      payByDay: lease.paymentDueDay || 10,
      startDate: lease.startDate,
      termMonths: monthsBetween(lease.startDate, lease.endDate),
      noticeMonths: Math.max(1, Math.round((lease.noticePeriodDays || 30) / 30)),
      utilitiesBy: lease.utilitiesResponsibility === "LANDLORD" ? "owner" : "tenant",
    };
  },

  /** The rent agreement for a client who already paid a token: client, owner, property, rent and a line about the token. */
  async fromToken(tokenId: string): Promise<Prefill | undefined> {
    const record = await tokenReceiptService.getById(tokenId);
    if (!record) return undefined;
    const t = record.data;
    const urdu = t.language === "ur";
    const when = fmtDate(t.receiptDate);
    const amount = `Rs. ${groupLakh(t.amount)}/-`;
    const tokenLine = t.terms.adjusted
      ? urdu
        ? `ٹوکن منی مبلغ ${amount} مورخہ ${when} (رسید نمبر ${record.receiptNo}) وصول ہو چکی ہے جو پہلے ماہ کے کرایہ / سیکورٹی میں ایڈجسٹ کی گئی ہے۔`
        : `Token money of ${amount} was received on ${when} (Receipt No. ${record.receiptNo}) and is adjusted against the first month rent / security deposit.`
      : "";
    return {
      language: t.language,
      owner: { ...emptyParty(), name: t.ownerName, nameUr: t.ownerNameUr },
      tenant: { ...t.payer },
      property: {
        description: t.property.description,
        descriptionUr: t.property.descriptionUr,
        area: t.property.area,
        areaUr: t.property.areaUr,
        city: t.property.city,
        cityUr: t.property.cityUr,
        size: t.property.size,
        sizeUr: t.property.sizeUr,
        purpose: "Residential",
        purposeNote: "",
        facilities: "",
        facilitiesUr: "",
      },
      monthlyRent: t.agreedAmount,
      securityDeposit: t.securityDeposit,
      extraTerms: tokenLine,
    };
  },


  /** A sale agreement for a client who already paid a bayana (sale token receipt). */
  async saleFromToken(tokenId: string): Promise<SalePrefill | undefined> {
    const record = await tokenReceiptService.getById(tokenId);
    if (!record) return undefined;
    const t = record.data;
    return {
      language: t.language,
      seller: { ...emptyParty(), name: t.ownerName, nameUr: t.ownerNameUr },
      buyer: { ...t.payer },
      property: { kind: "House", description: t.property.description, descriptionUr: t.property.descriptionUr, area: t.property.area, areaUr: t.property.areaUr, city: t.property.city, cityUr: t.property.cityUr, size: t.property.size, sizeUr: t.property.sizeUr, titleDetails: "", titleDetailsUr: "" },
      totalPrice: t.agreedAmount,
      advancePaid: t.amount,
      advanceDate: t.receiptDate,
      advanceReceiptNo: record.receiptNo,
    };
  },

  /** A sale agreement for one of our own properties: seller (its owner), property, price. */
  async saleFromProperty(propertyId: string): Promise<SalePrefill | undefined> {
    const property = await propertyService.getById(propertyId);
    if (!property) return undefined;
    const owner = await ownerDetailsService.getForProperty(propertyId).catch(() => null);
    const kind: SaleKind = property.type === "Flat" ? "Flat" : property.type === "Residential Plot" ? "Plot" : property.type === "Commercial Property" ? "Commercial" : "House";
    return {
      seller: { ...emptyParty(), name: owner?.name ?? "", phone: owner?.phone ?? "", address: owner?.address ?? "" },
      property: { kind, description: property.title, descriptionUr: "", area: property.location, areaUr: "", city: property.city || "Lahore", cityUr: "", size: property.size, sizeUr: "", titleDetails: "", titleDetailsUr: "" },
      totalPrice: property.purpose === "For Sale" && property.priceValue ? property.priceValue : 0,
    };
  },

  async fromProperty(propertyId: string): Promise<Prefill | undefined> {
    const property = await propertyService.getById(propertyId);
    if (!property) return undefined;
    const owner = await ownerDetailsService.getForProperty(propertyId).catch(() => null);
    return {
      owner: { ...emptyParty(), name: owner?.name ?? "", phone: owner?.phone ?? "", address: owner?.address ?? "" },
      property: {
        description: property.title,
        area: property.location,
        city: property.city || "Lahore",
        size: property.size,
        purpose: property.type === "Commercial Property" ? "Commercial" : "Residential",
        purposeNote: "",
        facilities: "",
        descriptionUr: "",
        areaUr: "",
        cityUr: "",
        sizeUr: "",
        facilitiesUr: "",
      },
      monthlyRent: property.purpose === "For Rent" && property.priceValue ? property.priceValue : 0,
    };
  },
};
