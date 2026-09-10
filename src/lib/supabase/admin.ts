import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Service-role Supabase client — bypasses RLS entirely. NEVER imported by
 *  any client component, and NEVER used for anything a normal authenticated
 *  request can already do. Its only job in this app is creating a new
 *  team member's Auth account (Server Action → teamService.create) without
 *  sending them through the public /register signup flow or duplicating
 *  an account. The "server-only" import makes it a build error to pull
 *  this file into client code. */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Team member creation requires SUPABASE_SERVICE_ROLE_KEY to be set on the server (Settings → API → service_role in your Supabase project). Never expose this key to the browser."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
