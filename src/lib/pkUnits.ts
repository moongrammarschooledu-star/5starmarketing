// Reads and writes the way property prices and plot sizes are written in
// Pakistan ("3 Crore 65 Lac", "10.5 Crore", "8 Marla", "1 Kanal 5 Marla") so
// they can be compared as numbers. Pure functions - used on the server (to
// match demands with properties) and in the browser (live previews).

/** 1 Marla = 225 square feet, 1 Kanal = 20 Marla (the company's own rule). */
export const SQFT_PER_MARLA = 225;
export const MARLA_PER_KANAL = 20;
const SQFT_PER_SQ_YARD = 9;

const PRICE_UNITS: Record<string, number> = {
  arab: 1e9,
  billion: 1e9,
  crore: 1e7,
  crores: 1e7,
  cr: 1e7,
  karor: 1e7,
  lac: 1e5,
  lacs: 1e5,
  lakh: 1e5,
  lakhs: 1e5,
  lak: 1e5,
  million: 1e6,
  mil: 1e6,
  thousand: 1e3,
  hazar: 1e3,
  k: 1e3,
};

const PRICE_PATTERN = /(\d+(?:\.\d+)?)\s*(arab|billion|crores?|karor|cr|lacs?|lakhs?|lak|million|mil|thousand|hazar|k)?(?![a-z])/g;

/** "3 Crore 65 Lac" -> 36500000, "50k" -> 50000, "5000000" -> 5000000.
 *  Returns null when nothing readable is found. */
export function parsePriceText(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.toLowerCase().replace(/,/g, "").replace(/\b(rs|pkr)\b\.?/g, " ");
  let withUnits = 0;
  let sawUnit = false;
  let firstBare: number | null = null;
  for (const m of text.matchAll(PRICE_PATTERN)) {
    const n = Number(m[1]);
    if (!Number.isFinite(n)) continue;
    const unit = m[2];
    if (unit) {
      withUnits += n * PRICE_UNITS[unit];
      sawUnit = true;
    } else if (firstBare === null) {
      firstBare = n;
    }
  }
  const total = sawUnit ? withUnits : firstBare ?? 0;
  return total > 0 ? Math.round(total) : null;
}

/** 36500000 -> "3.65 Crore", 9000000 -> "90 Lac", 45000 -> "Rs 45,000". */
export function formatPrice(value: number): string {
  const trim = (n: number) => String(Math.round(n * 100) / 100);
  if (value >= 1e7) return `${trim(value / 1e7)} Crore`;
  if (value >= 1e5) return `${trim(value / 1e5)} Lac`;
  return `Rs ${Math.round(value).toLocaleString("en-US")}`;
}

const ACRE_MARLA = 160; // 1 acre = 8 Kanal

const SIZE_PATTERN =
  /(\d+(?:\.\d+)?)\s*(kanals?|kanaal|kalans?|knl|acres?|marlas?|marly|sq\.?\s*ft\.?|sqft|sft|square\s*f(?:ee|oo)t|sq\.?\s*(?:yards?|yd)|yards?|gaz)(?![a-z])/g;

/** "50' by 90'", "30x60", "8.5 x 30 ft" - a width times a length, in feet. */
const DIMENSIONS_PATTERN = /(\d+(?:\.\d+)?)\s*(?:'|ft\.?|feet)?\s*(?:x|by|\*|×)\s*(\d+(?:\.\d+)?)/;

/** "8 Marla" -> 8, "1 Kanal 5 Marla" -> 25, "1800 sq ft" -> 8, "30x60" -> 8.
 *  Returns null when no area is found (a bare frontage like "35 feet" is
 *  not an area, so it is deliberately not guessed at). */
export function parseSizeToMarla(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.toLowerCase().replace(/,/g, "");
  let marla = 0;
  let found = false;
  for (const m of text.matchAll(SIZE_PATTERN)) {
    const n = Number(m[1]);
    if (!Number.isFinite(n)) continue;
    const unit = m[2];
    if (unit.startsWith("kan") || unit.startsWith("kal") || unit === "knl") marla += n * MARLA_PER_KANAL;
    else if (unit.startsWith("acre")) marla += n * ACRE_MARLA;
    else if (unit.startsWith("marl")) marla += n;
    else if (/^sq\.?\s*(yards?|yd)$/.test(unit) || unit.startsWith("yard") || unit === "gaz") marla += (n * SQFT_PER_SQ_YARD) / SQFT_PER_MARLA;
    else marla += n / SQFT_PER_MARLA;
    found = true;
  }
  if (!found) {
    const d = DIMENSIONS_PATTERN.exec(text);
    if (d) {
      marla = (Number(d[1]) * Number(d[2])) / SQFT_PER_MARLA;
      found = true;
    }
  }
  return found && marla > 0 ? Math.round(marla * 100) / 100 : null;
}

/** 8 -> "8 Marla", 20 -> "1 Kanal", 25 -> "1 Kanal 5 Marla". */
export function formatMarla(marla: number): string {
  const trim = (n: number) => String(Math.round(n * 100) / 100);
  if (marla < MARLA_PER_KANAL) return `${trim(marla)} Marla`;
  const kanal = Math.floor(marla / MARLA_PER_KANAL);
  const rest = Math.round((marla - kanal * MARLA_PER_KANAL) * 100) / 100;
  return rest > 0 ? `${kanal} Kanal ${trim(rest)} Marla` : `${kanal} Kanal`;
}
