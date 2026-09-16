"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Check, X, Trash2 } from "lucide-react";
import { createTestimonialAction, setTestimonialApprovedAction, deleteTestimonialAction } from "@/lib/actions/content.actions";
import type { PublicTestimonial } from "@/lib/models/content";

export function TestimonialManager({ testimonials, properties }: { testimonials: PublicTestimonial[]; properties: { id: string; title: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);
  const [propertyId, setPropertyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    if (!name.trim() || !review.trim()) {
      setError("Customer name and review text are required.");
      return;
    }
    startTransition(async () => {
      try {
        await createTestimonialAction({ customerDisplayName: name.trim(), review: review.trim(), rating, propertyId: propertyId || undefined });
        setName("");
        setReview("");
        setPropertyId("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add this testimonial.");
      }
    });
  }

  function toggleApproved(id: string, approved: boolean) {
    startTransition(async () => {
      await setTestimonialApprovedAction(id, approved);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this testimonial permanently?")) return;
    startTransition(async () => {
      await deleteTestimonialAction(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-heading text-sm font-bold text-ink">Add a Testimonial</h2>
        <p className="mt-1 text-xs text-muted">
          Enter a real testimonial you&apos;ve received from a customer (e.g. via WhatsApp or in person). It stays hidden from the
          public site until approved below.
        </p>
        {error && <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer display name" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">Not linked to a property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} placeholder="What the customer said…" className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs font-bold text-ink">Rating:</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)}>
              <Star className={`h-4 w-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
            </button>
          ))}
          <button type="button" onClick={add} disabled={pending} className="ml-auto rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Add Testimonial
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {testimonials.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-sm font-bold text-ink">{t.customerDisplayName}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.approved ? "bg-success/10 text-success" : "bg-amber-100 text-amber-700"}`}>
                {t.approved ? "Approved" : "Pending"}
              </span>
            </div>
            {t.rating && (
              <div className="mt-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-3.5 w-3.5 ${n <= t.rating! ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                ))}
              </div>
            )}
            <p className="mt-2 text-sm text-muted">{t.review}</p>
            {t.propertyTitle && <p className="mt-1 text-xs font-semibold text-primary">{t.propertyTitle}</p>}
            <div className="mt-3 flex items-center gap-2">
              {!t.approved ? (
                <button type="button" onClick={() => toggleApproved(t.id, true)} className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1.5 text-xs font-bold text-success">
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
              ) : (
                <button type="button" onClick={() => toggleApproved(t.id, false)} className="flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink">
                  <X className="h-3.5 w-3.5" /> Unpublish
                </button>
              )}
              <button type="button" onClick={() => remove(t.id)} className="flex items-center gap-1 rounded-full border-2 border-danger/30 px-3 py-1.5 text-xs font-bold text-danger">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
        {testimonials.length === 0 && <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">No testimonials yet.</p>}
      </div>
    </div>
  );
}
