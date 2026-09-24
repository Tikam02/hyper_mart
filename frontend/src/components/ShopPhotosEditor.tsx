"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { api, ApiError, mediaUrl } from "@/lib/api";
import type { ShopImage } from "@/lib/types";

const MAX_PHOTOS = 20;

export function ShopPhotosEditor() {
  const [images, setImages] = useState<ShopImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<ShopImage[]>("/api/shops/me/images").then(setImages).catch(() => {});
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.upload<{ url: string }>("/api/uploads/image", file);
      const image = await api.post<ShopImage>("/api/shops/me/images", { url });
      setImages((prev) => [...prev, image]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed, try again");
    } finally {
      setBusy(false);
      // Clear the input so re-picking the same file still fires a change event.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveCaption(image: ShopImage, caption: string) {
    const next = caption.trim() || null;
    if (next === image.caption) return;
    try {
      const updated = await api.patch<ShopImage>(`/api/shops/me/images/${image.id}`, { caption: next });
      setImages((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the label");
    }
  }

  async function remove(id: number) {
    setError(null);
    try {
      await api.delete(`/api/shops/me/images/${id}`);
      setImages((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove photo");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1.5 font-semibold">
        <ImagePlus size={16} className="text-brand" /> Shop photos
      </h2>
      <p className="-mt-2 text-sm text-foreground/50">
        The first photo is what customers see on your card when they browse. Up to {MAX_PHOTOS}.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <div key={img.id} className="flex flex-col gap-1">
            <div className="relative overflow-hidden rounded-xl ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(img.url)} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-foreground">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(img.id)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 rounded-full bg-black/55 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-danger"
              >
                <Trash2 size={12} />
              </button>
            </div>
            {/* Saved on blur rather than behind a button: an owner adding a
                dozen showroom photos shouldn't tap Save a dozen times. */}
            <input
              type="text"
              defaultValue={img.caption ?? ""}
              maxLength={200}
              placeholder="Add label"
              onBlur={(e) => saveCaption(img, e.target.value)}
              className="w-full rounded-lg bg-background px-2 py-1 text-[11px] shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        ))}

        {images.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-surface text-foreground/45 shadow-sm ring-1 ring-dashed ring-border transition-colors hover:text-brand disabled:opacity-60"
          >
            {busy ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-[11px] font-medium">{busy ? "Uploading" : "Add photo"}</span>
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
