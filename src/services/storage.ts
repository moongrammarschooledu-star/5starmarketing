import "server-only";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_DOCUMENT_TYPES = ["application/pdf"];

/**
 * Images arrive from a form either as hosted https:// URLs (pasted by the
 * admin) or as data: URIs (the browser-side preview from a file upload).
 * This uploads the data: URIs to the given Storage bucket and returns the
 * final list of URLs to store, validating type/size along the way so we
 * never store or serve something unexpected.
 */
export async function resolveStorageImages(images: string[], bucket: string): Promise<string[]> {
  const supabase = await createClient();
  const resolved: string[] = [];

  for (const image of images) {
    if (!image.startsWith("data:")) {
      resolved.push(image);
      continue;
    }

    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) continue;
    const [, mimeType, base64] = match;

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}. Use JPEG, PNG, WEBP or GIF.`);
    }

    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("One of the uploaded images is larger than 5MB.");
    }

    const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, bytes, { contentType: mimeType, upsert: false });

    if (error) {
      console.error(`Supabase storage upload failed (${bucket}):`, error);
      throw new Error("Could not upload one of the images. Please try again.");
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    resolved.push(data.publicUrl);
  }

  return resolved;
}

/** Deletes images from Storage. Best-effort — a failure here shouldn't
 *  block the record deletion the caller is doing. */
export async function deleteStorageImages(images: string[], bucket: string) {
  const paths = images
    .map((url) => url.split(`/${bucket}/`)[1])
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) console.error(`Failed to delete images from storage (${bucket}):`, error);
}

export interface StoredDocument {
  name: string;
  url: string;
}

/** Same idea as resolveStorageImages, but for PDF documents (brochures,
 *  floor plans, payment plans) — each entry carries an admin-given label
 *  alongside the file. Entries whose url is already hosted pass through
 *  unchanged; data: URIs get uploaded to the `documents` bucket. */
export async function resolveStorageDocuments(docs: StoredDocument[]): Promise<StoredDocument[]> {
  const supabase = await createClient();
  const resolved: StoredDocument[] = [];

  for (const doc of docs) {
    if (!doc.name.trim() || !doc.url) continue;

    if (!doc.url.startsWith("data:")) {
      resolved.push({ name: doc.name.trim(), url: doc.url });
      continue;
    }

    const match = doc.url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) continue;
    const [, mimeType, base64] = match;

    if (!ALLOWED_DOCUMENT_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported document type: ${mimeType}. Use PDF.`);
    }

    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
      throw new Error("One of the uploaded documents is larger than 15MB.");
    }

    const path = `${crypto.randomUUID()}.pdf`;
    const { error } = await supabase.storage
      .from("documents")
      .upload(path, bytes, { contentType: mimeType, upsert: false });

    if (error) {
      console.error("Supabase storage upload failed (documents):", error);
      throw new Error("Could not upload one of the documents. Please try again.");
    }

    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    resolved.push({ name: doc.name.trim(), url: data.publicUrl });
  }

  return resolved;
}

export async function deleteStorageDocuments(docs: StoredDocument[]) {
  return deleteStorageImages(
    docs.map((d) => d.url),
    "documents"
  );
}
