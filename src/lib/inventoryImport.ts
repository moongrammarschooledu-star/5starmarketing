import { inventoryUnitTypes, inventoryStatuses, inventoryAreaUnits } from "./models/inventory";
import type { InventoryImportRow, InventoryImportValidationResult } from "./models/inventory";
import { parseCsvWithHeader } from "./csvParse";

const REQUIRED_HEADERS = ["Unit Number", "Type"];

/** Parses the raw CSV text into InventoryImportRow[] — tolerant of
 *  either "Area Unit" or "AreaUnit", case-sensitive headers matching
 *  the documented column names (section 25). */
export function parseInventoryImportCsv(text: string): { rows: InventoryImportRow[]; headerError?: string } {
  const { headers, rows } = parseCsvWithHeader(text);
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { rows: [], headerError: `Missing required column(s): ${missing.join(", ")}.` };
  }
  return {
    rows: rows.map((r, i) => ({
      rowNumber: i + 2, // +1 for header row, +1 for 1-indexing
      project: r["Project"] || undefined,
      block: r["Block"] || undefined,
      building: r["Building"] || undefined,
      floor: r["Floor"] || undefined,
      unitNumber: r["Unit Number"] || "",
      unitType: r["Type"] || "",
      area: r["Area"] || undefined,
      areaUnit: r["Area Unit"] || undefined,
      price: r["Price"] || undefined,
      status: r["Status"] || undefined,
    })),
  };
}

/** Validates every row (section 25) — never touches the database.
 *  `projectsByName` maps a project's exact name to its id, so the
 *  preview can resolve "Project" text to a real project_id (or flag it
 *  as invalid if no such project exists — never inventing one).
 *  `existingUnitKeys` is the set of already-taken
 *  "<project/property scope>|<block>|<building>|<unitNumber>" keys
 *  already in the database, for duplicate detection against real data;
 *  in-CSV duplicates are also caught. */
export function validateInventoryImportRows(
  rows: InventoryImportRow[],
  projectsByName: Map<string, string>,
  existingUnitKeys: Set<string>
): InventoryImportValidationResult {
  const valid: InventoryImportValidationResult["valid"] = [];
  const invalid: InventoryImportValidationResult["invalid"] = [];
  const duplicates: InventoryImportValidationResult["duplicates"] = [];
  const seenInBatch = new Set<string>();

  for (const row of rows) {
    const errors: string[] = [];
    let projectId: string | undefined;

    if (!row.unitNumber.trim()) errors.push("Unit Number is required.");
    if (!row.unitType.trim()) errors.push("Type is required.");
    else if (!inventoryUnitTypes.includes(row.unitType as (typeof inventoryUnitTypes)[number])) {
      errors.push(`Type "${row.unitType}" is not one of: ${inventoryUnitTypes.join(", ")}.`);
    }
    if (row.project) {
      projectId = projectsByName.get(row.project.trim().toLowerCase());
      if (!projectId) errors.push(`Project "${row.project}" was not found — create it first or leave blank.`);
    }
    if (row.price) {
      const price = Number(row.price);
      if (!Number.isFinite(price) || price < 0) errors.push("Price must be a non-negative number.");
    }
    if (row.area) {
      const area = Number(row.area);
      if (!Number.isFinite(area) || area < 0) errors.push("Area must be a non-negative number.");
    }
    if (row.areaUnit && !inventoryAreaUnits.includes(row.areaUnit as (typeof inventoryAreaUnits)[number])) {
      errors.push(`Area Unit "${row.areaUnit}" is not one of: ${inventoryAreaUnits.join(", ")}.`);
    }
    if (row.status && !inventoryStatuses.includes(row.status as (typeof inventoryStatuses)[number])) {
      errors.push(`Status "${row.status}" is not one of: ${inventoryStatuses.join(", ")}.`);
    }

    if (errors.length > 0) {
      invalid.push({ row, errors });
      continue;
    }

    const scopeKey = projectId ?? "none";
    const key = `${scopeKey}|${(row.block ?? "").trim()}|${(row.building ?? "").trim()}|${row.unitNumber.trim()}`;
    if (existingUnitKeys.has(key)) {
      duplicates.push({ row, reason: "Already exists in the database." });
      continue;
    }
    if (seenInBatch.has(key)) {
      duplicates.push({ row, reason: "Duplicated within this CSV file." });
      continue;
    }
    seenInBatch.add(key);
    valid.push({ ...row, projectId });
  }

  return { valid, invalid, duplicates };
}
