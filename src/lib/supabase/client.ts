"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — safe to use in Client Components.
// Only the public URL and anon key are used here; the anon key is
// meant to be public and is constrained entirely by Row Level Security
// policies (see supabase/schema.sql). The service-role key is never
// referenced anywhere in this file or shipped to the browser.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createBrowserClient(url, anonKey);
}
