"use client";

import Link from "next/link";
import { useState } from "react";
import { Circle, Clock, Ticket, Timer } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { dayMonth, formatDiscount, timeAgo, timeLeft } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Coupon, CouponClaim, CouponFeedItem } from "@/lib/types";

export function CouponCard({ coupon }: { coupon: CouponFeedItem | Coupon }) {
  const { requireAuth } = useAuth();
  const [claim, setClaim] = useState<CouponClaim | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shopName = "shop_name" in coupon ? coupon.shop_name : undefined;
  const shopIsOpen = "shop_is_open" in coupon ? coupon.shop_is_open : undefined;
  // Clock-derived strings only after hydration — see useHydrated.
  const hydrated = useHydrated();
  const left = hydrated ? timeLeft(coupon.valid_to) : null;

  async function handleClaim() {
    setError(null);
    setBusy(true);
    try {
      await requireAuth();
      const result = await api.post<CouponClaim>(`/api/coupons/${coupon.id}/claim`);
      setClaim(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not claim, try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {shopName && (
            <Link href={`/shops/${coupon.shop_id}`} className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
              <span className="truncate">{shopName}</span>
              {shopIsOpen !== undefined && (
                <span className={`inline-flex shrink-0 items-center gap-1 text-xs ${shopIsOpen ? "text-success" : "text-muted-soft"}`}>
                  <Circle size={7} className="fill-current" strokeWidth={0} />
                  {shopIsOpen ? "Open now" : "Closed"}
                </span>
              )}
            </Link>
          )}
          <h3 className="mt-0.5 text-base font-semibold leading-snug">{coupon.title}</h3>
        </div>
        <Badge variant="accent" className="shrink-0 text-sm">
          {formatDiscount(coupon.discount_type, coupon.discount_value)}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock size={13} /> Posted {hydrated ? timeAgo(coupon.created_at) : dayMonth(coupon.created_at)}
        </span>
        {left && (
          <span className="inline-flex items-center gap-1 font-medium text-accent">
            <Timer size={13} /> {left}
          </span>
        )}
      </div>

      {claim ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-accent-soft py-3 text-center">
          <div>
            <p className="text-xs text-accent-soft-foreground/80">Show this code at the shop</p>
            <p className="font-mono text-xl font-bold tracking-widest text-accent-soft-foreground">{claim.unique_code}</p>
          </div>
        </div>
      ) : (
        <Button variant="accent-outline" onClick={handleClaim} disabled={busy}>
          <Ticket size={16} />
          {busy ? "Claiming..." : "Claim offer"}
        </Button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
