import { NextResponse } from "next/server";
import { customerService } from "@/services/customerService";
import { favoritesService } from "@/services/favoritesService";
import { isSupabaseConfigured } from "@/lib/supabase/server";

// Who is looking at the public site: a signed-in customer or nobody. The public
// pages themselves are the same HTML for everybody (so they can be cached by the
// CDN), and this small call - made by the browser only when it holds a sign-in
// cookie - tells the page to show "My Account" and the saved properties.
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSupabaseConfigured()) return NextResponse.json({ loggedIn: false, favoriteIds: [] }, { headers });
  try {
    const customer = await customerService.getCurrentCustomer();
    if (!customer) return NextResponse.json({ loggedIn: false, favoriteIds: [] }, { headers });
    const ids = await favoritesService.listPropertyIds(customer.id);
    return NextResponse.json({ loggedIn: true, favoriteIds: [...ids] }, { headers });
  } catch {
    return NextResponse.json({ loggedIn: false, favoriteIds: [] }, { headers });
  }
}
