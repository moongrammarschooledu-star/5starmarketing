import type { Metadata } from "next";
import { redirect } from "next/navigation";

// Public page: built once and kept for a few minutes (and rebuilt at once when
// the admin changes the related data), so visitors do not each run the server.
export const dynamic = "force-static";
export const revalidate = 180;

// Reuses the existing STEP 29 support-KB-backed FAQ at /support/faq
// (section 32 explicitly says not to build a duplicate FAQ system) —
// this just gives it the clean top-level URL the spec's route list asks
// for.
export const metadata: Metadata = {
  title: "FAQ",
  alternates: { canonical: "/support/faq" },
};

export default function FaqRedirectPage(): never {
  redirect("/support/faq");
}
