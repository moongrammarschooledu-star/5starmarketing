import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LetterheadMaker } from "@/components/admin/stationery/LetterheadMaker";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function LetterheadPage() {
  await requireSection("brochures");
  return (
    <div>
      <Link href="/admin/stationery" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Company Letterhead</h1>
      <p className="mt-1 text-sm text-muted">Write the letter on the left; the sheet on the right is exactly what prints. Tick &ldquo;Blank letterhead&rdquo; to print just the header and footer.</p>
      <div className="mt-6">
        <LetterheadMaker />
      </div>
    </div>
  );
}
