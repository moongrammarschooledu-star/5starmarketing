import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
