import type { Metadata } from "next";
import { site } from "@/lib/site";

// Static legal page: it changes only when this file changes.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How 5STAR.M Estate & Builders collects, uses and protects the details you share through our website, Facebook/Instagram forms and WhatsApp.",
  alternates: { canonical: "/privacy-policy" },
};

const updated = "18 November 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <h1 className="text-3xl font-extrabold text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>

      <div className="mt-8 space-y-6 text-[15px] leading-7 text-ink/90">
        <p>
          5STAR.M Estate &amp; Builders (&quot;we&quot;, &quot;us&quot;), {site.address}, respects your privacy. This
          policy explains what we collect when you contact us through this website, a Facebook or Instagram lead
          form, or WhatsApp, and how we use it.
        </p>

        <section>
          <h2 className="text-xl font-bold text-ink">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Your name, phone / WhatsApp number and, if you give it, your email address.</li>
            <li>
              What you are looking for: buying, selling or renting, property type, area, budget and timeline, and any
              message you write.
            </li>
            <li>
              Basic website usage data (pages visited, the ad or link that brought you) through cookies and the Meta
              Pixel / analytics tools, used to measure and improve our advertising.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">How we use it</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>To call or WhatsApp you about the property or service you asked about, and to arrange site visits.</li>
            <li>To send you matching properties, only when you have asked us for options.</li>
            <li>To keep a record of your enquiry so our team can follow up properly.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">Sharing</h2>
          <p className="mt-2">
            We do not sell your details. We share them only when needed to fulfil your request (for example, with a
            property owner or partner agent to arrange a visit), with service providers that host our website and
            records, or when the law requires it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">How long we keep it</h2>
          <p className="mt-2">
            We keep enquiry details for as long as they are useful to help you, and delete them when you ask us to.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">Your choices</h2>
          <p className="mt-2">
            You can ask us at any time to see, correct or delete your details, or to stop contacting you. Contact us
            by WhatsApp or phone at {site.phoneDisplay2}, or by email at{" "}
            <a href={`mailto:${site.displayEmail}`} className="text-primary underline">
              {site.displayEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
