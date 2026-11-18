import { site } from "@/lib/site";
import { fmtDate, partyEn, partyUr, pick } from "@/lib/rentAgreement/content";
import { groupLakh, numberToWordsEn, numberToWordsUr } from "@/lib/rentAgreement/words";
import type { PaymentMode, TokenReceiptData } from "./types";

interface Para {
  en: string;
  ur: string;
}

export interface TokenContent {
  title: Para;
  /** The sentence that says who paid how much for what. */
  body: Para;
  terms: Para[];
  extra: string[];
  signLabels: { receiver: Para; client: Para };
}

const MODE_UR: Record<PaymentMode, string> = {
  Cash: "نقد",
  "Bank transfer": "بینک ٹرانسفر",
  Cheque: "چیک",
  "JazzCash / Easypaisa": "جاز کیش / ایزی پیسہ",
};

export function buildTokenContent(d: TokenReceiptData): TokenContent {
  const rent = d.purpose === "rent";
  // A non-breaking space keeps "Rs." and the amount on the same line.
  const fig = (n: number) => `Rs. ${groupLakh(n)}/-`;
  const wEn = (n: number) => `${numberToWordsEn(n)} Rupees Only`;
  const wUr = (n: number) => `${numberToWordsUr(n)} روپے`;
  const date = fmtDate(d.receiptDate);
  const until = fmtDate(d.validUntil);
  const p = d.property;

  const whereEn = [p.area.trim(), p.city.trim()].filter(Boolean).join(", ");
  const whereUr = [pick(p.areaUr, p.area), pick(p.cityUr, p.city)].filter(Boolean).join(" ");
  const premisesEn = [p.description.trim(), whereEn, p.size.trim() ? `area ${p.size.trim()}` : ""].filter(Boolean).join(", ");
  const premisesUr = [pick(p.descriptionUr, p.description), whereUr ? `واقع ${whereUr}` : "", pick(p.sizeUr, p.size) ? `رقبہ ${pick(p.sizeUr, p.size)}` : ""].filter(Boolean).join(" ");
  const ownerEn = d.ownerName.trim();
  const ownerUr = pick(d.ownerNameUr, d.ownerName);

  const bodyEn =
    `Received with thanks from ${partyEn(d.payer)} a sum of ${fig(d.amount)} (${wEn(d.amount)}) by ${d.paymentMode.toLowerCase()}${d.reference.trim() ? ` (Ref. ${d.reference.trim()})` : ""} on ${date}, ` +
    `as ${rent ? "token money (advance)" : "advance (bayana)"} for ${rent ? "renting" : "buying"} the premises: ${premisesEn}${ownerEn ? `, owned by ${ownerEn}` : ""}` +
    `${d.agreedAmount > 0 ? `, at an agreed ${rent ? "monthly rent" : "price"} of ${fig(d.agreedAmount)} (${wEn(d.agreedAmount)})` : ""}` +
    `${rent && d.securityDeposit > 0 ? ` and a security deposit of ${fig(d.securityDeposit)} (${wEn(d.securityDeposit)})` : ""}.`;
  const bodyUr =
    `وصول پایا از ${partyUr(d.payer)} مبلغ ${wUr(d.amount)} (${fig(d.amount)}) بذریعہ ${MODE_UR[d.paymentMode]}${d.reference.trim() ? ` (حوالہ نمبر ${d.reference.trim()})` : ""} مورخہ ${date} ` +
    `بطور ${rent ? "ٹوکن منی (بیعانہ)" : "بیعانہ"} برائے ${rent ? "کرایہ پر لینے" : "خریدنے"} ${premisesUr}${ownerUr ? ` مالک ${ownerUr}` : ""}` +
    `${d.agreedAmount > 0 ? ` طے شدہ ${rent ? "ماہانہ کرایہ" : "قیمت"} مبلغ ${wUr(d.agreedAmount)} (${fig(d.agreedAmount)})` : ""}` +
    `${rent && d.securityDeposit > 0 ? ` اور سیکورٹی مبلغ ${wUr(d.securityDeposit)} (${fig(d.securityDeposit)})` : ""}۔`;

  const t = d.terms;
  const terms: Para[] = [];
  const tkEn = rent ? "token money" : "advance (bayana)";
  const tkUr = rent ? "ٹوکن رقم" : "بیعانہ کی رقم";
  if (t.adjusted) {
    terms.push(
      rent
        ? { en: "This token money will be adjusted against the first month's rent / security deposit when the rent agreement is signed.", ur: "یہ ٹوکن رقم کرایہ نامہ تحریر ہونے پر پہلے ماہ کے کرایہ / سیکورٹی میں ایڈجسٹ کی جائے گی۔" }
        : { en: "This advance (bayana) will be adjusted against the total sale price.", ur: "یہ بیعانہ کل قیمت میں ایڈجسٹ کیا جائے گا۔" }
    );
  }
  if (!rent && d.agreedAmount > d.amount) {
    terms.push({
      en: `The remaining balance of ${fig(d.agreedAmount - d.amount)} (${wEn(d.agreedAmount - d.amount)}) shall be paid at the time of registry / transfer.`,
      ur: `بقایا رقم مبلغ ${wUr(d.agreedAmount - d.amount)} (${fig(d.agreedAmount - d.amount)}) رجسٹری / انتقال کے وقت ادا کی جائے گی۔`,
    });
  }
  terms.push({
    en: `The property is reserved for the client until ${until}. The ${rent ? "rent agreement" : "sale agreement"} must be completed within this time on the agreed terms.`,
    ur: `جائیداد ${until} تک کلائنٹ کے لیے محفوظ رہے گی۔ اس مدت میں طے شدہ شرائط پر ${rent ? "کرایہ نامہ" : "سودا"} مکمل کرنا لازمی ہوگا۔`,
  });
  if (t.forfeitIfClientCancels) terms.push({ en: `If the client cancels the deal, the ${tkEn} is not refundable.`, ur: `اگر کلائنٹ سودا منسوخ کرے تو ${tkUr} واپس نہیں ہوگی۔` });
  if (t.refundIfOwnerCancels) {
    terms.push({
      en: `If the owner cancels the deal or the property cannot be handed over, the full ${tkEn} will be returned to the client.`,
      ur: `اگر مالک سودا منسوخ کرے یا جائیداد حوالے نہ کر سکے تو پوری ${tkUr} کلائنٹ کو واپس کی جائے گی۔`,
    });
  }
  if (t.notAgreement) {
    terms.push({
      en: `This receipt is only a proof of the ${tkEn}. It is not a ${rent ? "rent agreement" : "sale agreement"} and does not give possession of the property.`,
      ur: `یہ رسید صرف ${tkUr} کا ثبوت ہے۔ یہ ${rent ? "کرایہ نامہ" : "سودے کی تحریر"} نہیں ہے اور اس سے جائیداد کا قبضہ نہیں ملتا۔`,
    });
  }

  return {
    title: rent ? { en: "TOKEN MONEY RECEIPT", ur: "رسید ٹوکن منی (بیعانہ)" } : { en: "ADVANCE (BAYANA) RECEIPT", ur: "رسید بیعانہ" },
    body: { en: bodyEn, ur: bodyUr },
    terms,
    extra: d.extraTerms
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean),
    signLabels: {
      receiver: { en: `Received by (for ${site.name})`, ur: `وصول کنندہ (برائے ${site.name})` },
      client: { en: "Client", ur: "کلائنٹ" },
    },
  };
}

