/** Minimal, dependency-free RFC 4180 CSV parser — the read-side
 *  counterpart to toCsv() (STEP 15). Handles quoted fields, escaped
 *  quotes ("") and commas/newlines inside quotes. Used only for
 *  authenticated admin bulk-import previews. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Parses a CSV with a header row into an array of objects keyed by
 *  the (trimmed, lowercased-nothing — kept as-is) header names. */
export function parseCsvWithHeader(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { headers: [], rows: [] };
  const [headerRow, ...dataRows] = table;
  const headers = headerRow.map((h) => h.trim());
  const rows = dataRows.map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}
