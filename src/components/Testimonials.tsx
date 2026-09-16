import { Star, Quote } from "lucide-react";
import { testimonialService } from "@/services/testimonialService";

/** Only ever renders APPROVED, admin-entered testimonials (STEP 32
 *  section 36) — renders nothing at all when there are none, rather
 *  than showing a placeholder or fabricated review. */
export async function Testimonials() {
  const testimonials = await testimonialService.listApproved(6);
  if (testimonials.length === 0) return null;

  return (
    <section className="bg-surface-muted py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-wide text-primary">What Our Clients Say</p>
        <h2 className="mt-2 text-center font-heading text-2xl font-extrabold text-ink sm:text-3xl">Client Testimonials</h2>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-surface p-6">
              <Quote className="h-6 w-6 text-primary/30" />
              {t.rating && (
                <div className="mt-3 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= t.rating! ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                  ))}
                </div>
              )}
              <p className="mt-3 text-sm leading-relaxed text-muted">&ldquo;{t.review}&rdquo;</p>
              <p className="mt-4 font-heading text-sm font-bold text-ink">{t.customerDisplayName}</p>
              {t.propertyTitle && <p className="text-xs text-muted-foreground">{t.propertyTitle}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