/** A short message to send the client on WhatsApp as proof of the token (in the receipt's language). */
export function tokenWhatsAppText(d: TokenReceiptData, receiptNo: string): string {
  const c = buildTokenContent(d);
  const url = site.websiteUrl.replace(/^https?:\/\//, "");
  if (d.language === "en") {
    return [
      `Assalam-o-Alaikum ${d.payer.name.trim()},`,
      `This is your ${d.purpose === "rent" ? "token money" : "advance (bayana)"} receipt from ${site.fullName}.`,
      "",
      `Receipt No.: ${receiptNo}`,
      `Date: ${fmtDate(d.receiptDate)}`,
      `${d.purpose === "rent" ? "Token" : "Advance (bayana)"} received: Rs. ${groupLakh(d.amount)}/- (${numberToWordsEn(d.amount)} Rupees Only)`,
      `Property: ${[d.property.description.trim(), d.property.area.trim(), d.property.city.trim()].filter(Boolean).join(", ")}`,
      `Held for you until: ${fmtDate(d.validUntil)}`,
      "",
      ...c.terms.map((t, i) => `${i + 1}. ${t.en}`),
      "",
      `${site.fullName}, ${site.phoneDisplay2}, ${url}`,
    ].join("\n");
  }
  return [
    `السلام علیکم ${pick(d.payer.nameUr, d.payer.name)}،`,
    `یہ ${site.fullName} کی طرف سے آپ کی ${d.purpose === "rent" ? "ٹوکن منی" : "بیعانہ"} کی رسید ہے۔`,
    "",
    `رسید نمبر: ${receiptNo}`,
    `تاریخ: ${fmtDate(d.receiptDate)}`,
    `${d.purpose === "rent" ? "ٹوکن" : "بیعانہ"} وصول: ${numberToWordsUr(d.amount)} روپے (Rs. ${groupLakh(d.amount)}/-)`,
    `جائیداد: ${[pick(d.property.descriptionUr, d.property.description), pick(d.property.areaUr, d.property.area), pick(d.property.cityUr, d.property.city)].filter(Boolean).join("، ")}`,
    `آپ کے لیے محفوظ رہے گی: ${fmtDate(d.validUntil)} تک`,
    "",
    ...c.terms.map((t, i) => `${i + 1}. ${t.ur}`),
    "",
    `${site.fullName}، ${site.phoneDisplay2}، ${url}`,
  ].join("\n");
}
