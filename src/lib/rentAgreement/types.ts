// What a rent agreement is made of. Everything the office types in the form is kept in
// one object (stored as JSON), so an agreement can be opened, corrected and printed again.

/** An agreement is written fully in Urdu or fully in English - never mixed. */
export type AgreementLanguage = "ur" | "en";
/** "plain": printed on ordinary paper with the company letterhead.
 *  "stamp": printed on stamp paper - the top of the first page is left empty for the stamp. */
export type AgreementPaper = "plain" | "stamp";
/** Legal (8.5 x 14 in) is the usual size for agreements in Pakistan. */
export type AgreementPageSize = "legal" | "a4";
export type PartyRelation = "S/O" | "D/O" | "W/O" | "";
export type PropertyPurpose = "Residential" | "Commercial" | "Office" | "School" | "Shop" | "Other";

export interface AgreementParty {
  name: string;
  relation: PartyRelation;
  relationName: string;
  cnic: string;
  address: string;
  phone: string;
  /** The same name / address written in Urdu, used in the Urdu text (optional). */
  nameUr: string;
  relationNameUr: string;
  addressUr: string;
}

export interface AgreementWitness {
  name: string;
  nameUr: string;
  cnic: string;
}

export interface RentAgreementData {
  language: AgreementLanguage;
  paper: AgreementPaper;
  pageSize: AgreementPageSize;
  /** ISO date (yyyy-mm-dd) the agreement is made on. */
  agreementDate: string;
  place: string;
  placeUr: string;
  owner: AgreementParty;
  tenant: AgreementParty;
  /** Only changes a few Urdu verb endings (karta / karti hoon). */
  tenantGender: "male" | "female";
  property: {
    /** House / shop / plot number and street, as it should read in the agreement. */
    description: string;
    area: string;
    city: string;
    /** e.g. "1 Kanal" or "10 Marla" */
    size: string;
    purpose: PropertyPurpose;
    purposeNote: string;
    /** e.g. "with electricity, gas and water connections, parking" */
    facilities: string;
    /** Urdu versions of the lines above (optional). */
    descriptionUr: string;
    areaUr: string;
    cityUr: string;
    sizeUr: string;
    facilitiesUr: string;
  };
  monthlyRent: number;
  securityDeposit: number;
  /** Rent is due on or before this day of every month. */
  payByDay: number;
  /** ISO date the tenancy starts. */
  startDate: string;
  termMonths: number;
  /** 0 = rent stays the same. */
  yearlyIncreasePercent: number;
  utilitiesBy: "tenant" | "owner";
  noticeMonths: number;
  options: {
    securityNotAdjustable: boolean;
    noSubLet: boolean;
    repairsByTenant: boolean;
    lawfulUse: boolean;
    noEarlyVacate: boolean;
    stayWaiver: boolean;
    actCompliance: boolean;
  };
  /** One extra term per line. Printed as typed in every language. */
  extraTerms: string;
  witnesses: AgreementWitness[];
}

export const emptyParty = (): AgreementParty => ({ name: "", relation: "", relationName: "", cnic: "", address: "", phone: "", nameUr: "", relationNameUr: "", addressUr: "" });

export function defaultAgreementData(): RentAgreementData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    language: "ur",
    paper: "plain",
    pageSize: "a4",
    agreementDate: today,
    place: "Lahore",
    placeUr: "",
    owner: emptyParty(),
    tenant: emptyParty(),
    tenantGender: "male",
    property: { description: "", area: "", city: "Lahore", size: "", purpose: "Residential", purposeNote: "", facilities: "", descriptionUr: "", areaUr: "", cityUr: "", sizeUr: "", facilitiesUr: "" },
    monthlyRent: 0,
    securityDeposit: 0,
    payByDay: 10,
    startDate: today,
    termMonths: 11,
    yearlyIncreasePercent: 10,
    utilitiesBy: "tenant",
    noticeMonths: 2,
    options: { securityNotAdjustable: true, noSubLet: true, repairsByTenant: true, lawfulUse: true, noEarlyVacate: true, stayWaiver: true, actCompliance: true },
    extraTerms: "",
    witnesses: [
      { name: "", nameUr: "", cnic: "" },
      { name: "", nameUr: "", cnic: "" },
    ],
  };
}

