import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/PrintButton";
import { ElevationSvg } from "@/components/house/ElevationSvg";
import { PlanSvg } from "@/components/house/PlanSvg";
import { requireSection } from "@/lib/guard";
import { buildSchedule } from "@/lib/house/geometry";
import { VIEW_LABELS } from "@/lib/house/elevation";
import { site } from "@/lib/site";
import { houseDesignService } from "@/services/houseDesignService";
import type { ViewName } from "@/lib/house/types";

export const dynamic = "force-dynamic";

// Outside the /admin/(panel) layout on purpose (a clean printable sheet with
// no sidebar). Internal drawings: never indexable.
export const metadata: Metadata = { title: "House Plan", robots: { index: false, follow: false } };

const VIEWS: ViewName[] = ["front", "back", "left", "right"];

function today() {
  return new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric" });
}

export default async function HousePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("construction");
  const { id } = await params;
  const design = await houseDesignService.getById(id);
  if (!design) notFound();
  const { data } = design;
  const schedule = buildSchedule(data);

  return (
    <div className="mx-auto max-w-4xl bg-white px-6 py-8 text-black print:max-w-none print:px-0 print:py-0">
      <style>{`@page { size: A4 portrait; margin: 10mm; } @media print { .no-print { display: none !important; } body { background: white; } .sheet { break-after: page; } .sheet:last-child { break-after: auto; } }`}</style>

      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>

      {data.floors.map((floor, i) => (
        <section key={floor.id} className="sheet mb-8">
          <Header title={design.name} subtitle={`${floor.name} plan`} client={design.clientName} />
          <PlanSvg design={data} floor={floor} className="mx-auto mt-3 block h-auto w-full max-w-[640px] border border-black/20" />
          <p className="mt-2 text-center text-[11px] text-black/60">
            Plot {data.plot.width}&apos; x {data.plot.length}&apos; ({schedule.plotMarla} Marla) - Covered area on this floor: {schedule.floorAreas[i]?.covered} sq ft
          </p>
        </section>
      ))}

      <section className="sheet mb-8">
        <Header title={design.name} subtitle="Elevations" client={design.clientName} />
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VIEWS.map((v) => (
            <div key={v} className="rounded border border-black/15 p-1">
              <ElevationSvg design={data} view={v} className="block h-auto w-full" />
              <p className="sr-only">{VIEW_LABELS[v]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sheet">
        <Header title={design.name} subtitle="Room list and areas" client={design.clientName} />
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black/70 text-left text-xs uppercase text-black/60">
              <th className="py-1.5">Floor</th>
              <th className="py-1.5">Room</th>
              <th className="py-1.5">Type</th>
              <th className="py-1.5">Size</th>
              <th className="py-1.5 text-right">Area (sq ft)</th>
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((r, i) => (
              <tr key={i} className="border-b border-black/10">
                <td className="py-1.5 text-black/60">{r.floor}</td>
                <td className="py-1.5 font-semibold">{r.name}</td>
                <td className="py-1.5 text-black/70">{r.typeLabel}</td>
                <td className="py-1.5">
                  {r.w}&apos; x {r.h}&apos;
                </td>
                <td className="py-1.5 text-right">{r.area}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:max-w-md">
          <dt className="text-black/60">Plot area</dt>
          <dd className="text-right font-semibold">
            {schedule.plotArea} sq ft ({schedule.plotMarla} Marla)
          </dd>
          {schedule.floorAreas.map((f) => (
            <FloorLine key={f.name} name={f.name} covered={f.covered} />
          ))}
          <dt className="text-black/60">Total covered area</dt>
          <dd className="text-right font-semibold">{schedule.totalCovered} sq ft</dd>
          <dt className="text-black/60">Ground floor coverage</dt>
          <dd className="text-right font-semibold">{schedule.groundCoveragePct}% of plot</dd>
        </dl>
        {design.notes && (
          <div className="mt-5">
            <h3 className="text-sm font-bold">Notes</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-black/80">{design.notes}</p>
          </div>
        )}
        <p className="mt-8 text-[11px] text-black/40">
          Drawing prepared with the 5STAR.M House Designer on {today()}. Dimensions are in feet and are for planning; the structural and municipal drawings must be checked by the engineer before construction.
        </p>
      </section>
    </div>
  );
}

function Header({ title, subtitle, client }: { title: string; subtitle: string; client?: string }) {
  return (
    <div className="flex items-start justify-between border-b-2 border-black/80 pb-2">
      <div>
        <div className="text-base font-extrabold">{title}</div>
        <div className="text-xs text-black/70">
          {subtitle}
          {client ? ` - Client: ${client}` : ""}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-extrabold">{site.fullName}</div>
        <div className="text-[10px] text-black/60">{site.address}</div>
      </div>
    </div>
  );
}

function FloorLine({ name, covered }: { name: string; covered: number }) {
  return (
    <>
      <dt className="text-black/60">{name} (covered)</dt>
      <dd className="text-right font-semibold">{covered} sq ft</dd>
    </>
  );
}
