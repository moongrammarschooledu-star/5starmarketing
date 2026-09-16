import { requireSection } from "@/lib/guard";
import { testimonialService } from "@/services/testimonialService";
import { propertyService } from "@/services/propertyService";
import { TestimonialManager } from "@/components/admin/TestimonialManager";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  await requireSection("content");
  const [testimonials, properties] = await Promise.all([testimonialService.listAll(), propertyService.list()]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Testimonials</h1>
      <p className="mt-1 text-sm text-muted">Only approved testimonials appear on the public site.</p>
      <div className="mt-6">
        <TestimonialManager testimonials={testimonials} properties={properties.map((p) => ({ id: p.id, title: p.title }))} />
      </div>
    </div>
  );
}
