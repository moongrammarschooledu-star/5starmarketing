import "server-only";
import { unstable_cache } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { publicDemandLine } from "@/lib/tickerText";
import type { PublicDemandRow, SiteNews, SiteNewsInput, TickerItem } from "@/lib/models/news";

export const TICKER_TAG = "site-ticker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SiteNews {
  return {
    id: row.id,
    message: row.message,
    linkUrl: row.link_url ?? undefined,
    isActive: row.is_active,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** A plain anonymous client with no cookies - exactly what a visitor is - so
 *  the result can be cached and shared between visitors. */
function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return createAnonClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** The demand lines the public sees - read through the safe view only. */
async function loadDemandItems(): Promise<TickerItem[]> {
  const { data, error } = await anonClient().from("public_demand_board").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as PublicDemandRow[]).map((row, i) => ({
    id: `demand-${i}-${row.created_at}`,
    kind: "demand" as const,
    text: publicDemandLine(row),
    href: "/#contact",
  }));
}

async function loadNewsItems(): Promise<TickerItem[]> {
  // The row-level policy already hides inactive and expired news from visitors.
  const { data, error } = await anonClient().from("site_news").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const n = mapRow(row);
    return { id: `news-${n.id}`, kind: "news" as const, text: n.message, href: n.linkUrl };
  });
}

// Every page view asks for this, so it is cached for a few minutes and
// refreshed straight away whenever the team changes news or a demand.
const loadTickerItems = unstable_cache(
  async (): Promise<TickerItem[]> => {
    const [news, demands] = await Promise.all([loadNewsItems(), loadDemandItems()]);
    return [...news, ...demands];
  },
  ["site-ticker-items"],
  { revalidate: 300, tags: [TICKER_TAG] }
);

export const siteNewsService = {
  /** Everything the public bar shows: news first, then the waiting demands.
   *  Never throws - the website must load even if this fails. */
  async getTickerItems(): Promise<TickerItem[]> {
    try {
      return await loadTickerItems();
    } catch (e) {
      console.error("siteNewsService.getTickerItems failed:", e);
      return [];
    }
  },

  /** The demand lines as visitors see them right now (not cached) - for the
   *  admin page, so the team can check exactly what is public. */
  async listPublicDemandItems(): Promise<TickerItem[]> {
    try {
      return await loadDemandItems();
    } catch (e) {
      console.error("siteNewsService.listPublicDemandItems failed:", e);
      return [];
    }
  },

  async listAll(): Promise<SiteNews[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_news").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("siteNewsService.listAll failed:", error);
      throw new Error("Could not load the news.");
    }
    return (data ?? []).map(mapRow);
  },

  async create(input: SiteNewsInput, createdBy?: string): Promise<SiteNews> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_news")
      .insert({
        message: input.message,
        link_url: input.linkUrl ?? null,
        is_active: input.isActive,
        expires_at: input.expiresAt ?? null,
        created_by: createdBy ?? null,
      })
      .select("*")
      .single();
    if (error || !data) {
      console.error("siteNewsService.create failed:", error);
      throw new Error("Could not save this news. Please try again.");
    }
    return mapRow(data);
  },

  async update(id: string, input: SiteNewsInput): Promise<SiteNews | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_news")
      .update({
        message: input.message,
        link_url: input.linkUrl ?? null,
        is_active: input.isActive,
        expires_at: input.expiresAt ?? null,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("siteNewsService.update failed:", error);
      throw new Error("Could not update this news. Please try again.");
    }
    return data ? mapRow(data) : undefined;
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("site_news").update({ is_active: isActive }).eq("id", id);
    if (error) {
      console.error("siteNewsService.setActive failed:", error);
      throw new Error("Could not change this news.");
    }
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("site_news").delete().eq("id", id);
    if (error) {
      console.error("siteNewsService.remove failed:", error);
      throw new Error("Could not delete this news.");
    }
  },
};
