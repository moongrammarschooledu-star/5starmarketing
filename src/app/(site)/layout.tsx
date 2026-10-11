import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { NewsTicker } from "@/components/NewsTicker";
import { Footer } from "@/components/Footer";
import { WhatsAppFloatButton } from "@/components/WhatsAppButton";
import { FavoritesProvider } from "@/components/customer/FavoritesProvider";
import { CompareProvider } from "@/components/customer/CompareProvider";
import { CompareBar } from "@/components/customer/CompareBar";

// The public pages are the same HTML for every visitor, so the CDN can cache
// them. Who is signed in (the "My Account" button, saved properties) is looked
// up by the browser after the page loads - see FavoritesProvider.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <FavoritesProvider>
      <CompareProvider>
        <NewsTicker />
        <Navbar />
        {children}
        <Footer />
        <WhatsAppFloatButton />
        {/* PublicAiChatWidget hidden until ANTHROPIC_API_KEY in Vercel
            Production is fixed (currently contains an invalid character,
            breaking the x-api-key header). Component/API untouched — just
            re-add the import + <PublicAiChatWidget /> line to bring it back. */}
        <CompareBar />
      </CompareProvider>
    </FavoritesProvider>
  );
}
