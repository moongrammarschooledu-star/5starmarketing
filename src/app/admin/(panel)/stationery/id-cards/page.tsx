import { StationeryShell } from "@/components/admin/stationery/StationeryShell";
import { IdCardMaker } from "@/components/admin/stationery/IdCardMaker";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function IdCardsPage() {
  await requireSection("brochures");
  return (
    <StationeryShell title="Staff ID Cards" help="Identity cards for the team: name, designation, ID number, photo and the company details. Eight per A4 sheet, front and back.">
      <IdCardMaker />
    </StationeryShell>
  );
}
