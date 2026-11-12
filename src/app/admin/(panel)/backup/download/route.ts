import { NextResponse } from "next/server";
import { profileService } from "@/services/profileService";
import { activityService } from "@/services/activityService";
import { BACKUP_TABLES } from "@/lib/backupTables";
import { fetchAllRows, rowsToCsv } from "@/lib/backupData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /admin/backup/download?table=<id>&format=csv|json   (one table)
// GET /admin/backup/download?table=all                    (everything, one JSON file)
// Only the Super Admin may call this; the signed-in email-code login (when it is
// switched on) is checked by the middleware as for every /admin page.
export async function GET(request: Request) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Only the Super Admin can download backups." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const which = params.get("table") ?? "";
  const format = params.get("format") === "csv" ? "csv" : "json";
  const day = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store" };

  if (which === "all") {
    const tables: Record<string, unknown> = {};
    const problems: Record<string, string> = {};
    for (const t of BACKUP_TABLES) {
      const res = await fetchAllRows(t.table);
      tables[t.id] = res.rows;
      if (res.error) problems[t.id] = res.error;
    }
    await activityService.log("Backup Downloaded", "Full backup (all tables, JSON)", "backup");
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), site: "5starmestate.com", problems, tables }, null, 1);
    return new NextResponse(body, {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="5starm-full-backup-${day}.json"` },
    });
  }

  const def = BACKUP_TABLES.find((t) => t.id === which);
  if (!def) return NextResponse.json({ error: "Unknown table." }, { status: 400 });

  const res = await fetchAllRows(def.table);
  if (res.error && res.rows.length === 0) {
    return NextResponse.json({ error: `Could not read "${def.label}": ${res.error}` }, { status: 502 });
  }
  await activityService.log("Backup Downloaded", `${def.label} (${format.toUpperCase()}, ${res.rows.length} rows)`, "backup");

  const body = format === "csv" ? rowsToCsv(res.rows) : JSON.stringify(res.rows, null, 1);
  return new NextResponse(body, {
    headers: {
      ...headers,
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="5starm-${def.id}-${day}.${format}"`,
    },
  });
}
