import { site } from "@/lib/site";
import { fmtDate, partyEn, partyUr, pick } from "@/lib/rentAgreement/content";
import { groupLakh, numberToWordsEn, numberToWordsUr } from "@/lib/rentAgreement/words";
import type { SaleAgreementData, SaleKind } from "./types";

// The wording of the sale agreement (agreement to sell / bayana) in English and in Urdu.
// The Urdu follows the usual "Iqrar nama bai" wording; the parties are the first party
// (seller) and the second party (buyer).

interface Para {
  en: string;
  ur: string;
}

export interface SaleContent {
  title: Para;
  intro: Para[];
  clauses: Para[];
  extra: string[];
  closing: Para;
}

const NOUN_EN: Record<SaleKind, string> = { House: "house", Plot: "plot", Flat: "flat", Shop: "shop", Commercial: "commercial property", Other: "property" };
const NOUN_UR: Record<SaleKind, string> = { House: "مکان", Plot: "پلاٹ", Flat: "فلیٹ", Shop: "دکان", Commercial: "کمرشل جائیداد", Other: "جائیداد" };

export function buildSaleContent(d: SaleAgreementData): SaleContent {
  // A non-breaking space keeps "Rs." and the amount on the same line.
  const fig = (n: number) => `Rs. ${groupLakh(n)}/-`;
  const wEn = (n: number) => `${numberToWordsEn(n)} Rupees Only`;
  const wUr = (n: number) => `${numberToWordsUr(n)} روپے`;
  const p = d.property;
  const o = d.options;
  const balance = Math.max(0, d.totalPrice - d.advancePaid);
  const due = fmtDate(d.balanceDueDate);
  const date = fmtDate(d.agreementDate);

  const whereEn = [p.area.trim(), p.city.trim()].filter(Boolean).join(", ");
  const whereUr = [pick(p.areaUr, p.area), pick(p.cityUr, p.city)].filter(Boolean).join(" ");
  const premisesEn = [p.description.trim(), whereEn, p.size.trim() ? `area ${p.size.trim()}` : ""].filter(Boolean).join(", ");
  const premisesUr = [pick(p.descriptionUr, p.description), whereUr ? `واقع ${whereUr}` : "", pick(p.sizeUr, p.size) ? `رقبہ ${pick(p.sizeUr, p.size)}` : ""].filter(Boolean).join(" ");
  const titleEn = p.titleDetails.trim();
  const titleUr = pick(p.titleDetailsUr, p.titleDetails);
  const placeEn = d.place.trim() || "Lahore";
  const placeUr = d.placeUr.trim() || (/^lahore$/i.test(d.place.trim()) || !d.place.trim() ? "لاہور" : d.place.trim());
  const cityEn = p.city.trim() || placeEn;
  const cityUr = pick(p.cityUr, p.city) || placeUr;

  const clauses: Para[] = [];

  clauses.push({
    en: `The total price of the property has been settled at ${fig(d.totalPrice)} (${wEn(d.totalPrice)}).`,
    ur: `یہ کہ مذکورہ جائیداد کی کل قیمت مبلغ ${wUr(d.totalPrice)} (${fig(d.totalPrice)}) طے پائی ہے۔`,
  });

  if (d.advancePaid > 0) {
    const adv = d.advanceDate ? fmtDate(d.advanceDate) : "";
    clauses.push({
      en: `The Buyer has paid ${fig(d.advancePaid)} (${wEn(d.advancePaid)}) to the Seller as advance (bayana)${adv ? ` on ${adv}` : ""}${d.advanceReceiptNo.trim() ? ` (Receipt No. ${d.advanceReceiptNo.trim()})` : ""}, which the Seller acknowledges. The remaining balance of ${fig(balance)} (${wEn(balance)}) shall be paid by the Buyer at the time of registry / transfer, on or before ${due}.`,
      ur: `یہ کہ فریقِ دوم نے مبلغ ${wUr(d.advancePaid)} (${fig(d.advancePaid)}) بطور بیعانہ${adv ? ` مورخہ ${adv}` : ""}${d.advanceReceiptNo.trim() ? ` (رسید نمبر ${d.advanceReceiptNo.trim()})` : ""} فریقِ اول کو ادا کر دی ہے جس کی وصولی فریقِ اول تسلیم کرتا ہے۔ بقایا رقم مبلغ ${wUr(balance)} (${fig(balance)}) فریقِ دوم رجسٹری / انتقال کے وقت، مورخہ ${due} تک ادا کرے گا۔`,
    });
  } else {
    clauses.push({
      en: `The full price of ${fig(d.totalPrice)} shall be paid by the Buyer at the time of registry / transfer, on or before ${due}.`,
      ur: `یہ کہ پوری قیمت مبلغ ${fig(d.totalPrice)} فریقِ دوم رجسٹری / انتقال کے وقت، مورخہ ${due} تک ادا کرے گا۔`,
    });
  }

  clauses.push({
    en: `The Seller shall get the property registered / transferred in the name of the Buyer before the Sub-Registrar on or before ${due}, and shall attend and sign all documents needed for it.`,
    ur: `یہ کہ فریقِ اول مورخہ ${due} تک سب رجسٹرار کے روبرو جائیداد فریقِ دوم کے نام رجسٹری / انتقال کروانے اور اس کے لیے درکار تمام دستاویزات پر حاضر ہو کر دستخط کرنے کا پابند ہوگا۔`,
  });

  clauses.push(
    d.transferCostsBy === "buyer"
      ? { en: "All costs of registry and transfer (stamp duty, registration fee, taxes etc.) shall be paid by the Buyer.", ur: "یہ کہ رجسٹری و انتقال کے تمام اخراجات (اسٹامپ ڈیوٹی، رجسٹریشن فیس، ٹیکس وغیرہ) فریقِ دوم ادا کرے گا۔" }
      : d.transferCostsBy === "seller"
        ? { en: "All costs of registry and transfer (stamp duty, registration fee, taxes etc.) shall be paid by the Seller.", ur: "یہ کہ رجسٹری و انتقال کے تمام اخراجات (اسٹامپ ڈیوٹی، رجسٹریشن فیس، ٹیکس وغیرہ) فریقِ اول ادا کرے گا۔" }
        : { en: "The costs of registry and transfer (stamp duty, registration fee, taxes etc.) shall be shared equally by the Seller and the Buyer.", ur: "یہ کہ رجسٹری و انتقال کے اخراجات (اسٹامپ ڈیوٹی، رجسٹریشن فیس، ٹیکس وغیرہ) فریقِ اول اور فریقِ دوم برابر برابر ادا کریں گے۔" }
  );

  clauses.push(
    d.possessionDate
      ? {
          en: `The Seller shall hand over possession of the property to the Buyer, vacant and in peaceful condition, on ${fmtDate(d.possessionDate)}.`,
          ur: `یہ کہ فریقِ اول جائیداد کا قبضہ مورخہ ${fmtDate(d.possessionDate)} کو خالی اور پرامن حالت میں فریقِ دوم کے حوالے کرے گا۔`,
        }
      : {
          en: "The Seller shall hand over possession of the property to the Buyer, vacant and in peaceful condition, at the time of registry and full payment.",
          ur: "یہ کہ فریقِ اول جائیداد کا قبضہ رجسٹری اور مکمل ادائیگی کے وقت خالی اور پرامن حالت میں فریقِ دوم کے حوالے کرے گا۔",
        }
  );

  if (o.clearTitle) {
    clauses.push({
      en: "The Seller declares that he is the sole owner of the property and that it is free from any mortgage, litigation, loan, illegal possession or claim of any third party. If any such claim appears later, the Seller shall be responsible for it.",
      ur: "یہ کہ فریقِ اول اقرار کرتا ہے کہ وہ جائیداد کا واحد مالک ہے اور جائیداد کسی رہن، مقدمے، قرض، ناجائز قبضے یا کسی تیسرے فریق کے دعوے سے پاک ہے۔ بعد ازاں کسی بھی دعوے کی صورت میں فریقِ اول خود ذمہ دار ہوگا۔",
    });
  }
  if (o.duesCleared) {
    clauses.push({
      en: "All bills, taxes, society charges and other dues of the property up to the date of possession shall be paid by the Seller.",
      ur: "یہ کہ قبضہ دینے کی تاریخ تک جائیداد کے تمام بل، ٹیکس، سوسائٹی چارجز اور دیگر واجبات فریقِ اول ادا کرے گا۔",
    });
  }
  if (o.noThirdParty) {
    clauses.push({
      en: "Until this deal is completed, the Seller shall not sell, mortgage, lease or transfer the property to anyone else, and shall not make any other deal about it.",
      ur: "یہ کہ جب تک یہ سودا مکمل نہیں ہو جاتا فریقِ اول جائیداد کسی اور کو فروخت، رہن، کرایہ یا منتقل نہیں کرے گا اور نہ ہی اس کا کوئی اور سودا کرے گا۔",
    });
  }
  if (o.buyerDefaultForfeit) {
    clauses.push({
      en: `If the Buyer fails to pay the balance by ${due}, the Seller may cancel this deal${d.advancePaid > 0 ? " and the advance paid shall be forfeited" : ""}.`,
      ur: `یہ کہ اگر فریقِ دوم مقررہ تاریخ ${due} تک بقایا رقم ادا نہ کرے تو فریقِ اول سودا منسوخ کر سکتا ہے${d.advancePaid > 0 ? " اور ادا شدہ بیعانہ ضبط ہو جائے گا" : ""}۔`,
    });
  }
  if (o.sellerDefaultDouble && d.advancePaid > 0) {
    clauses.push({
      en: `If the Seller fails to get the registry done by ${due} or breaks this agreement, the Seller shall return double the advance, that is ${fig(d.advancePaid * 2)} (${wEn(d.advancePaid * 2)}), to the Buyer.`,
      ur: `یہ کہ اگر فریقِ اول مقررہ تاریخ ${due} تک رجسٹری نہ کروائے یا اس معاہدے کی خلاف ورزی کرے تو وہ فریقِ دوم کو بیعانہ کی رقم دگنی، یعنی مبلغ ${wUr(d.advancePaid * 2)} (${fig(d.advancePaid * 2)}) واپس کرنے کا پابند ہوگا۔`,
    });
  }
  if (o.documentsHandover) {
    clauses.push({
      en: "At the time of registry the Seller shall hand over to the Buyer all the original papers of the property (fard, registry / allotment letter etc.).",
      ur: "یہ کہ رجسٹری کے وقت فریقِ اول جائیداد کے تمام اصل کاغذات (فرد، رجسٹری / الاٹمنٹ لیٹر وغیرہ) فریقِ دوم کے حوالے کرے گا۔",
    });
  }
  if (d.commissionPercent > 0) {
    const amount = Math.round((d.totalPrice * d.commissionPercent) / 100);
    const by = d.commissionBy;
    clauses.push({
      en: `A commission of ${d.commissionPercent}% (${fig(amount)}) is payable to ${site.fullName} (the dealer) on completion of this deal, ${by === "buyer" ? "by the Buyer" : by === "seller" ? "by the Seller" : "by each of the Seller and the Buyer"}.`,
      ur: `یہ کہ اس سودے کا کمیشن ${d.commissionPercent}% (مبلغ ${fig(amount)}) سودا مکمل ہونے پر ${by === "buyer" ? "فریقِ دوم" : by === "seller" ? "فریقِ اول" : "فریقِ اول اور فریقِ دوم میں سے ہر ایک"} ${site.fullName} کو ادا کرے گا۔`,
    });
  }
  if (o.courtsClause) {
    clauses.push({
      en: `This agreement is governed by the laws of Pakistan. In case of any dispute, the courts of ${cityEn} shall have jurisdiction.`,
      ur: `یہ کہ اس اقرار نامے سے متعلق کسی تنازعے کی صورت میں پاکستان کے قانون کے مطابق ${cityUr} کی عدالتوں کو اختیارِ سماعت حاصل ہوگا۔`,
    });
  }

  const noun = NOUN_EN[p.kind];
  return {
    title: { en: "AGREEMENT TO SELL", ur: "اقرار نامہ بیع (بیعانہ)" },
    intro: [
      { en: `This Agreement to Sell is made on ${date} at ${placeEn}.`, ur: `مقام ${placeUr}، تاریخ ${date}` },
      { en: `BETWEEN: ${partyEn(d.seller)} (hereinafter called the "Seller" - First Party).`, ur: `فریقِ اول (فروخت کنندہ): ${partyUr(d.seller)}` },
      { en: `AND: ${partyEn(d.buyer)} (hereinafter called the "Buyer" - Second Party).`, ur: `فریقِ دوم (خریدار): ${partyUr(d.buyer)}` },
      {
        en: `The Seller is the owner of the ${noun}: ${premisesEn}${titleEn ? ` (ownership papers: ${titleEn})` : ""}, and has agreed to sell it to the Buyer for a total price of ${fig(d.totalPrice)} (${wEn(d.totalPrice)}), and the Buyer has agreed to buy it. Both parties, of free will and in sound mind, agree to the following terms:`,
        ur: `چونکہ فریقِ اول ${NOUN_UR[p.kind]} ${premisesUr}${titleUr ? ` (ملکیتی کاغذات: ${titleUr})` : ""} کا مالک ہے اور اسے فریقِ دوم کے ہاتھ کل مبلغ ${wUr(d.totalPrice)} (${fig(d.totalPrice)}) میں فروخت کرنے پر رضامند ہے اور فریقِ دوم خریدنے پر رضامند ہے۔ لہذا فریقین بغیر جبر و اکراہ و بحالت ہوش و حواس خمسہ درج ذیل شرائط پر متفق ہیں:`,
      },
    ],
    clauses,
    extra: d.extraTerms
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean),
    closing: {
      en: `This agreement has been written by both parties on ${date} so that it may serve as proof and be used whenever required.`,
      ur: `لہذا یہ اقرار نامہ فریقین نے بغیر جبر و اکراہ و بقائمی ہوش و حواس تحریر کر دیا ہے تاکہ سند رہے اور بوقت ضرورت کام آوے۔ المرقوم مورخہ ${date}`,
    },
  };
}
