import { site } from "@/lib/site";
import { buildAgreementDocx, type DocxSignatory } from "@/lib/agreementDocx";
import { buildAgreementContent } from "./content";
import type { RentAgreementData } from "./types";

/** The rent agreement as an editable Word file. */
export async function rentAgreementDocx(data: RentAgreementData, agreementNo: string, logo?: Buffer): Promise<Buffer> {
  const c = buildAgreementContent(data);
  const lang: "ur" | "en" = data.language === "en" ? "en" : "ur";
  const ur = lang === "ur";
  const pick = (en: string, u: string) => (ur ? u.trim() || en.trim() : en.trim());

  const sig = (en: string, urLabel: string, name: string, nameUr: string, cnic: string, witness: boolean): DocxSignatory => ({
    label: ur ? (witness ? urLabel : "العبد") : en,
    name: pick(name, nameUr),
    role: ur && !witness ? `(${urLabel})` : undefined,
    cnic: witness || !ur ? cnic.trim() || undefined : undefined,
    cnicLabel: ur ? "شناختی کارڈ نمبر:" : "CNIC:",
  });
  const w = data.witnesses;
  const phone = site.phoneDisplay2;
  const web = site.websiteUrl.replace(/^https?:\/\//, "");

  return buildAgreementDocx({
    lang,
    stamp: data.paper === "stamp",
    title: ur ? "اقرار نامہ" : c.title.en,
    titleSmall: ur ? "کرایہ داری" : undefined,
    intro: c.intro.map((p) => p[lang]),
    clauses: c.clauses.map((p) => p[lang]),
    extra: c.extra,
    closing: c.closing[lang],
    names: [pick(data.owner.name, data.owner.nameUr), pick(data.tenant.name, data.tenant.nameUr)].filter(Boolean),
    parties: [sig("Owner", "مالک مذکور", data.owner.name, data.owner.nameUr, data.owner.cnic, false), sig("Tenant", "کرایہ دار", data.tenant.name, data.tenant.nameUr, data.tenant.cnic, false)],
    witnesses: [
      sig("Witness 1", "گواہ شد (1)", w[0]?.name ?? "", w[0]?.nameUr ?? "", w[0]?.cnic ?? "", true),
      sig("Witness 2", "گواہ شد (2)", w[1]?.name ?? "", w[1]?.nameUr ?? "", w[1]?.cnic ?? "", true),
    ],
    letterhead: { name: ur ? site.fullNameUr : site.fullName, lines: [ur ? site.addressUr : site.address, `${phone}  |  ${web}`] },
    footer: ur
      ? `${site.fullNameUr}  |  ${site.addressUr}  |  ${phone}  |  معاہدہ نمبر ${agreementNo}`
      : `${site.fullName}  |  ${site.addressShort}  |  ${phone}  |  ${agreementNo}`,
    logo,
  });
}
