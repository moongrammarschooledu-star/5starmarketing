"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Phone, MessageCircle, User } from "lucide-react";
import { Logo } from "./Logo";
import { site, whatsappLink } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";

const links = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/properties", label: "Properties" },
  { href: "/#services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/#investment", label: "Investment" },
  { href: "/#contact", label: "Contact" },
];

export function Navbar({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors ${
        scrolled
          ? "border-border bg-surface/95 backdrop-blur shadow-sm"
          : "border-transparent bg-surface"
      }`}
    >
      <div className="hidden items-center justify-between border-b border-border/70 bg-ink px-4 py-1.5 text-xs text-white/85 sm:flex lg:px-8">
        <div className="flex items-center gap-5">
          <a
            href={`tel:${site.phoneHref}`}
            onClick={() => trackEvent("phone_click", { context: "navbar_topbar" })}
            className="flex items-center gap-1.5 hover:text-white"
          >
            <Phone className="h-3.5 w-3.5" /> {site.phoneDisplay}
          </a>
          <a href={`mailto:${site.email}`} className="hover:text-white">
            {site.email}
          </a>
        </div>
        <div>{site.addressShort}</div>
      </div>

      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <Link href="/" aria-label="5STAR.M home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-md px-3.5 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface-muted hover:text-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={isLoggedIn ? "/customer/dashboard" : "/login"}
            className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <User className="h-4 w-4" />
            {isLoggedIn ? "My Account" : "Login"}
          </Link>
          <a
            href={whatsappLink("Hi 5STAR.M, I'd like to know more about your properties.")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("whatsapp_click", { context: "navbar_desktop" })}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition-colors hover:bg-primary-hover"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp Us
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-surface px-4 pb-5 pt-2 lg:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-semibold text-ink/85 hover:bg-surface-muted"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <Link
            href={isLoggedIn ? "/customer/dashboard" : "/login"}
            onClick={() => setOpen(false)}
            className="mt-3 flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-5 py-3 text-sm font-bold text-ink"
          >
            <User className="h-4 w-4" />
            {isLoggedIn ? "My Account" : "Login"}
          </Link>
          <a
            href={whatsappLink("Hi 5STAR.M, I'd like to know more about your properties.")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("whatsapp_click", { context: "navbar_mobile" })}
            className="mt-2.5 flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp Us
          </a>
        </div>
      )}
    </header>
  );
}
