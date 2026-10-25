// Email-code second step for the admin / agent login. This file is shared by
// the Edge middleware and the server actions, so it uses only Web Crypto.
//
// How it works: after the password, a 6-digit code is emailed to the staff
// member. Entering it sets a signed cookie (bound to that user, valid for
// 12 hours). The middleware lets /admin and /agent pages open only when that
// cookie is present and genuine.

export const ADMIN_2FA_COOKIE = "admin_2fa";
export const ADMIN_2FA_VERIFY_PATH = "/admin/verify";
export const ADMIN_2FA_SESSION_SECONDS = 12 * 60 * 60;
export const ADMIN_2FA_CODE_MINUTES = 10;

/** The second step is applied only when this switch is on, so the site can
 *  never lock its admins out before email sending has been set up. */
export function isAdminTwoFactorEnabled(): boolean {
  return process.env.ADMIN_EMAIL_2FA === "on";
}

const encoder = new TextEncoder();

async function hmacHex(message: string): Promise<string | null> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`admin-2fa:${key}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Hash of an emailed code - only this is stored, never the code itself. */
export async function hashLoginCode(userId: string, code: string): Promise<string | null> {
  return hmacHex(`code:${userId}:${code}`);
}

/** Cookie value proving this user finished the email-code step. */
export async function createVerifiedCookieValue(userId: string): Promise<string | null> {
  const expires = Math.floor(Date.now() / 1000) + ADMIN_2FA_SESSION_SECONDS;
  const sig = await hmacHex(`session:${userId}:${expires}`);
  return sig ? `${expires}.${sig}` : null;
}

export async function isVerifiedCookieValid(userId: string, value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expiresRaw, sig] = value.split(".");
  const expires = Number(expiresRaw);
  if (!sig || !Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacHex(`session:${userId}:${expires}`);
  return expected !== null && safeEqual(expected, sig);
}

export function safeAdminRedirect(target: string | null | undefined): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return "/admin/dashboard";
  if (!(target.startsWith("/admin") || target.startsWith("/agent"))) return "/admin/dashboard";
  if (target.startsWith("/admin/login") || target.startsWith(ADMIN_2FA_VERIFY_PATH)) return "/admin/dashboard";
  return target;
}
