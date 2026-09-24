import Link from "next/link";
import { ArrowRight, Circle, Star, Store } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { shopAccent } from "@/lib/accent";
import type { ShopPublic } from "@/lib/types";

export function ShopCard({ shop }: { shop: ShopPublic }) {
  const accent = shopAccent(shop.id);
  const place = shop.locality ?? shop.address_text;

  return (
    <Link
      href={`/shops/${shop.id}`}
      className="group block overflow-hidden rounded-2xl shadow-sm ring-1 ring-border transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-brand-soft">
        {shop.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(shop.cover_url)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          // Most shops have no photo yet, so the empty state has to look
          // deliberate rather than broken.
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-1.5"
            style={{ background: `linear-gradient(135deg, ${accent.soft}, #fdf8f0)` }}
          >
            <Store size={30} style={{ color: accent.bg }} className="opacity-35" />
            <span className="text-[11px] font-medium opacity-40" style={{ color: accent.bg }}>
              No photo yet
            </span>
          </div>
        )}

        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${
            shop.is_open ? "bg-white/90 text-success" : "bg-white/90 text-foreground/45"
          }`}
        >
          <Circle size={6} className="fill-current" strokeWidth={0} />
          {shop.is_open ? "Open now" : "Closed"}
        </span>
      </div>

      <div className="px-4 py-3 text-white" style={{ backgroundColor: accent.bg }}>
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 truncate font-semibold">{shop.name}</h3>
          {shop.avg_rating != null ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
              <Star size={13} className="fill-amber-300 text-amber-300" />
              {shop.avg_rating.toFixed(1)}
              <span className="font-normal text-white/60">({shop.review_count})</span>
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              New
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-white/70">{place}</p>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-white/90">
            Let&apos;s Go
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
