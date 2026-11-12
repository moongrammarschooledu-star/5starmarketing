import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

const PAGE_SIZE = 1000;
const MAX_ROWS = 50_000;

export type Row = Record<string, unknown>;

/** Every row of a table, read page by page with the signed-in person's own access. */
export async function fetchAllRows(table: string): Promise<{ rows: Row[]; error?: string }> {
  const supabase = await createClient();
  const rows: Row[] = [];
  let ordered = true;
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const base = supabase.from(table).select("*");
    const query = ordered ? base.order("id", { ascending: true }) : base;
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      // a table without an "id" column: read it again without an order
      if (ordered && /column .*id.* does not exist/i.test(error.message)) {
        ordered = false;
        from -= PAGE_SIZE;
        continue;
      }
      return { rows, error: error.message };
    }
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { rows };
}

export async function countRows(table: string): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** CSV with a byte-order mark so Excel shows Urdu names correctly. */
export function rowsToCsv(rows: Row[]): string {
  const headers: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!headers.includes(k)) headers.push(k);
  if (headers.length === 0) return "﻿";
  return "﻿" + toCsv(headers, rows.map((r) => headers.map((h) => cell(r[h]))));
}
