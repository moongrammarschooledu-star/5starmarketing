import type { Metadata } from "next";
import { Download, FileJson, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { requireSection } from "@/lib/guard";
import { BACKUP_GROUPS } from "@/lib/backupTables";
import { countRows } from "@/lib/backupData";

export const metadata: Metadata = { title: "Data Backup" };
export const dynamic = "force-dynamic";

export default async function AdminBackupPage() {
  await requireSection("backup");

  const groups = await Promise.all(
    BACKUP_GROUPS.map(async (g) => ({
      title: g.title,
      tables: await Promise.all(g.tables.map(async (t) => ({ ...t, count: await countRows(t.table) }))),
    })),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Data Backup</h1>
      <p className="mt-1 text-sm text-muted">
        Your database has no automatic backup (the free plan does not include one), so download a copy of your data from here and keep it safe. Do it
        at least once a week, and always before a big change.
      </p>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          These files hold your customers&apos; names, phone numbers and emails. Keep them on your own computer or a private drive, never in a shared
          folder, and never send them to anyone you do not trust. Only the Super Admin can open this page.
        </p>
      </div>

      <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="font-heading text-base font-bold text-ink">Everything in one file</h2>
        <p className="mt-1 text-sm text-muted">All the tables below together, as a single JSON file. This is the one to keep as your backup.</p>
        <a
          href="/admin/backup/download?table=all"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <Download className="h-4 w-4" /> Download full backup (JSON)
        </a>
      </section>

      {groups.map((g) => (
        <section key={g.title} className="mt-6">
          <h2 className="font-heading text-sm font-extrabold uppercase tracking-wide text-ink">{g.title}</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {g.tables.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">
                    {t.label} <span className="font-normal text-muted">({t.count === null ? "cannot read" : `${t.count} rows`})</span>
                  </p>
                  <p className="text-xs text-muted">{t.about}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/admin/backup/download?table=${t.id}&format=csv`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV (Excel)
                  </a>
                  <a
                    href={`/admin/backup/download?table=${t.id}&format=json`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
                  >
                    <FileJson className="h-3.5 w-3.5" /> JSON
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-6 text-xs text-muted">
        To put data back after a loss, the JSON file is what is needed - ask your developer to restore it. Pictures and videos are stored separately
        in Supabase Storage and are not part of these files.
      </p>
    </div>
  );
}
