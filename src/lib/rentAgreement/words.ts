// Amounts written in words, the way an agreement needs them (lakh / crore, not million).

const EN_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const EN_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function enBelow100(n: number): string {
  if (n < 20) return EN_ONES[n];
  return EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_ONES[n % 10]}` : "");
}

function enBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${EN_ONES[h]} Hundred` : "", rest ? enBelow100(rest) : ""].filter(Boolean).join(" ");
}

/** 120000 -> "One Lakh Twenty Thousand" */
export function numberToWordsEn(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${enBelow1000(crore)} Crore`);
  if (lakh) parts.push(`${enBelow100(lakh)} Lakh`);
  if (thousand) parts.push(`${enBelow100(thousand)} Thousand`);
  if (n) parts.push(enBelow1000(n));
  return parts.join(" ");
}

// Urdu has its own word for every number up to 99.
const UR_0_99 = [
  "صفر", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو",
  "دس", "گیارہ", "بارہ", "تیرہ", "چودہ", "پندرہ", "سولہ", "سترہ", "اٹھارہ", "انیس",
  "بیس", "اکیس", "بائیس", "تئیس", "چوبیس", "پچیس", "چھبیس", "ستائیس", "اٹھائیس", "انتیس",
  "تیس", "اکتیس", "بتیس", "تینتیس", "چونتیس", "پینتیس", "چھتیس", "سینتیس", "اڑتیس", "انتالیس",
  "چالیس", "اکتالیس", "بیالیس", "تینتالیس", "چوالیس", "پینتالیس", "چھیالیس", "سینتالیس", "اڑتالیس", "انچاس",
  "پچاس", "اکیاون", "باون", "ترپن", "چون", "پچپن", "چھپن", "ستاون", "اٹھاون", "انسٹھ",
  "ساٹھ", "اکسٹھ", "باسٹھ", "تریسٹھ", "چونسٹھ", "پینسٹھ", "چھیاسٹھ", "سڑسٹھ", "اڑسٹھ", "انہتر",
  "ستر", "اکہتر", "بہتر", "تہتر", "چوہتر", "پچھتر", "چھہتر", "ستتر", "اٹھہتر", "اناسی",
  "اسی", "اکیاسی", "بیاسی", "تراسی", "چوراسی", "پچاسی", "چھیاسی", "ستاسی", "اٹھاسی", "نواسی",
  "نوے", "اکیانوے", "بانوے", "ترانوے", "چورانوے", "پچانوے", "چھیانوے", "ستانوے", "اٹھانوے", "ننانوے",
];

function urBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${UR_0_99[h]} سو` : "", rest ? UR_0_99[rest] : ""].filter(Boolean).join(" ");
}

/** 120000 -> "ایک لاکھ بیس ہزار" */
export function numberToWordsUr(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return UR_0_99[0];
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${urBelow1000(crore)} کروڑ`);
  if (lakh) parts.push(`${UR_0_99[lakh]} لاکھ`);
  if (thousand) parts.push(`${UR_0_99[thousand]} ہزار`);
  if (n) parts.push(urBelow1000(n));
  return parts.join(" ");
}

/** 120000 -> "1,20,000" (Pakistani grouping). */
export function groupLakh(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}
