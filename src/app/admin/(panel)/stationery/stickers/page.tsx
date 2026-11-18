import { StationeryShell } from "@/components/admin/stationery/StationeryShell";
import { StickerMaker } from "@/components/admin/stationery/StickerMaker";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function StickersPage() {
  await requireSection("brochures");
  return (
    <StationeryShell title="Company Stickers" help="Round logo stickers, address labels, and For Sale / For Rent stickers. A whole A4 sheet is filled; print on sticker paper and cut.">
      <StickerMaker />
    </StationeryShell>
  );
}
