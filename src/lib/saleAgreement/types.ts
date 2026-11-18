import { emptyParty, type AgreementLanguage, type AgreementPaper, type AgreementParty, type AgreementWitness } from "@/lib/rentAgreement/types";

// An agreement to sell a property (bayana / iqrar nama bai) between a seller and a buyer.

export type SaleKind = "House" | "Plot" | "Flat" | "Shop" | "Commercial" | "Other";
export type CostsBy = "buyer" | "seller" | "half";
export type CommissionBy = "buyer" | "seller" | "both";

export interface SaleAgreementData {
  language: AgreementLanguage;
  paper: AgreementPaper;
  /** ISO date the agreement is made on. */
  agreementDate: string;
  place: string;
  placeUr: string;
  seller: AgreementParty;
  buyer: AgreementParty;
  property: {
    kind: SaleKind;
    description: string;
    descriptionUr: string;
    area: string;
    areaUr: string;
    city: string;
    cityUr: string;
    size: string;
    sizeUr: string;
    /** Ownership papers: fard / registry / allotment numbers, khasra, society file ... */
    titleDetails: string;
    titleDetailsUr: string;
  };
  totalPrice: number;
  /** Advance (bayana) already paid. 0 = none. */
  advancePaid: number;
  /** ISO date the advance was paid ("" = not written). */
  advanceDate: string;
  /** The token / bayana receipt number, if one was issued (e.g. TR-000012). */
  advanceReceiptNo: string;
  /** The registry / transfer is done and the balance paid on or before this ISO date. */
  balanceDueDate: string;
  /** ISO date the buyer gets possession ("" = at the time of registry and full payment). */
  possessionDate: string;
  transferCostsBy: CostsBy;
  /** Dealer commission in percent (0 = no commission clause). */
  commissionPercent: number;
  commissionBy: CommissionBy;
  options: {
    clearTitle: boolean;
    duesCleared: boolean;
    noThirdParty: boolean;
    buyerDefaultForfeit: boolean;
    sellerDefaultDouble: boolean;
    documentsHandover: boolean;
    courtsClause: boolean;
  };
  extraTerms: string;
  witnesses: AgreementWitness[];
}

export function defaultSaleData(): SaleAgreementData {
  const today = new Date();
  const due = new Date(today.getTime() + 30 * 86400000);
  return {
    language: "ur",
    paper: "plain",
    agreementDate: today.toISOString().slice(0, 10),
    place: "Lahore",
    placeUr: "",
    seller: emptyParty(),
    buyer: emptyParty(),
    property: { kind: "House", description: "", descriptionUr: "", area: "", areaUr: "", city: "Lahore", cityUr: "", size: "", sizeUr: "", titleDetails: "", titleDetailsUr: "" },
    totalPrice: 0,
    advancePaid: 0,
    advanceDate: today.toISOString().slice(0, 10),
    advanceReceiptNo: "",
    balanceDueDate: due.toISOString().slice(0, 10),
    possessionDate: "",
    transferCostsBy: "buyer",
    commissionPercent: 0,
    commissionBy: "both",
    options: { clearTitle: true, duesCleared: true, noThirdParty: true, buyerDefaultForfeit: true, sellerDefaultDouble: true, documentsHandover: true, courtsClause: true },
    extraTerms: "",
    witnesses: [
      { name: "", nameUr: "", cnic: "" },
      { name: "", nameUr: "", cnic: "" },
    ],
  };
}

export function normalizeSaleData(input: Partial<SaleAgreementData> | null | undefined): SaleAgreementData {
  const d = defaultSaleData();
  const x = input ?? {};
  return {
    ...d,
    ...x,
    language: x.language === "en" ? "en" : "ur",
    paper: x.paper === "stamp" ? "stamp" : "plain",
    seller: { ...d.seller, ...(x.seller ?? {}) },
    buyer: { ...d.buyer, ...(x.buyer ?? {}) },
    property: { ...d.property, ...(x.property ?? {}) },
    options: { ...d.options, ...(x.options ?? {}) },
    witnesses: [0, 1].map((i) => ({ name: x.witnesses?.[i]?.name ?? "", nameUr: x.witnesses?.[i]?.nameUr ?? "", cnic: x.witnesses?.[i]?.cnic ?? "" })),
  };
}

export function saleProblems(d: SaleAgreementData): string[] {
  const out: string[] = [];
  const needEn = d.language === "en";
  const has = (en: string, ur: string) => (needEn ? en.trim() : en.trim() || ur.trim());
  const where = needEn ? " (write it in English)" : "";
  if (!has(d.seller.name, d.seller.nameUr)) out.push(`Seller name is required${where}.`);
  if (!has(d.buyer.name, d.buyer.nameUr)) out.push(`Buyer name is required${where}.`);
  if (!has(d.property.description, d.property.descriptionUr)) out.push(`Property description is required${where}.`);
  if (!(d.totalPrice > 0)) out.push("Total price is required.");
  if (d.advancePaid > d.totalPrice) out.push("The advance cannot be more than the total price.");
  if (!d.balanceDueDate) out.push("The registry / balance date is required.");
  return out;
}
