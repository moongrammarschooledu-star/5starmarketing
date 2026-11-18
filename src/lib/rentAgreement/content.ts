import type { AgreementParty, PartyRelation, PropertyPurpose, RentAgreementData } from "./types";
import { groupLakh, numberToWordsEn, numberToWordsUr } from "./words";

// Builds the wording of the agreement in English and Urdu from what was typed in the form.
// Every paragraph exists in both languages, so the PDF can print Urdu only, English only,
// or both side by side. The Urdu follows the wording of the usual "Iqrar nama muahida
// kirayedari" used in Lahore.

export interface Para {
  en: string;
  ur: string;
}

export interface AgreementContent {
  title: Para;
  /** The "between ... and ..." lines and the opening paragraph (not numbered). */
  intro: Para[];
  /** Numbered terms. */
  clauses: Para[];
  /** Extra terms the office typed, one per line; printed as typed, numbered after the clauses. */
  extra: string[];
  closing: Para;
}

export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

/** The last day of the tenancy: start + months - 1 day. */
function endDateIso(startIso: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startIso);
  if (!m) return startIso;
  const end = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + months, Number(m[3]) - 1));
  return end.toISOString().slice(0, 10);
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 < 4 ? n % 10 : 0]}`;
}

const REL_EN: Record<Exclude<PartyRelation, "">, string> = { "S/O": "son of", "D/O": "daughter of", "W/O": "wife of" };
const REL_UR: Record<Exclude<PartyRelation, "">, string> = { "S/O": "ولد", "D/O": "دختر", "W/O": "زوجہ" };

/** English text uses the English field, falling back to the Urdu one if only that was typed (and the other way round). */
export const pick = (first: string, second: string) => first.trim() || second.trim();

export function partyEn(p: AgreementParty): string {
  return [
    p.name.trim(),
    p.relation && p.relationName.trim() ? `${REL_EN[p.relation]} ${p.relationName.trim()}` : "",
    p.cnic.trim() ? `CNIC No. ${p.cnic.trim()}` : "",
    p.address.trim() ? `resident of ${p.address.trim()}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

