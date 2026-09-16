"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { blogService } from "@/services/blogService";
import { landingPageService } from "@/services/landingPageService";
import { testimonialService } from "@/services/testimonialService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import type { BlogPostInput, PublicLandingPageInput, PublicTestimonialInput } from "@/lib/models/content";

async function requireContentAccess(): Promise<string> {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "content")) throw new Error("Not authorized.");
  return admin.id;
}

// ---- Blog ----

export async function createBlogPostAction(input: BlogPostInput) {
  const adminId = await requireContentAccess();
  const post = await blogService.create(input, adminId);
  revalidatePath("/admin/content/blog");
  revalidatePath("/blog");
  return post;
}

export async function updateBlogPostAction(id: string, input: Partial<BlogPostInput>) {
  await requireContentAccess();
  const post = await blogService.update(id, input);
  revalidatePath("/admin/content/blog");
  revalidatePath("/blog");
  if (post) revalidatePath(`/blog/${post.slug}`);
  return post;
}

export async function deleteBlogPostAction(id: string) {
  await requireContentAccess();
  await blogService.remove(id);
  revalidatePath("/admin/content/blog");
  revalidatePath("/blog");
  redirect("/admin/content/blog");
}

// ---- Landing pages ----

export async function createLandingPageAction(input: PublicLandingPageInput) {
  const adminId = await requireContentAccess();
  const page = await landingPageService.create(input, adminId);
  revalidatePath("/admin/content/landing-pages");
  return page;
}

export async function updateLandingPageAction(id: string, input: Partial<PublicLandingPageInput>) {
  await requireContentAccess();
  const page = await landingPageService.update(id, input);
  revalidatePath("/admin/content/landing-pages");
  if (page) revalidatePath(`/landing/${page.slug}`);
  return page;
}

export async function deleteLandingPageAction(id: string) {
  await requireContentAccess();
  await landingPageService.remove(id);
  revalidatePath("/admin/content/landing-pages");
  redirect("/admin/content/landing-pages");
}

// ---- Testimonials ----

export async function createTestimonialAction(input: PublicTestimonialInput) {
  await requireContentAccess();
  const t = await testimonialService.create(input);
  revalidatePath("/admin/content/testimonials");
  return t;
}

export async function setTestimonialApprovedAction(id: string, approved: boolean) {
  const adminId = await requireContentAccess();
  await testimonialService.setApproved(id, approved, adminId);
  revalidatePath("/admin/content/testimonials");
  revalidatePath("/");
}

export async function deleteTestimonialAction(id: string) {
  await requireContentAccess();
  await testimonialService.remove(id);
  revalidatePath("/admin/content/testimonials");
}
