"use client";

import { useRef, useState } from "react";
import { AlertCircle, Loader2, Upload, Video as VideoIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "property-videos";
const MAX_BYTES = 100 * 1024 * 1024; // 100MB — mirrors the bucket's own file_size_limit
const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

// Uploaded straight from the admin's browser to Supabase Storage using
// their own authenticated session (the "property_videos_admin_write"
// RLS policy checks is_admin() against that session) — never as a data:
// URI through the server action's body like ImageUploader does. Video
// files are commonly 10-100MB; routing that through the Next.js server
// action risks hitting Vercel's request body limits, so the bytes never
// touch our server at all here.
export function VideoUploader({ name, initialVideo }: { name: string; initialVideo?: string }) {
  const [videoUrl, setVideoUrl] = useState(initialVideo ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please upload an MP4, WEBM or MOV video.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Video must be smaller than 100MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setVideoUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload this video. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={videoUrl} />

      {videoUrl && (
        <div className="relative mb-3 max-w-sm">
          <video src={videoUrl} controls className="w-full rounded-lg border border-border" />
          <button
            type="button"
            onClick={() => setVideoUrl("")}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/80 text-white"
            aria-label="Remove video"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!videoUrl && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <VideoIcon className="h-4 w-4" />}
          {uploading ? "Uploading video..." : (
            <span className="inline-flex items-center gap-2">
              <Upload className="h-4 w-4" /> Upload a walkthrough video
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}

      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      <p className="mt-1.5 text-xs text-muted">Optional. MP4, WEBM or MOV, up to 100MB.</p>
    </div>
  );
}
