"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon, SearchX } from "lucide-react";
import { usePincode } from "@/lib/pincode-context";
import { PincodePicker } from "@/components/PincodePicker";
import { ShopCard } from "@/components/ShopCard";
import { api } from "@/lib/api";
import type { ShopPublic } from "@/lib/types";

export default function SearchPage() {
  const { pincode } = usePincode();
  const [query, setQuery] = useState("");
  const [shops, setShops] = useState<ShopPublic[] | null>(null);

  useEffect(() => {
    if (!pincode) return;
    const handle = setTimeout(() => {
      const qs = new URLSearchParams({ pincode: pincode.pincode, ...(query.trim() ? { q: query.trim() } : {}) });
      api
        .get<ShopPublic[]>(`/api/shops?${qs}`)
        .then(setShops)
        .catch(() => setShops([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [pincode, query]);

  if (!pincode) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Set your location first</h1>
        <PincodePicker />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-bold tracking-tight">Shops in {pincode.locality}</h1>
      <div className="relative">
        <SearchIcon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-soft" />
        <input
          type="text"
          placeholder="Search shop, category or product"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl bg-surface py-3 pl-10 pr-3 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {shops === null && (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-border">
              <div className="aspect-[16/10] w-full animate-pulse bg-brand-soft/60" />
              <div className="h-[58px] animate-pulse bg-surface" />
            </div>
          ))}
        </div>
      )}
      {shops !== null && shops.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <SearchX size={26} className="text-muted-soft" />
          <p className="text-sm text-muted">No shops found. Try a different search.</p>
        </div>
      )}
      <div className="flex flex-col gap-4">
        {shops?.map((s) => (
          <ShopCard key={s.id} shop={s} />
        ))}
      </div>
    </div>
  );
}
