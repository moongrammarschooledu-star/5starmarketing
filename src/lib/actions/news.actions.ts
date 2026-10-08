"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { siteNewsService, TICKER_TAG } from "@/services/siteNewsService";
import { activityService } from "@/services/activityService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { NEWS_MAX, NEWS_MIN, type SiteNewsInput } from "@/lib/models/news";

export interface NewsFormInput {
  message: string;
  linkUrl: string;
  isActive: boolean;
  /** "YYYY-MM-DD" or empty. */
  expiresOn: string;
}

type Result = { ok: true } | { ok: false; error: string };

async function requireContentAccess(): Promise<string> {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "content")) throw new Error("Not authorized.");
  return admin.id;
}

function readInput(form: NewsFormInput): { input?: SiteNewsInput; error?: string } {
  const message = form.message.trim().replace(/\s+/g, " ");
  if (message.length < NEWS_MIN) return { error: "Please write the news." };
  if (message.length > NEWS_MAX) return { error: `The news is too long - keep it under ${NEWS_MAX} characters.` };

  const link = form.linkUrl.trim();
  // A page on this website ("/properties") or a secure address. Anything else
  // (javascript:, data:, protocol-relative "//host") is refused.
  if (link && !(/^\/(?!\/)\S*$/.test(link) || /^https:\/\/\S+$/.test(link))) {
    return { error: 'The link must start with "/" (a page on this website) or "https://".' };
  }

  let expiresAt: string | undefined;
  if (form.expiresOn.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expiresOn.trim())) return { error: "Please choose a valid end date." };
    // Valid through the end of that day, Pakistan time.
    expiresAt = `${form.expiresOn.trim()}T23:59:59+05:00`;
    if (Number.isNaN(Date.parse(expiresAt))) return { error: "Please choose a valid end date." };
  }

  return { input: { message, linkUrl: link || undefined, isActive: form.isActive, expiresAt } };
}

function refresh() {
  revalidateTag(TICKER_TAG);
  revalidatePath("/admin/content/news");
}

export async function createNewsAction(form: NewsFormInput): Promise<Result> {
  try {
    const adminId = await requireContentAccess();
    const { input, error } = readInput(form);
    if (!input) return { ok: false, error: error ?? "Please check the news." };
    const news = await siteNewsService.create(input, adminId);
    await activityService.log("Added News", news.message.slice(0, 80), "news", news.id);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save this news." };
  }
}

export async function updateNewsAction(id: string, form: NewsFormInput): Promise<Result> {
  try {
    await requireContentAccess();
    const { input, error } = readInput(form);
    if (!input) return { ok: false, error: error ?? "Please check the news." };
    const news = await siteNewsService.update(id, input);
    if (!news) return { ok: false, error: "This news no longer exists." };
    await activityService.log("Updated News", news.message.slice(0, 80), "news", id);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update this news." };
  }
}

export async function setNewsActiveAction(id: string, isActive: boolean): Promise<Result> {
  try {
    await requireContentAccess();
    await siteNewsService.setActive(id, isActive);
    await activityService.log(isActive ? "Showed News" : "Hid News", id, "news", id);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not change this news." };
  }
}

export async function deleteNewsAction(id: string): Promise<Result> {
  try {
    await requireContentAccess();
    await siteNewsService.remove(id);
    await activityService.log("Deleted News", id, "news", id);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete this news." };
  }
}