export function partyUr(p: AgreementParty): string {
  const relName = pick(p.relationNameUr, p.relationName);
  return [
    pick(p.nameUr, p.name),
    p.relation && relName ? `${REL_UR[p.relation]} ${relName}` : "",
    p.cnic.trim() ? `شناختی کارڈ نمبر ${p.cnic.trim()}` : "",
    pick(p.addressUr, p.address) ? `ساکن ${pick(p.addressUr, p.address)}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const PURPOSE_EN: Record<PropertyPurpose, string> = {
  Residential: "residential purposes",
  Commercial: "commercial purposes",
  Office: "office purposes",
  School: "running a school",
  Shop: "running a shop",
  Other: "the agreed purpose",
};
const PURPOSE_UR: Record<PropertyPurpose, string> = {
  Residential: "رہائشی مقصد کے لیے",
  Commercial: "کمرشل مقصد کے لیے",
  Office: "دفتری مقصد کے لیے",
  School: "سکول کے مقصد کے لیے",
  Shop: "دکان کے مقصد کے لیے",
  Other: "طے شدہ مقصد کے لیے",
};
const NOUN_UR: Record<PropertyPurpose, string> = {
  Residential: "مکان",
  Commercial: "عمارت",
  Office: "دفتر",
  School: "عمارت",
  Shop: "دکان",
  Other: "جائیداد",
};

/** The tenant speaks in the first person in the Urdu text; swap the verb endings for a woman. */
function feminise(text: string): string {
  return text
    .replace(/کرتا ہوں/g, "کرتی ہوں")
    .replace(/ہوں گا/g, "ہوں گی")
    .replace(/کروں گا/g, "کروں گی")
    .replace(/رکھوں گا/g, "رکھوں گی");
}

export function buildAgreementContent(d: RentAgreementData): AgreementContent {
  // A non-breaking space keeps "Rs." and the amount on the same line.
  const fig = (n: number) => `Rs. ${groupLakh(n)}/-`;
  const rentEnWords = `${numberToWordsEn(d.monthlyRent)} Rupees Only`;
  const rentUrWords = `${numberToWordsUr(d.monthlyRent)} روپے`;
  const depEnWords = `${numberToWordsEn(d.securityDeposit)} Rupees Only`;
  const depUrWords = `${numberToWordsUr(d.securityDeposit)} روپے`;

  const months = Math.max(1, Math.round(d.termMonths));
  const years = months / 12;
  const termEn = months % 12 === 0 ? `${numberToWordsEn(years)} (${years}) year${years > 1 ? "s" : ""}` : `${numberToWordsEn(months)} (${months}) month${months > 1 ? "s" : ""}`;
  const termUr = months % 12 === 0 ? `${numberToWordsUr(years)} سال` : `${numberToWordsUr(months)} ماہ`;
  const notice = Math.max(1, Math.round(d.noticeMonths));
  const noticeEn = `${numberToWordsEn(notice)} (${notice}) month${notice > 1 ? "s" : ""}`;
  const noticeUr = `${numberToWordsUr(notice)} ماہ`;

  const start = fmtDate(d.startDate);
  const end = fmtDate(endDateIso(d.startDate, months));
  const date = fmtDate(d.agreementDate);
  const purpose = d.property.purpose;
  const commercialUse = purpose !== "Residential";
  const purposeEn = purpose === "Other" && d.property.purposeNote.trim() ? d.property.purposeNote.trim() : PURPOSE_EN[purpose];
  const purposeUr = purpose === "Other" && d.property.purposeNote.trim() ? `${d.property.purposeNote.trim()} کے مقصد کے لیے` : PURPOSE_UR[purpose];

  const pr = d.property;
  const whereEn = [pr.area.trim(), pr.city.trim()].filter(Boolean).join(", ");
  const whereUr = [pick(pr.areaUr, pr.area), pick(pr.cityUr, pr.city)].filter(Boolean).join(" ");
  const premisesEn = [pr.description.trim(), whereEn, pr.size.trim() ? `area ${pr.size.trim()}` : "", pr.facilities.trim() ? `with ${pr.facilities.trim()}` : ""].filter(Boolean).join(", ");
  const premisesUr = [
    pick(pr.descriptionUr, pr.description),
    whereUr ? `واقع ${whereUr}` : "",
    pick(pr.sizeUr, pr.size) ? `رقبہ ${pick(pr.sizeUr, pr.size)}` : "",
    pick(pr.facilitiesUr, pr.facilities) ? `بمعہ ${pick(pr.facilitiesUr, pr.facilities)}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const placeEn = d.place.trim() || "Lahore";
  const placeUr = d.placeUr.trim() || (/^lahore$/i.test(d.place.trim()) || !d.place.trim() ? "لاہور" : d.place.trim());

  const o = d.options;
  const clauses: Para[] = [];

  if (d.securityDeposit > 0) {
    clauses.push({
      en: `The Tenant has paid ${fig(d.securityDeposit)} (${depEnWords}) to the Owner as a refundable security deposit.${o.securityNotAdjustable ? " The security shall not be adjusted against the monthly rent, and when vacating the premises the Tenant shall not demand more than the security paid." : ""}`,
      ur: `یہ کہ مبلغ ${depUrWords} (${fig(d.securityDeposit)}) بطور سیکورٹی (قابل واپسی) طے پائی ہے جو میں مقر نے مالک مذکور کو ادا کر دی ہے۔${o.securityNotAdjustable ? " سیکورٹی کی رقم کرایہ میں ہرگز ایڈجسٹ نہ ہوگی اور مکان خالی کرتے وقت میں مقر ادا شدہ سیکورٹی سے زیادہ مطالبہ کرنے کا ہرگز مجاز نہ ہوں گا۔" : ""}`,
    });
  }

  clauses.push({
    en: `The Tenant shall pay the monthly rent of ${fig(d.monthlyRent)} (${rentEnWords}) in advance, on or before the ${ordinal(d.payByDay)} day of every month.`,
    ur: `یہ کہ میں مقر ماہانہ کرایہ ہر ماہ کی ${d.payByDay} تاریخ تک ماہ بہ ماہ ایڈوانس ادا کرنے کا پابند ہوں گا۔`,
  });

  clauses.push({
    en: `This tenancy starts on ${start} and is agreed for a period of ${termEn} (up to ${end}). It can be extended only by the mutual consent of the Owner and the Tenant.`,
    ur: `یہ کہ میعاد معاہدہ کرایہ داری ہذا مورخہ ${start} سے شروع ہو کر برائے ${termUr} (مورخہ ${end} تک) طے پائی ہے۔ جس میں توسیع میں مقر اور مالک مذکور کی باہمی رضامندی سے ممکن ہوگی۔`,
  });

  if (d.yearlyIncreasePercent > 0) {
    clauses.push({
      en: `After every year the monthly rent shall be increased by ${d.yearlyIncreasePercent}%.`,
      ur: `یہ کہ ماہانہ کرایہ میں ہر سال کے بعد ${d.yearlyIncreasePercent}% کے حساب سے اضافہ ہوا کرے گا۔`,
    });
  }

  clauses.push(
    d.utilitiesBy === "tenant"
      ? {
          en: "The Tenant shall pay the electricity, gas, water and other utility bills regularly every month and hand the paid receipts to the Owner. If any connection is cut because of non-payment, the Tenant shall have it restored at the Tenant's own cost.",
          ur: "یہ کہ میں مقر ماہانہ بل بجلی، پانی اور سوئی گیس ماہ بہ ماہ باقاعدگی سے ادا کرنے کا پابند ہوں گا اور ماہانہ رسید بل مالک مذکور کو جمع کروانے کا پابند ہوں گا اور عدم ادائیگی کی وجہ سے کوئی کنکشن کٹ گیا تو میں مقر از گرہ خود رقم خرچ کر کے بحال کروا کر دینے کا پابند و ذمہ دار ہوں گا۔",
        }
      : {
          en: "The electricity, gas and water bills of the premises shall be paid by the Owner.",
          ur: "یہ کہ جائیداد مذکورہ کے بجلی، پانی اور سوئی گیس کے ماہانہ بل مالک مذکور ادا کرے گا۔",
        }
  );

  if (o.noSubLet) {
    clauses.push({
      en: "The Tenant shall hand back possession of the premises to the Owner only. The Tenant shall not keep any other person as a tenant and shall not sub-let the premises.",
      ur: "یہ کہ میں مقر قبضہ جائیداد مذکورہ بالا حوالے مالک مذکور ہی کروں گا، کسی دیگر فرد کو بطور کرایہ دار نہ رکھوں گا اور نہ ہی سب لیٹ (Sub-Let) کروں گا۔",
    });
  }

  if (o.repairsByTenant) {
    clauses.push({
      en: "The Tenant shall get any damage or breakage caused in the premises repaired at the Tenant's own cost, and shall not make any structural change without the written permission of the Owner.",
      ur: "یہ کہ میں مقر جائیداد مذکورہ بالا میں کسی قسم کی توڑ پھوڑ یا نقصان کی صورت میں از گرہ خود مرمت وغیرہ کروا کے دینے کا پابند ہوں گا اور مالک مذکور کی تحریری اجازت کے بغیر کوئی تعمیری تبدیلی نہ کروں گا۔",
    });
  }

  if (o.lawfulUse) {
    clauses.push({
      en: `The Tenant shall not carry out any illegal or immoral activity in the premises and shall use them only for ${purposeEn}. The premises shall be returned in the same condition in which they were taken.${commercialUse ? " If LDA or any other authority imposes commercial charges or taxes because of this use, they shall be borne by the Tenant." : ""}`,
      ur: `یہ کہ جائیداد مذکورہ بالا میں دھواں دار کام یا کسی قسم کا غیر قانونی یا غیر اخلاقی کام نہیں کروں گا اور اسے صرف ${purposeUr} استعمال کروں گا اور جائیداد مذکورہ جس حالت میں لی ہے اسی حالت میں واپس کرنے کا پابند ہوں گا۔${commercialUse ? " اگر محکمہ LDA یا کسی متعلقہ ادارے کی طرف سے کمرشل چارجز یا ٹیکس لاگو ہوئے تو وہ بذمہ کرایہ دار ہوں گے۔" : ""}`,
    });
  }

  clauses.push(
    o.noEarlyVacate
      ? {
          en: `As this agreement is for ${termEn}, the Owner shall not ask for the premises to be vacated before the end of this period. If the premises have to be vacated earlier by mutual consent, a written notice of ${noticeEn} must be given by the Tenant or the Owner.`,
          ur: `یہ کہ معاہدہ ہذا برائے ${termUr} طے پایا ہے اس لیے اس مدت سے پہلے مالک مذکور خالی کروانے کا مجاز نہ ہوگا اور اگر فریقین کی باہمی رضامندی سے مکان خالی کرنا یا کروانا پڑا تو میں مقر اور مالک مذکور کی طرف سے ${noticeUr} قبل تحریری نوٹس دینا لازمی ہوگا۔`,
        }
      : {
          en: `Either party may end this agreement by giving a written notice of ${noticeEn} to the other party.`,
          ur: `یہ کہ فریقین میں سے کوئی بھی فریق دوسرے کو ${noticeUr} قبل تحریری نوٹس دے کر معاہدہ ہذا ختم کر سکتا ہے۔`,
        }
  );

  if (o.stayWaiver) {
    clauses.push({
      en: "After receiving a notice to vacate from the Owner, the Tenant shall not obtain any stay order or start any legal action against it. If the Owner has to take legal action in this matter, all costs and losses shall be borne by the Tenant.",
      ur: "یہ کہ میں مقر مالک مذکور کی طرف سے جائیداد خالی کرنے کا نوٹس ملنے پر کوئی قانونی چارہ جوئی یا حکم امتناعی (Stay) وغیرہ حاصل نہ کروں گا۔ اگر مالک مذکور کو اس سلسلہ میں کوئی چارہ جوئی کرنا پڑی تو اس کا ہرجہ و خرچہ اور نقصان بذمہ میں مقر ہوگا۔",
    });
  }

  if (d.securityDeposit > 0) {
    clauses.push({
      en: "If any bills, dues or damages remain at the time of vacating, the Owner may deduct them from the security deposit and shall return the remaining security to the Tenant.",
      ur: "یہ کہ اگر جائیداد مذکورہ میں کوئی ڈیوز یا بل وغیرہ باقی ہوئے تو مالک مذکور جمع شدہ سیکورٹی سے بل ڈیوز وغیرہ جمع کروا کر باقی سیکورٹی کرایہ دار مذکور کو واپس دینے کا پابند ہوگا۔",
    });
  }

  if (o.actCompliance) {
    clauses.push({
      en: "The Tenant shall abide by all the conditions of the tenancy law in force (including the Punjab Rented Premises Act, 2009).",
      ur: "یہ کہ میں مقر قانون کرایہ داری (پنجاب رینٹڈ پریمائزز ایکٹ 2009) کی جملہ شرائط کا پابند ہوں گا۔",
    });
  }

  const female = d.tenantGender === "female";
  const fixUr = (s: string) => (female ? feminise(s) : s);
  const noun = NOUN_UR[purpose];

  return {
    title: { en: "RENT AGREEMENT", ur: "اقرار نامہ معاہدہ کرایہ داری" },
    intro: [
      { en: `This Rent Agreement is made on ${date} at ${placeEn}.`, ur: `مقام ${placeUr}، تاریخ ${date}` },
      { en: `BETWEEN: ${partyEn(d.owner)} (hereinafter called the "Owner").`, ur: `بحق: ${partyUr(d.owner)} (مالک مکان)` },
      { en: `AND: ${partyEn(d.tenant)} (hereinafter called the "Tenant").`, ur: fixUr(`منکہ: ${partyUr(d.tenant)} (کرایہ دار)`) },
      {
        en: `The Tenant, of free will and in sound mind, has taken on rent from the Owner the premises: ${premisesEn}, at a monthly rent of ${fig(d.monthlyRent)} (${rentEnWords}). The other terms and conditions of the tenancy agreed between the parties are as follows:`,
        ur: fixUr(`یہ کہ میں مقر بغیر جبر و اکراہ و بحالت ہوش و حواس خمسہ خود تحریر کرتا ہوں کہ میں مقر نے ایک قطعہ ${noun} ${premisesUr} از مالک مذکور بحساب ماہانہ کرایہ مبلغ ${rentUrWords} (${fig(d.monthlyRent)}) پر حاصل کیا ہے۔ دیگر شرائط کرایہ داری مندرجہ ذیل طے پائی ہیں۔`),
      },
    ],
    clauses: clauses.map((c) => ({ en: c.en, ur: fixUr(c.ur) })),
    extra: d.extraTerms
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean),
    closing: {
      en: `This rent agreement has been written on ${date} so that it may serve as proof and be used whenever required.`,
      ur: `لہذا یہ اقرار نامہ معاہدہ کرایہ داری تحریر کر دیا ہے تاکہ سند رہے اور بوقت ضرورت کام آوے۔ المرقوم مورخہ ${date}`,
    },
  };
}
