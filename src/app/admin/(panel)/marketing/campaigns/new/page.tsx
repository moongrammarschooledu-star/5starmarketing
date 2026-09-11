import { redirect } from "next/navigation";

// The spec names this route "/admin/marketing/campaigns/new"; this
// codebase's existing STEP 15 campaign-creation page is already linked
// throughout the app as "/admin/marketing/campaigns/create" — redirecting
// here rather than duplicating that page or renaming the existing route
// (which would break any existing links to it).
export default function NewCampaignRedirect() {
  redirect("/admin/marketing/campaigns/create");
}
