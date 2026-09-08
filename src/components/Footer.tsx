import { Facebook, Instagram, Youtube, Phone, Mail, MapPin } from "lucide-react";
import { Logo } from "./Logo";
import { site, whatsappLink } from "@/lib/site";

const quickLinks = [
  { href: "#properties", label: "Properties" },
  { href: "#services", label: "Services" },
  { href: "#about", label: "About Us" },
  { href: "#contact", label: "Contact" },
];

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-.9-.88-1.45-2.02-1.55-3.32h-3.03v13.44c0 1.64-1.33 2.97-2.97 2.97a2.97 2.97 0 0 1-2.97-2.97c0-1.64 1.33-2.97 2.97-2.97.26 0 .5.03.74.1v-3.1a6.06 6.06 0 0 0-.74-.05 6.02 6.02 0 0 0-6.02 6.02 6.02 6.02 0 0 0 6.02 6.02 6.02 6.02 0 0 0 6.02-6.02V9.4a8.34 8.34 0 0 0 4.86 1.56V7.93a5.3 5.3 0 0 1-3.33-2.11Z" />
    </svg>
  );
}

const social = [
  { href: site.social.facebook, icon: Facebook, label: "Facebook" },
  { href: site.social.instagram, icon: Instagram, label: "Instagram" },
  { href: site.social.tiktok, icon: TikTokIcon, label: "TikTok" },
  { href: site.social.youtube, icon: Youtube, label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo light />
          <p className="mt-5 max-w-xs text-sm font-semibold uppercase tracking-wide text-white/70">
            &ldquo;Now You Will Dream — We Will Fulfill It&rdquo;
          </p>
          <div className="mt-5 flex items-center gap-3">
            {social.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-primary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-white">
            Quick Links
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-white/70 transition-colors hover:text-primary">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-white">
            Contact
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-primary" /> {site.phoneDisplay}
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-primary" /> {site.email}
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-primary" /> {site.address}
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-white">
            Talk To Us
          </h4>
          <p className="mt-4 text-sm text-white/70">
            Fastest way to reach us for property or construction inquiries.
          </p>
          <a
            href={whatsappLink("Hi 5STAR.M, I'd like to know more.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
          >
            WhatsApp Us
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/50 lg:px-8">
        © {site.year} 5STAR.M Estate &amp; Builders. All Rights Reserved.
      </div>
    </footer>
  );
}
