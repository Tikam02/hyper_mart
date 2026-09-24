import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Circle,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Clock,
  Star,
  Tag,
  Ticket,
} from "lucide-react";
import { API_URL, SITE_URL } from "@/lib/api";
import { hoursLabel, monthYear } from "@/lib/format";
import type { ShopDetail } from "@/lib/types";
import { CouponCard } from "@/components/CouponCard";
import { ShopActions } from "@/components/ShopActions";
import { ShopCatalog } from "@/components/ShopCatalog";
import { ShopGallery } from "@/components/ShopGallery";
import { ShopGalleryGrid } from "@/components/ShopGalleryGrid";
import { AskAvailability } from "@/components/AskAvailability";
import { ReviewSection } from "@/components/ReviewSection";
import { Badge } from "@/components/ui/Badge";

async function getShop(id: string): Promise<ShopDetail | null> {
  const res = await fetch(`${API_URL}/api/shops/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load shop");
  return res.json();
}

export async function generateMetadata({ params }: PageProps<"/shops/[id]">): Promise<Metadata> {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) return { title: "Shop not found" };

  const image = shop.cover_url ?? shop.products.find((p) => p.image_url)?.image_url;
  const description =
    shop.description ??
    `${shop.locality ?? shop.address_text}${shop.active_coupons.length ? ` — ${shop.active_coupons.length} offer(s) live now` : ""}`;

  return {
    title: shop.name,
    description,
    openGraph: {
      title: shop.name,
      description,
      // Absolute, and off SITE_URL rather than the API host: uploads are proxied
      // through this origin, and a social crawler can't resolve an internal
      // backend address.
      images: [{ url: image ? `${SITE_URL}${image}` : `${SITE_URL}/og-default.png` }],
    },
  };
}

function Stat({ icon: Icon, value, label }: { icon: typeof Star; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-surface px-1 py-3 text-center shadow-sm ring-1 ring-border">
      <Icon size={16} className="text-brand" />
      <span className="text-sm font-semibold leading-none">{value}</span>
      <span className="text-[11px] leading-tight text-muted">{label}</span>
    </div>
  );
}

function MetaRow({ icon: Icon, label, children }: { icon: typeof Star; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-muted-soft" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export default async function ShopDetailPage({ params }: PageProps<"/shops/[id]">) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) notFound();

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${shop.name}, ${shop.address_text}, ${shop.pincode}`,
  )}`;
  const hours = hoursLabel(shop.opens_at, shop.closes_at, shop.weekly_off);
  const since = monthYear(shop.created_at);

  return (
    <div className="flex flex-1 flex-col gap-6 pb-6">
      <ShopGallery images={shop.images} shopId={shop.id} shopName={shop.name} />

      <div className="flex flex-col gap-6 px-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{shop.name}</h1>
            <Badge variant={shop.is_open ? "success" : "neutral"} className="mt-1 shrink-0">
              <Circle size={7} className="fill-current" strokeWidth={0} />
              {shop.is_open ? "Open now" : "Closed"}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted">{shop.locality ?? shop.address_text}</p>
          {shop.avg_rating != null && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium">
              <Star size={15} className="fill-star text-star" />
              {shop.avg_rating.toFixed(1)}{" "}
              <span className="font-normal text-muted">
                ({shop.review_count} review{shop.review_count === 1 ? "" : "s"})
              </span>
            </p>
          )}
          {shop.description && (
            <p className="mt-3 text-sm leading-relaxed text-muted">{shop.description}</p>
          )}
        </div>

        {/* Getting there and getting through: the two things a customer who has
            decided on a shop actually needs. */}
        <div className="flex gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover"
          >
            <Navigation size={16} /> Navigate
          </a>
          <a
            href={`tel:+91${shop.contact_number}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface py-2.5 text-sm font-medium shadow-sm ring-1 ring-border transition-colors hover:bg-brand-soft/40"
          >
            <Phone size={16} /> Call
          </a>
        </div>

        <ShopActions shopId={shop.id} contactNumber={shop.contact_number} shopName={shop.name} />

        <AskAvailability shopId={shop.id} shopName={shop.name} />

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Overview</h2>
          <div className="grid grid-cols-4 gap-2">
            <Stat icon={Star} value={shop.avg_rating != null ? shop.avg_rating.toFixed(1) : "—"} label="Rating" />
            <Stat icon={Heart} value={String(shop.follower_count)} label="Followers" />
            <Stat icon={Ticket} value={String(shop.redeemed_count)} label="Redeemed" />
            <Stat icon={CalendarDays} value={since} label="On Hylo Hub" />
          </div>
        </section>

        {shop.active_coupons.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Live offers</h2>
            {shop.active_coupons.length === 1 ? (
              <CouponCard coupon={shop.active_coupons[0]} />
            ) : (
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {shop.active_coupons.map((c, i) => (
                  <div key={c.id} className="relative flex w-[86%] shrink-0 snap-start">
                    {i === 0 && (
                      <div className="absolute left-0 top-0 flex h-full w-6 items-center justify-center rounded-l-xl bg-accent">
                        <span className="rotate-180 text-[9px] font-bold uppercase tracking-widest text-accent-foreground [writing-mode:vertical-rl]">
                          Top offer
                        </span>
                      </div>
                    )}
                    <div className={`flex-1 ${i === 0 ? "pl-7" : ""}`}>
                      <CouponCard coupon={c} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Details</h2>
          <div className="divide-y divide-border rounded-2xl bg-surface shadow-sm ring-1 ring-border">
            {shop.categories.length > 0 && (
              <MetaRow icon={Tag} label="Category">
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {shop.categories.map((c) => (
                    <Badge key={c.id} variant="neutral">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              </MetaRow>
            )}
            <MetaRow icon={Clock} label="Hours">
              <span className={shop.is_open ? "text-success" : "text-muted"}>
                {shop.is_open ? "Open now" : "Closed right now"}
              </span>
              {hours && <p className="text-muted">{hours}</p>}
            </MetaRow>
            <MetaRow icon={MapPin} label="Address">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline-offset-2 hover:underline">
                {shop.address_text}, {shop.pincode}
              </a>
            </MetaRow>
            <MetaRow icon={Phone} label="Phone">
              <a href={`tel:+91${shop.contact_number}`} className="text-brand underline-offset-2 hover:underline">
                +91 {shop.contact_number}
              </a>
            </MetaRow>
          </div>
        </section>

        {shop.products.length > 0 && (
          <ShopCatalog products={shop.products} categories={shop.product_categories} />
        )}

        <ShopGalleryGrid images={shop.images} shopName={shop.name} />

        <ReviewSection shopId={shop.id} />
      </div>
    </div>
  );
}
