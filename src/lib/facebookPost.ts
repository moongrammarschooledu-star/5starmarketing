import type { BrochureType } from "@/lib/models/brochure";

export type CaptionLang = "en" | "ur" | "roman";

export const captionLangLabels: Record<CaptionLang, string> = {
  en: "English",
  ur: "اردو",
  roman: "Roman Urdu",
};

export interface FacebookPostInput {
  type: BrochureType;
  name: string;
  location: string;
  // property
  propertyType?: string;
  purpose?: string;
  size?: string;
  price?: string;
  features?: string[];
  amenities?: string[];
  // project
  projectStatus?: string;
  availablePropertyTypes?: string[];
  highlights?: string[];
  // shared
  companyName: string;
  phones: string[];
  whatsappUrl: string;
  websiteUrl: string;
}

const UR_PURPOSE: Record<string, string> = {
  "For Sale": "برائے فروخت",
  "For Rent": "برائے کرایہ",
  Investment: "سرمایہ کاری کا بہترین موقع",
};
const ROMAN_PURPOSE: Record<string, string> = {
  "For Sale": "Bikau hai",
  "For Rent": "Kiraye ke liye available hai",
  Investment: "Investment ka behtareen moqa",
};
const UR_TYPE: Record<string, string> = {
  House: "مکان",
  Flat: "فلیٹ",
  "Residential Plot": "رہائشی پلاٹ",
  "Commercial Property": "کمرشل پراپرٹی",
};
const UR_PROJECT_STATUS: Record<string, string> = {
  Upcoming: "جلد آنے والا",
  Ongoing: "زیرِ تعمیر",
  Completed: "مکمل شدہ",
};
const ROMAN_PROJECT_STATUS: Record<string, string> = {
  Upcoming: "Jald aane wala",
  Ongoing: "Zer-e-tameer",
  Completed: "Mukammal",
};

const COMPANY_LINE: Record<CaptionLang, string> = {
  en: "Buying & Selling | Development | Construction | Rental Services",
  ur: "خرید و فروخت | ڈویلپمنٹ | تعمیرات | کرایہ داری کی خدمات",
  roman: "Khareed o farokht | Development | Construction | Rental Services",
};

function clean(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function hashtags(input: FacebookPostInput) {
  const tags = ["#5STARM", "#EstateAndBuilders", "#Lahore", "#RealEstate", "#PropertyInPakistan"];
  if (input.type === "project") {
    tags.push("#NewProject", "#Construction");
  } else {
    if (input.purpose === "For Sale") tags.push("#PropertyForSale");
    if (input.purpose === "For Rent") tags.push("#PropertyForRent");
    if (input.purpose === "Investment") tags.push("#PropertyInvestment");
    const typeTag: Record<string, string> = {
      House: "#House",
      Flat: "#Flat",
      "Residential Plot": "#Plot",
      "Commercial Property": "#CommercialProperty",
    };
    if (input.propertyType && typeTag[input.propertyType]) tags.push(typeTag[input.propertyType]);
  }
  return tags.join(" ");
}

/** Three ready-to-post captions built ONLY from the property/project's own
 *  saved details and the company's own contact info - nothing is invented.
 *  Names, locations and feature text are inserted exactly as the admin
 *  typed them, so they appear in whatever language they were entered in. */
export function buildFacebookCaptions(input: FacebookPostInput): Record<CaptionLang, string> {
  const name = clean(input.name);
  const location = clean(input.location);
  const size = clean(input.size);
  const price = clean(input.price);
  const phones = input.phones.map(clean).filter(Boolean).join(" / ");
  const tags = hashtags(input);

  const highlightList =
    input.type === "project"
      ? (input.highlights ?? [])
      : [...(input.features ?? []), ...(input.amenities ?? [])];
  const seen = new Set<string>();
  const bullets = highlightList
    .map(clean)
    .filter((f) => {
      const k = f.toLowerCase();
      if (!f || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 5);
  const offering = (input.availablePropertyTypes ?? []).map(clean).filter(Boolean).join(", ");

  const build = (lang: CaptionLang) => {
    const L = {
      en: { loc: "Location", size: "Size", demand: "Demand", feat: "Features", offer: "Offering", contact: "Contact", wa: "WhatsApp", more: "Details & photos" },
      ur: { loc: "مقام", size: "سائز", demand: "ڈیمانڈ", feat: "خصوصیات", offer: "دستیاب", contact: "رابطہ کریں", wa: "واٹس ایپ", more: "مکمل تفصیل اور تصاویر" },
      roman: { loc: "Location", size: "Size", demand: "Demand", feat: "Khasusiyat", offer: "Dastiyab", contact: "Rabta karein", wa: "WhatsApp", more: "Poori tafseel aur tasaweer" },
    }[lang];

    let headline: string;
    if (input.type === "project") {
      const status = clean(input.projectStatus);
      headline =
        lang === "ur"
          ? `${UR_PROJECT_STATUS[status] ?? status} منصوبہ`
          : lang === "roman"
            ? `${ROMAN_PROJECT_STATUS[status] ?? status} Project`
            : `${status} Project`;
    } else {
      const purpose = clean(input.purpose);
      const type = clean(input.propertyType);
      const purposeText = lang === "ur" ? UR_PURPOSE[purpose] : lang === "roman" ? ROMAN_PURPOSE[purpose] : purpose;
      const typeText = lang === "ur" ? UR_TYPE[type] ?? type : type;
      headline = [purposeText ?? purpose, typeText].filter(Boolean).join(" - ");
    }

    const lines: string[] = [];
    lines.push(`🏡 ${name}`);
    if (headline.trim()) lines.push(headline);
    if (location) lines.push(`📍 ${L.loc}: ${location}`);
    if (size) lines.push(`📐 ${L.size}: ${size}`);
    if (price) lines.push(`💰 ${L.demand}: ${price}`);
    if (offering) lines.push(`🏘️ ${L.offer}: ${offering}`);
    if (bullets.length > 0) {
      lines.push("", `✅ ${L.feat}:`, ...bullets.map((b) => `• ${b}`));
    }
    lines.push("");
    if (phones) lines.push(`📞 ${L.contact}: ${phones}`);
    if (input.whatsappUrl) lines.push(`💬 ${L.wa}: ${input.whatsappUrl}`);
    if (input.websiteUrl) lines.push(`🌐 ${L.more}: ${input.websiteUrl}`);
    lines.push("", `${input.companyName} - ${COMPANY_LINE[lang]}`, "", tags);
    return lines.join("\n");
  };

  return { en: build("en"), ur: build("ur"), roman: build("roman") };
}
