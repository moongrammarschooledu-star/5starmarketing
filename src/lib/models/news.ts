// The public news bar: news typed in by the team, plus the clients' demands
// (type, size, area and budget only - never a name or phone number).

export const NEWS_MIN = 3;
export const NEWS_MAX = 220;

export interface SiteNews {
  id: string;
  message: string;
  linkUrl?: string;
  isActive: boolean;
  /** ISO timestamp; the news stops showing after it. */
  expiresAt?: string;
  createdAt: string;
}

export interface SiteNewsInput {
  message: string;
  linkUrl?: string;
  isActive: boolean;
  expiresAt?: string;
}

/** One entry scrolling in the bar. */
export interface TickerItem {
  id: string;
  kind: "news" | "demand";
  text: string;
  href?: string;
}

/** The columns of the `public_demand_board` view - nothing identifying. */
export interface PublicDemandRow {
  purpose: "sale" | "rent";
  property_types: string[] | null;
  locations: string[] | null;
  budget_min: number | string | null;
  budget_max: number | string | null;
  size_min_marla: number | string | null;
  size_max_marla: number | string | null;
  min_bedrooms: number | null;
  created_at: string;
}
