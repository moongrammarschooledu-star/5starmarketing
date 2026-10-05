// Central place for all business info. Edit here to update it site-wide.
export const site = {
  // The company's own domain (www.5starmestate.com redirects to it).
  url: "https://5starmestate.com",
  // The address printed on brochures and encoded in their QR codes. Same as
  // `url` now that the domain is live; kept separate so a link that must
  // keep working can be pointed somewhere else without touching SEO.
  websiteUrl: "https://5starmestate.com",
  name: "5STAR.M",
  fullName: "5STAR.M Estate & Builders",
  tagline: "NOW YOU WILL DREAM",
  taglineSecondary: "WE WILL FULFILL IT",
  taglineFull: "NOW YOU WILL DREAM — WE WILL FULFILL IT",
  description:
    "5STAR.M Estate & Builders provides professional real estate, property investment, buying, selling and construction solutions in Lahore.",
  director: "Muhammad Munawar",
  directorTitle: "Director",
  phoneDisplay: "+92 319 8430458",
  phoneHref: "+923198430458",
  phoneDisplay2: "0308-6010310",
  phoneHref2: "+923086010310",
  whatsappNumber: "923198430458",
  whatsappHref: "https://wa.me/923198430458",
  // The company email - the ONLY email address used anywhere in the app
  // (public pages, PDFs, structured data, outgoing request headers). The
  // owner's personal login email must never be put here or in code.
  displayEmail: "5star.marketing.2233@gmail.com",
  address: "1037-E-1 Johar Town, Lahore, Pakistan",
  addressShort: "1037-E-1 Johar Town, Lahore",
  mapsQuery: "1037-E-1 Johar Town, Lahore, Pakistan",
  social: {
    facebook: "#",
    instagram: "#",
    tiktok: "#",
    youtube: "#",
  },
  year: new Date().getFullYear(),
};

export function whatsappLink(message?: string) {
  return whatsappUrlFor(site.whatsappNumber, message);
}

/** wa.me requires the full international number with no leading 0 —
 *  customers almost always enter Pakistani numbers as "03XXXXXXXXX", so
 *  that gets rewritten to "92XXXXXXXXX". Already-international numbers
 *  pass through unchanged. */
export function toWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
}

/** Same as whatsappLink, but for any number — an admin-configurable one
 *  (e.g. from website_settings) or a customer/lead's own number. */
export function whatsappUrlFor(number: string, message?: string) {
  const digits = toWhatsAppNumber(number);
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
