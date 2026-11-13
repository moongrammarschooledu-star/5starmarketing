import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, ExternalLink, Facebook, Instagram, Globe } from "lucide-react";
import { requireSection } from "@/lib/guard";
import { settingsService } from "@/services/settingsService";
import { socialStatus } from "@/lib/social/meta";
import { SocialConnectionTest } from "@/components/admin/SocialConnectionTest";

export const metadata: Metadata = { title: "Social Accounts" };
export const dynamic = "force-dynamic";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Link Instagram to the Facebook Page",
    body: "In the Instagram app, make the account a Business (or Creator) account, then connect it to the company Facebook Page (Instagram > Settings > Account type and tools > Connect to a Facebook Page).",
  },
  {
    title: "Create a Meta app",
    body: "Open developers.facebook.com, sign in with the Facebook account that manages the Page, choose My Apps > Create App, type Business. Keep the app in Development mode - that is enough for your own Page and Instagram.",
  },
  {
    title: "Get a Page access token",
    body: "Open Tools > Graph API Explorer, pick your app, and generate a User token with these permissions: pages_show_list, pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish. Use Extend Access Token to make it long-lived, then request /me/accounts - the entry for your Page has its id and a Page access token that does not expire.",
  },
  {
    title: "Find the Instagram account id",
    body: "In the Graph API Explorer request /PAGE_ID?fields=instagram_business_account with the Page token. The id inside instagram_business_account is the Instagram account id.",
  },
  {
    title: "Save the three values in Vercel",
    body: "Vercel > your project > Settings > Environment Variables: add FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN (mark it Sensitive) and INSTAGRAM_BUSINESS_ACCOUNT_ID, then redeploy. Come back here and press Test connection.",
  },
];

export default async function AdminSocialAccountsPage() {
  await requireSection("marketing");
  const status = socialStatus();

  let links: { label: string; url: string }[] = [];
  try {
    const s = await settingsService.get();
    links = [
      { label: "Facebook", url: s.facebookUrl },
      { label: "Instagram", url: s.instagramUrl },
      { label: "TikTok", url: s.tiktokUrl },
      { label: "YouTube", url: s.youtubeUrl },
    ];
  } catch {
    links = [];
  }

  const cards = [
    { name: "Facebook Page", icon: Facebook, connected: status.facebook, what: "Posts the brochure picture and caption on your Page." },
    { name: "Instagram", icon: Instagram, connected: status.instagram, what: "Posts the brochure picture and caption on your Instagram business account." },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Social Accounts</h1>
      <p className="mt-1 text-sm text-muted">
        Connect your Facebook Page and Instagram so a property brochure can be posted from the website in one click (open any brochure and use the Social Media Post
        box).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.name} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
                <c.icon className="h-4.5 w-4.5 text-primary" /> {c.name}
              </span>
              {c.connected ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
                  <XCircle className="h-3.5 w-3.5" /> Not connected
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">{c.what}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <SocialConnectionTest anyConnected={status.facebook || status.instagram} />
      </div>

      <section className="mt-8">
        <h2 className="font-heading text-base font-extrabold text-ink">How to connect (one time)</h2>
        <p className="mt-1 text-xs text-muted">Meta asks for a login and permissions that only the Page owner can give, so these steps are done by you, not by the website.</p>
        <ol className="mt-4 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <div>
                <p className="text-sm font-bold text-ink">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-base font-extrabold text-ink">Profile links on the website</h2>
        <p className="mt-1 text-xs text-muted">The footer shows icons for the links you add here.</p>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {links.map((l) => (
            <li key={l.label} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-semibold text-ink">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" /> {l.label}
              </span>
              {l.url ? (
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  {l.url.replace(/^https?:\/\//, "").slice(0, 48)} <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs text-muted">Not added yet</span>
              )}
            </li>
          ))}
        </ul>
        <Link href="/admin/settings" className="mt-3 inline-flex rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          Add or change links in Settings
        </Link>
      </section>
    </div>
  );
}
