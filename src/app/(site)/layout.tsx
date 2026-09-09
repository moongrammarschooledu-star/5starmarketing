import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppFloatButton } from "@/components/WhatsAppButton";
import { FavoritesProvider } from "@/components/customer/FavoritesProvider";
import { CompareProvider } from "@/components/customer/CompareProvider";
import { CompareBar } from "@/components/customer/CompareBar";
import { customerService } from "@/services/customerService";
import { favoritesService } from "@/services/favoritesService";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  let isLoggedIn = false;
  let favoriteIds: string[] = [];

  if (isSupabaseConfigured()) {
    try {
      const customer = await customerService.getCurrentCustomer();
      if (customer) {
        isLoggedIn = true;
        favoriteIds = [...(await favoritesService.listPropertyIds(customer.id))];
      }
    } catch {
      // Public pages must render even if this lookup fails.
    }
  }

  return (
    <FavoritesProvider initialFavoriteIds={favoriteIds} isLoggedIn={isLoggedIn}>
      <CompareProvider>
        <Navbar isLoggedIn={isLoggedIn} />
        {children}
        <Footer />
        <WhatsAppFloatButton />
        <CompareBar />
      </CompareProvider>
    </FavoritesProvider>
  );
}
