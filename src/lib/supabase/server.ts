import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// Scheduled jobs (see /api/cron/marketing) run with nobody signed in, so row
// level security would hide everything from them. Inside runAsSystem() every
// createClient() call returns the server's own (service role) client instead.
// Nothing else ever enters this scope.
const systemScope = new AsyncLocalStorage<true>();

export function runAsSystem<T>(job: () => Promise<T>): Promise<T> {
  return systemScope.run(true, job);
}

// Server-side Supabase client — for Server Components, Server Actions and
// Route Handlers. Reads/writes the auth session via cookies so the user
// stays logged in across requests. Still uses only the public anon key;
// access control is enforced by Postgres Row Level Security, not by this
// client holding elevated privileges.
export async function createClient() {
  if (systemScope.getStore()) {
    return createServiceRoleClient() as unknown as ReturnType<typeof createServerClient>;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component that can't set cookies — safe to
          // ignore because the middleware refreshes the session on every
          // request anyway.
        }
      },
    },
  });
}

/** True only when both public Supabase env vars are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
