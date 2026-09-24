"use client";

import { useRef, useState } from "react";
import { Store } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { shopAccent } from "@/lib/accent";
import type { ShopImage } from "@/lib/types";

export function ShopGallery({
  images,
  shopId,
  shopName,
}: {
  images: ShopImage[];
  shopId: number;
  shopName: string;
}) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const accent = shopAccent(shopId);

  if (images.length === 0) {
    return (
      <div
        className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2"
        style={{ background: `linear-gradient(135deg, ${accent.soft}, var(--background))` }}
      >
        <Store size={38} style={{ color: accent.bg }} className="opacity-35" />
        <span className="text-xs font-medium opacity-40" style={{ color: accent.bg }}>
          No photos yet
        </span>
      </div>
    );
  }

  // Scroll position is the source of truth for the active dot, so swipe and
  // dot-tap can't disagree about which image is showing.
  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(i: number) {
    trackRef.current?.scrollTo({ left: i * trackRef.current.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex aspect-[16/9] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.id}
            src={mediaUrl(img.url)}
            alt={`${shopName} photo ${i + 1}`}
            className="h-full w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-sm">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
