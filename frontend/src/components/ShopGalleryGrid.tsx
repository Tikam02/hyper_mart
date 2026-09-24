"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import type { ShopImage } from "@/lib/types";

export function ShopGalleryGrid({ images, shopName }: { images: ShopImage[]; shopName: string }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  // Escape and arrow keys, because the lightbox covers the whole screen and
  // there's no other way back out on a desktop browser.
  useEffect(() => {
    if (openAt === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenAt(null);
      if (e.key === "ArrowRight") setOpenAt((i) => (i === null ? null : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpenAt((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAt, images.length]);

  if (images.length === 0) return null;

  const current = openAt === null ? null : images[openAt];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Photos ({images.length})</h2>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpenAt(i)}
            className="group relative overflow-hidden rounded-xl ring-1 ring-border"
            aria-label={img.caption ?? `Photo ${i + 1} of ${shopName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(img.url)}
              alt={img.caption ?? ""}
              className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {img.caption && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] font-medium text-white">
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setOpenAt(null)}
          role="dialog"
          aria-modal="true"
          aria-label={current.caption ?? "Photo"}
        >
          <button
            type="button"
            onClick={() => setOpenAt(null)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white"
          >
            <X size={20} />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(current.url)}
            alt={current.caption ?? ""}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[75vh] max-w-full rounded-xl object-contain"
          />
          {current.caption && <p className="mt-3 text-center text-sm text-white/90">{current.caption}</p>}
          <p className="mt-1 text-xs text-white/50">
            {openAt! + 1} of {images.length}
          </p>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenAt((i) => (i === null ? null : (i - 1 + images.length) % images.length));
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenAt((i) => (i === null ? null : (i + 1) % images.length));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
