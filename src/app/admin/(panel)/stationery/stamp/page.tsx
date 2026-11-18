import { StationeryShell } from "@/components/admin/stationery/StationeryShell";
import { StampMaker } from "@/components/admin/stationery/StampMaker";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function StampPage() {
  await requireSection("brochures");
  return (
    <StationeryShell title="Company Stamp / Seal Design" help="Artwork for the company rubber stamp (round seal or rectangular). Download the design and give it to the stamp maker.">
      <StampMaker />
    </StationeryShell>
  );
}
