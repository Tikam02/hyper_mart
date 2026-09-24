"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, PartyPopper, Search, Sparkles, Store } from "lucide-react";
import { usePincode } from "@/lib/pincode-context";
import { PincodePicker } from "@/components/PincodePicker";
import { CouponCard } from "@/components/CouponCard";
import { api } from "@/lib/api";
import { placeLabel } from "@/lib/format";
import type { CouponFeedItem, PincodeInfo } from "@/lib/types";

export default function HomePage() {
  const { pincode } = usePincode();
  const [changingLocation, setChangingLocation] = useState(false);

  if (!pincode || changingLocation) {
    return (
      <div className="flex flex-1 flex-col gap-5 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Where should we look?</h1>
          <p className="mt-1 text-sm text-foreground/55">Find sales and offers from shops near you.</p>
        </div>
        <PincodePicker onDone={() => setChangingLocation(false)} />
        <Link href="/onboard" className="inline-flex items-center justify-center gap-1.5 self-center text-sm text-foreground/55">
          <Store size={15} /> Own a shop instead? <span className="font-semibold text-brand">List it free</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setChangingLocation(true)} className="flex min-w-0 items-center gap-1.5 text-sm text-foreground/60">
          <MapPin size={15} className="shrink-0 text-brand" />
          <span className="truncate">{placeLabel(pincode)}</span>
          <span className="shrink-0 font-medium text-brand underline underline-offset-2">Change</span>
        </button>
        <Link href="/onboard" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-brand">
          <Store size={15} /> List shop
        </Link>
      </div>

      <h1 className="flex items-center gap-1.5 text-lg font-bold tracking-tight">
        <Sparkles size={18} className="text-brand" /> Today&apos;s offers near you
      </h1>

      <CouponFeed pincode={pincode} key={pincode.pincode} />

      <Link
        href="/onboard"
        className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-surface p-4 text-center text-sm text-foreground/60 shadow-sm ring-1 ring-border"
      >
        <Store size={16} className="text-brand" />
        Own a shop? <span className="font-semibold text-brand">List it free</span>
      </Link>
    </div>
  );
}

function CouponFeed({ pincode }: { pincode: PincodeInfo }) {
  const [coupons, setCoupons] = useState<CouponFeedItem[] | null>(null);

  useEffect(() => {
    api
      .get<CouponFeedItem[]>(`/api/coupons/feed?pincode=${encodeURIComponent(pincode.pincode)}`)
      .then(setCoupons)
      .catch(() => setCoupons([]));
  }, [pincode.pincode]);

  if (coupons === null) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface shadow-sm ring-1 ring-border" />
        ))}
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface py-12 text-center shadow-sm ring-1 ring-border">
        <PartyPopper size={28} className="text-brand" />
        <p className="text-sm text-foreground/55">No active offers in {pincode.locality} yet.</p>
        <Link href="/search" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
          <Search size={14} /> Browse all shops here instead
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {coupons.map((c) => (
        <CouponCard key={c.id} coupon={c} />
      ))}
    </div>
  );
}
