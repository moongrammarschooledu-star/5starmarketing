import "server-only";

// Direct posting to the company's Facebook Page and Instagram business account
// through Meta's Graph API. Nothing here is used until the credentials below
// are set in the server environment; until then every admin page says
// "not connected" and no request ever leaves the server.
//
//   FACEBOOK_PAGE_ID                the Facebook Page's numeric id
//   FACEBOOK_PAGE_ACCESS_TOKEN      a long-lived PAGE access token
//   INSTAGRAM_BUSINESS_ACCOUNT_ID   the Instagram business account linked to that Page
//
// The token is a secret: it is read only here, on the server, and is never
// sent to the browser or written into a log.

const GRAPH = "https://graph.facebook.com/v21.0";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function facebookConfigured(): boolean {
  return Boolean(env("FACEBOOK_PAGE_ID") && env("FACEBOOK_PAGE_ACCESS_TOKEN"));
}

export function instagramConfigured(): boolean {
  return Boolean(env("INSTAGRAM_BUSINESS_ACCOUNT_ID") && env("FACEBOOK_PAGE_ACCESS_TOKEN"));
}

export interface SocialStatus {
  facebook: boolean;
  instagram: boolean;
}

export function socialStatus(): SocialStatus {
  return { facebook: facebookConfigured(), instagram: instagramConfigured() };
}

/** A readable reason instead of Meta's raw error, with the token never included. */
function explain(status: number, body: unknown): string {
  const err = (body as { error?: { message?: string; code?: number; error_subcode?: number } } | null)?.error;
  const message = err?.message ?? `Meta answered with status ${status}.`;
  if (err?.code === 190) return "Meta says the access token is no longer valid. Create a new Page access token and update it in Vercel.";
  if (err?.code === 10 || err?.code === 200) return `Meta refused the permission: ${message}`;
  if (err?.code === 4 || err?.code === 17 || err?.code === 32) return "Meta says too many requests were made. Please wait a few minutes and try again.";
  return message;
}

async function graph<T>(path: string, init?: RequestInit & { query?: Record<string, string> }): Promise<T> {
  const url = new URL(`${GRAPH}${path}`);
  for (const [k, v] of Object.entries(init?.query ?? {})) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(45_000) });
  } catch {
    throw new Error("Could not reach Meta (Facebook). Please try again in a moment.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(explain(res.status, body));
  return body as T;
}

export interface ConnectionCheck {
  facebook?: { ok: boolean; detail: string };
  instagram?: { ok: boolean; detail: string };
}

/** Asks Meta who the saved credentials belong to, without posting anything. */
export async function checkConnection(): Promise<ConnectionCheck> {
  const token = env("FACEBOOK_PAGE_ACCESS_TOKEN");
  const out: ConnectionCheck = {};

  if (facebookConfigured()) {
    try {
      const page = await graph<{ id: string; name: string }>(`/${env("FACEBOOK_PAGE_ID")}`, { query: { fields: "id,name", access_token: token } });
      out.facebook = { ok: true, detail: `Connected to the Page "${page.name}".` };
    } catch (e) {
      out.facebook = { ok: false, detail: e instanceof Error ? e.message : "Could not check the Facebook Page." };
    }
  }
  if (instagramConfigured()) {
    try {
      const ig = await graph<{ id: string; username?: string }>(`/${env("INSTAGRAM_BUSINESS_ACCOUNT_ID")}`, { query: { fields: "id,username", access_token: token } });
      out.instagram = { ok: true, detail: `Connected to Instagram${ig.username ? ` @${ig.username}` : ""}.` };
    } catch (e) {
      out.instagram = { ok: false, detail: e instanceof Error ? e.message : "Could not check the Instagram account." };
    }
  }
  return out;
}

/** Posts a picture with a caption on the Facebook Page. */
export async function publishFacebookPhoto(image: ArrayBuffer, caption: string): Promise<{ id: string; url: string }> {
  if (!facebookConfigured()) throw new Error("Facebook is not connected yet.");
  const form = new FormData();
  form.set("source", new Blob([image], { type: "image/png" }), "post.png");
  form.set("caption", caption);
  form.set("published", "true");
  form.set("access_token", env("FACEBOOK_PAGE_ACCESS_TOKEN"));
  const res = await graph<{ id: string; post_id?: string }>(`/${env("FACEBOOK_PAGE_ID")}/photos`, { method: "POST", body: form });
  const postId = res.post_id ?? res.id;
  return { id: postId, url: `https://www.facebook.com/${postId}` };
}

/** Posts a picture with a caption on Instagram. Instagram fetches the picture
 *  itself, so `imageUrl` must be a public JPEG address. */
export async function publishInstagramPhoto(imageUrl: string, caption: string): Promise<{ id: string; url?: string }> {
  if (!instagramConfigured()) throw new Error("Instagram is not connected yet.");
  const igId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  const token = env("FACEBOOK_PAGE_ACCESS_TOKEN");

  const container = await graph<{ id: string }>(`/${igId}/media`, {
    method: "POST",
    query: { image_url: imageUrl, caption, access_token: token },
  });

  // Instagram needs a moment to fetch and process the picture.
  for (let i = 0; i < 8; i++) {
    const s = await graph<{ status_code?: string }>(`/${container.id}`, { query: { fields: "status_code", access_token: token } });
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("Instagram could not process the picture.");
    await new Promise((r) => setTimeout(r, 1500));
  }

  const published = await graph<{ id: string }>(`/${igId}/media_publish`, { method: "POST", query: { creation_id: container.id, access_token: token } });
  let url: string | undefined;
  try {
    const m = await graph<{ permalink?: string }>(`/${published.id}`, { query: { fields: "permalink", access_token: token } });
    url = m.permalink;
  } catch {
    url = undefined;
  }
  return { id: published.id, url };
}
