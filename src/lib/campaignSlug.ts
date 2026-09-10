/** Auto-suggested utm_campaign slug from a campaign name — lowercase,
 *  underscored, ascii-only. The admin can still override it. Pure
 *  function (no "server-only" import) so both server code
 *  (campaignService) and the client-side CampaignForm can share it. */
export function slugifyUtmCampaign(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}
