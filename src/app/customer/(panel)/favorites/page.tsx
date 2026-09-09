import Link from "next/link";
import { Heart } from "lucide-react";
import { customerService } from "@/services/customerService";
import { favoritesService } from "@/services/favoritesService";
import { PropertyCard } from "@/components/PropertyCard";

export const metadata = { title: "Favorites" };
export const dynamic = "force-dynamic";

export default async function CustomerFavoritesPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const favorites = await favoritesService.listProperties(customer.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Saved Properties</h1>
      <p className="mt-1 text-sm text-muted">Properties you&apos;ve favorited. Tap the heart to remove one.</p>

      {favorites.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink">You haven&apos;t saved any properties yet.</h2>
          <Link
            href="/properties"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
