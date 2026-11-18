// The PDF engine orders mixed text (Urdu with numbers / English names) only roughly, so a CNIC
// like 35202-3751523-1 or a house number like 107-A can come out back to front inside an Urdu
// line. Putting an invisible left-to-right mark (U+200E) on both sides of every Latin / number
// run keeps each of them in its natural order.

const LRM = "‎";
// (the class includes the non-breaking space used in "Rs. 50,000/-", so the amount stays one run)
const LATIN_RUN = /[A-Za-z0-9](?:[A-Za-z0-9  .,/\-+&%#:]*[A-Za-z0-9%/-])?/g;

export function ltrRuns(text: string): string {
  return text.replace(LATIN_RUN, (m) => `${LRM}${m}${LRM}`);
}

/** The same idea for the print page (HTML): each Latin / number run becomes a left-to-right
 *  island, and one without spaces (a date, a CNIC, an amount) is never split across two lines. */
export function ltrHtml(text: string, escape: (s: string) => string): string {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(LATIN_RUN)) {
    const at = m.index ?? 0;
    out += escape(text.slice(last, at));
    out += `<span class="ltr${m[0].includes(" ") ? "" : " nw"}">${escape(m[0])}</span>`;
    last = at + m[0].length;
  }
  return out + escape(text.slice(last));
}
