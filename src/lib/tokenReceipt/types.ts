import { emptyParty, type AgreementLanguage, type AgreementParty } from "@/lib/rentAgreement/types";

// A token money receipt: the proof given to a client who pays a token (advance) to hold a
// property, before the rent agreement (or sale deal) is made.

export type TokenPurpose = "rent" | "sale";
export type PaymentMode = "Cash" | "Bank transfer" | "Cheque" | "JazzCash / Easypaisa";
export const paymentModes: PaymentMode[] = ["Cash", "Bank transfer", "Cheque", "JazzCash / Easypaisa"];

export interface TokenReceiptData {
  language: AgreementLanguage;
  /** 2 = a client copy and an office copy on the same A4 page. */
  copies: 1 | 2;
  purpose: TokenPurpose;
  /** ISO date the token was received. */
  receiptDate: string;
  /** The client who paid. */
  payer: AgreementParty;
  ownerName: string;
  ownerNameUr: string;
  property: {
    description: string;
    descriptionUr: string;
    area: string;
    areaUr: string;
    city: string;
    cityUr: string;
    size: string;
    sizeUr: string;
  };
  /** The token money received (Rs.). */
  amount: number;
  paymentMode: PaymentMode;
  /** Bank transaction / cheque number (optional). */
  reference: string;
  /** Agreed monthly rent (rent) or agreed price (sale). 0 = not written. */
  agreedAmount: number;
  /** Agreed security deposit (rent only). 0 = not written. */
  securityDeposit: number;
  /** The property is held for the client until this ISO date. */
  validUntil: string;
  terms: {
    adjusted: boolean;
    forfeitIfClientCancels: boolean;
    refundIfOwnerCancels: boolean;
    notAgreement: boolean;
  };
  /** One extra term per line. */
  extraTerms: string;
  /** The staff member who took the money. */
  receivedBy: string;
  receivedByUr: string;
}

export function defaultTokenData(): TokenReceiptData {
  const today = new Date();
  const valid = new Date(today.getTime() + 3 * 86400000);
  return {
    language: "ur",
    copies: 1,
    purpose: "rent",
    receiptDate: today.toISOString().slice(0, 10),
    payer: emptyParty(),
    ownerName: "",
    ownerNameUr: "",
    property: { description: "", descriptionUr: "", area: "", areaUr: "", city: "Lahore", cityUr: "", size: "", sizeUr: "" },
    amount: 0,
    paymentMode: "Cash",
    reference: "",
    agreedAmount: 0,
    securityDeposit: 0,
    validUntil: valid.toISOString().slice(0, 10),
    terms: { adjusted: true, forfeitIfClientCancels: true, refundIfOwnerCancels: true, notAgreement: true },
    extraTerms: "",
    receivedBy: "",
    receivedByUr: "",
  };
}

export function normalizeTokenData(input: Partial<TokenReceiptData> | null | undefined): TokenReceiptData {
  const d = defaultTokenData();
  const x = input ?? {};
  return {
    ...d,
    ...x,
    language: x.language === "en" ? "en" : "ur",
    copies: x.copies === 2 ? 2 : 1,
    purpose: x.purpose === "sale" ? "sale" : "rent",
    payer: { ...d.payer, ...(x.payer ?? {}) },
    property: { ...d.property, ...(x.property ?? {}) },
    terms: { ...d.terms, ...(x.terms ?? {}) },
  };
}

export function tokenProblems(d: TokenReceiptData): string[] {
  const out: string[] = [];
  const needEn = d.language === "en";
  const has = (en: string, ur: string) => (needEn ? en.trim() : en.trim() || ur.trim());
  const where = needEn ? " (write it in English)" : "";
  if (!has(d.payer.name, d.payer.nameUr)) out.push(`Client name is required${where}.`);
  if (!(d.amount > 0)) out.push("The token amount is required.");
  if (!has(d.property.description, d.property.descriptionUr)) out.push(`Property description is required${where}.`);
  if (!d.receiptDate) out.push("Receipt date is required.");
  return out;
}