/** Fills in anything missing (an older saved agreement, or a partial prefill) with the defaults. */
export function normalizeAgreementData(input: Partial<RentAgreementData> | null | undefined): RentAgreementData {
  const d = defaultAgreementData();
  const x = input ?? {};
  return {
    ...d,
    ...x,
    // (an older draft could say "both"; that option no longer exists)
    language: x.language === "en" ? "en" : "ur",
    // company letterhead = A4, stamp paper = Legal (the page size always follows the paper)
    pageSize: x.paper === "stamp" ? "legal" : "a4",
    owner: { ...d.owner, ...(x.owner ?? {}) },
    tenant: { ...d.tenant, ...(x.tenant ?? {}) },
    property: { ...d.property, ...(x.property ?? {}) },
    options: { ...d.options, ...(x.options ?? {}) },
    witnesses: [0, 1].map((i) => ({ name: x.witnesses?.[i]?.name ?? "", nameUr: x.witnesses?.[i]?.nameUr ?? "", cnic: x.witnesses?.[i]?.cnic ?? "" })),
  };
}

/** What is typed only in English although the agreement is in Urdu - it would print in English inside the Urdu page. */
export function urduGaps(d: RentAgreementData): string[] {
  const out: string[] = [];
  const miss = (label: string, en: string, ur: string) => {
    if (en.trim() && !ur.trim()) out.push(label);
  };
  const party = (who: string, p: AgreementParty) => {
    miss(`${who} name`, p.name, p.nameUr);
    miss(`${who} father/husband name`, p.relationName, p.relationNameUr);
    miss(`${who} address`, p.address, p.addressUr);
  };
  party("Owner", d.owner);
  party("Tenant", d.tenant);
  const pr = d.property;
  miss("Property description", pr.description, pr.descriptionUr);
  miss("Area / locality", pr.area, pr.areaUr);
  if (!/^lahore$/i.test(pr.city.trim())) miss("City", pr.city, pr.cityUr);
  miss("Property size", pr.size, pr.sizeUr);
  miss("Facilities", pr.facilities, pr.facilitiesUr);
  if (d.place.trim() && !/^lahore$/i.test(d.place.trim())) miss("Place", d.place, d.placeUr);
  d.witnesses.forEach((w, i) => miss(`Witness ${i + 1} name`, w.name, w.nameUr));
  return out;
}

/** Why an agreement cannot be made yet (empty when it is complete enough to print). */
export function agreementProblems(d: RentAgreementData): string[] {
  const out: string[] = [];
  // English is printed from the English boxes only, so they must be filled for an English agreement.
  const needEn = d.language === "en";
  const has = (en: string, ur: string) => (needEn ? en.trim() : en.trim() || ur.trim());
  const where = needEn ? " (write it in English)" : "";
  if (!has(d.owner.name, d.owner.nameUr)) out.push(`Owner name is required${where}.`);
  if (!has(d.tenant.name, d.tenant.nameUr)) out.push(`Tenant name is required${where}.`);
  if (!has(d.property.description, d.property.descriptionUr)) out.push(`Property description is required (house / shop number and street)${where}.`);
  if (!(d.monthlyRent > 0)) out.push("Monthly rent is required.");
  if (!d.startDate) out.push("Start date is required.");
  if (!(d.termMonths >= 1)) out.push("Agreement duration is required.");
  // An Urdu agreement must be Urdu all through: anything typed only in English would print in English.
  if (d.language === "ur") {
    const gaps = urduGaps(d);
    if (gaps.length) out.push(`Write these in Urdu too (the Urdu boxes), so the agreement is all Urdu: ${gaps.join(", ")}.`);
  }
  return out;
}
