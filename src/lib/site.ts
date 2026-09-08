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
  const base = site.whatsappHref;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
