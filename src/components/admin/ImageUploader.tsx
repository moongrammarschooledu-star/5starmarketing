"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, Link as LinkIcon, X, Star, ChevronLeft, ChevronRight } from "lucide-react";

// Uploaded files are read as data: URLs for instant preview and submitted
// as-is; the server action resolves each data: URI to real Supabase
// Storage on save (see src/services/storage.ts). Admins can also paste a
// hosted image URL directly instead of uploading a file. The first image
// in the list is used as the cover/main photo — use "Set as Cover" to
// reorder without deleting and re-adding.
export function ImageUploader({
  name,
  initialImages = [],
}: {
  name: string;
  initialImages?: string[];
}) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [urlInput, setUrlInput] = useState("");

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setImages((imgs) => [...imgs, url]);
    setUrlInput("");
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    [...fileList].forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImages((imgs) => [...imgs, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function removeAt(index: number) {
    setImages((imgs) => imgs.filter((_, i) => i !== index));
  }

  function setAsCover(index: number) {
    setImages((imgs) => {
      const next = [...imgs];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      return next;
    });
  }

  function move(index: number, dir: -1 | 1) {
    setImages((imgs) => {
      const target = index + dir;
      if (target < 0 || target >= imgs.length) return imgs;
      const next = [...imgs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div>
      {images.map((src) => (
        <input key={src.slice(0, 64) + src.length} type="hidden" name={name} value={src} />
      ))}

      {images.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((src, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
              <Image src={src} alt={`Image ${i + 1}`} fill sizes="140px" className="object-cover" unoptimized={src.startsWith("data:")} />
              {i === 0 && (
                <span className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  <Star className="h-2.5 w-2.5 fill-current" /> Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-white"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/70 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="flex h-5 w-5 items-center justify-center rounded text-white disabled:opacity-30"
                  aria-label="Move left"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => setAsCover(i)}
                    className="rounded px-1.5 text-[10px] font-bold text-white hover:text-primary"
                  >
                    Set Cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  className="flex h-5 w-5 items-center justify-center rounded text-white disabled:opacity-30"
                  aria-label="Move right"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" /> Upload images
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
              placeholder="Or paste an image URL"
              className="w-full rounded-lg border border-border bg-surface py-3 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={addUrl}
            className="rounded-lg border-2 border-ink/15 px-3 py-3 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
