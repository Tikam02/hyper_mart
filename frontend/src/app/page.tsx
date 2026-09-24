"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Circle, MapPin, Sparkles, Store, Tag } from "lucide-react";
import { usePincode } from "@/lib/pincode-context";
import { useAuth } from "@/lib/auth-context";
import { PincodePicker } from "@/components/PincodePicker";
import { AskMarketBox } from "@/components/AskMarketBox";
import { AskCard } from "@/components/AskCard";
import { CouponCard } from "@/components/CouponCard";
import { api } from "@/lib/api";
import { placeLabel } from "@/lib/format";
import type { Ask, CouponFeedItem, PincodeInfo, ShopPublic, TrendingAsk } from "@/lib/types";

export default function HomePage() {
  const { pincode } = usePincode();
  const [changingLocation, setChangingLocation] = useState(false);

  if (!pincode || changingLocation) {
    return (
      <div className="flex flex-1 flex-col gap-5 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Where should we look?</h1>
          <p className="mt-1 text-sm text-muted">Find shops, ask what&apos;s in stock, and see offers near you.</p>
        </div>
        <PincodePicker onDone={() => setChangingLocation(false)} />
        <Link href="/onboard" className="inline-flex items-center justify-center gap-1.5 self-center text-sm text-muted">
          <Store size={15} /> Own a shop instead? <span className="font-semibold text-brand">List it free</span>
        </Link>
      </div>
    );
  }

  return <HomeFeed pincode={pincode} onChangeLocation={() => setChangingLocation(true)} key={pincode.pincode} />;
}

function HomeFeed({ pincode, onChangeLocation }: { pincode: PincodeInfo; onChangeLocation: () => void }) {
  const { user } = useAuth();
  const [asks, setAsks] = useState<Ask[]>([]);

  useEffect(() => {
    // Early return rather than clearing state here: a synchronous setState in
    // an effect body cascades an extra render, and signing out is handled by
    // deriving the visible list below instead.
    if (!user) return;
    let cancelled = false;
    api
      .get<Ask[]>("/api/me/asks")
      .then((rows) => {
        if (!cancelled) setAsks(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visibleAsks = user ? asks : [];

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onChangeLocation} className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
          <MapPin size={15} className="shrink-0 text-brand" />
          <span className="truncate">{placeLabel(pincode)}</span>
          <span className="shrink-0 font-medium text-brand underline underline-offset-2">Change</span>
        </button>
        <Link href="/onboard" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-brand">
          <Store size={15} /> List shop
        </Link>
      </div>

      <AskMarketBox pincode={pincode.pincode} onAsked={(ask) => setAsks((prev) => [ask, ...prev])} />

      {/* Above everything else on purpose: someone reopening the app is usually
          here to see whether a shop replied. */}
      {visibleAsks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold tracking-tight">Your questions</h2>
          {visibleAsks.slice(0, 3).map((ask) => (
            <AskCard key={ask.id} ask={ask} />
          ))}
        </section>
      )}

      <OpenNowStrip pincode={pincode} />
      <OffersSection pincode={pincode} />
      <TrendingAsks pincode={pincode} />

      <Link
        href="/onboard"
        className="flex items-center justify-center gap-2 rounded-2xl bg-surface p-4 text-center text-sm text-muted shadow-sm ring-1 ring-border"
      >
        <Store size={16} className="text-brand" />
        Own a shop? <span className="font-semibold text-brand">List it free</span>
      </Link>
    </div>
  );
}

function OpenNowStrip({ pincode }: { pincode: PincodeInfo }) {
  const [shops, setShops] = useState<ShopPublic[] | null>(null);

  useEffect(() => {
    api
      .get<ShopPublic[]>(`/api/shops?pincode=${encodeURIComponent(pincode.pincode)}`)
      .then(setShops)
      .catch(() => setShops([]));
  }, [pincode.pincode]);

  const open = shops?.filter((s) => s.is_open) ?? [];
  if (shops === null || open.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-base font-bold tracking-tight">
          <Circle size={9} className="fill-success text-success" strokeWidth={0} /> Open right now
        </h2>
        <Link href="/search" className="inline-flex items-center text-sm font-medium text-brand">
          All shops <ChevronRight size={15} />
        </Link>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {open.map((s) => (
          <Link
            key={s.id}
            href={`/shops/${s.id}`}
            className="flex w-36 shrink-0 flex-col gap-1 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border"
          >
            <Store size={16} className="text-brand" />
            <span className="truncate text-sm font-semibold">{s.name}</span>
            <span className="truncate text-xs text-muted">{s.locality ?? s.address_text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function OffersSection({ pincode }: { pincode: PincodeInfo }) {
  const [coupons, setCoupons] = useState<CouponFeedItem[] | null>(null);

  useEffect(() => {
    api
      .get<CouponFeedItem[]>(`/api/coupons/feed?pincode=${encodeURIComponent(pincode.pincode)}`)
      .then(setCoupons)
      .catch(() => setCoupons([]));
  }, [pincode.pincode]);

  // Offers are genuinely occasional in a small town, so an empty offers list is
  // the normal case rather than an error worth a big empty state.
  if (coupons === null || coupons.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1.5 text-base font-bold tracking-tight">
        <Sparkles size={17} className="text-accent" /> Today&apos;s offers
      </h2>
      {coupons.map((c) => (
        <CouponCard key={c.id} coupon={c} />
      ))}
    </section>
  );
}

function TrendingAsks({ pincode }: { pincode: PincodeInfo }) {
  const [terms, setTerms] = useState<TrendingAsk[]>([]);

  useEffect(() => {
    api
      .get<TrendingAsk[]>(`/api/asks/nearby/trending?pincode=${encodeURIComponent(pincode.pincode)}`)
      .then(setTerms)
      .catch(() => setTerms([]));
  }, [pincode.pincode]);

  // Stays hidden until several different people have asked for the same thing.
  // Empty is the correct early state — see the privacy note on the endpoint.
  if (terms.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 text-base font-bold tracking-tight">
        <Tag size={16} className="text-brand" /> People here are asking for
      </h2>
      <div className="flex flex-wrap gap-2">
        {terms.map((t) => (
          <span key={t.text} className="rounded-full bg-surface px-3 py-1.5 text-sm shadow-sm ring-1 ring-border">
            {t.text}
            <span className="ml-1.5 text-xs text-muted">{t.asker_count}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
