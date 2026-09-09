// Central place for all business info. Edit here to update it site-wide.
export const site = {
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
  whatsappNumber: "923198430458",
  whatsappHref: "https://wa.me/923198430458",
  email: "maos.edu@gmail.com",
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
