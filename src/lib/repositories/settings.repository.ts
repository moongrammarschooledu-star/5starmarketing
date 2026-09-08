import "server-only";
import type { WebsiteSettings, WebsiteSettingsInput } from "@/lib/models/settings";
import { globalStore } from "./global-store";

// NOTE: the public site currently reads business info from the static
// src/lib/site.ts constants, not from here — wiring the live site to this
// record is a STEP 4 task once Supabase is connected. For now this powers
// the admin Settings page only, so admins can see the intended shape of
// that future connection.
const store = globalStore<WebsiteSettings>("settings", () => ({
  businessName: "5STAR.M Estate & Builders",
  tagline: "NOW YOU WILL DREAM — WE WILL FULFILL IT",
  phone: "+92 319 8430458",
  whatsapp: "+92 319 8430458",
  email: "maos.edu@gmail.com",
  address: "1037-E-1 Johar Town, Lahore, Pakistan",
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  logoUrl: "/images/logo.png",
  faviconUrl: "/icon.svg",
  updatedAt: new Date("2026-01-15").toISOString(),
}));

export const settingsRepository = {
  async get(): Promise<WebsiteSettings> {
    return store.get();
  },
  async update(input: Partial<WebsiteSettingsInput>): Promise<WebsiteSettings> {
    const next = { ...store.get(), ...input, updatedAt: new Date().toISOString() };
    store.set(next);
    return next;
  },
};
