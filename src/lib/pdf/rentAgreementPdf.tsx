import { renderToBuffer } from "@react-pdf/renderer";
import { RentAgreementDocument } from "./RentAgreementDocument";
import type { RentAgreementData } from "@/lib/rentAgreement/types";

/** The agreement as PDF bytes (used for English agreements; Urdu ones are printed from the print page). */
export async function renderRentAgreementPdf(data: RentAgreementData, agreementNo?: string): Promise<Buffer> {
  const printedOn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
  return renderToBuffer(<RentAgreementDocument data={data} agreementNo={agreementNo} printedOn={printedOn} />);
}
