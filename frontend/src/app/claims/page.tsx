"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Ticket } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { OtpForm } from "@/components/OtpForm";
import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/format";
import type { CouponClaim } from "@/lib/types";

export default function ClaimsPage() {
  const { user, loading } = useAuth();
  const [claims, setClaims] = useState<CouponClaim[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<CouponClaim[]>("/api/me/claims").then(setClaims).catch(() => setClaims([]));
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">My Coupons</h1>
        <p className="text-sm text-foreground/55">Verify your number to see coupons you&apos;ve claimed.</p>
        <OtpForm />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-bold tracking-tight">My Coupons</h1>
      {claims === null && (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface shadow-sm ring-1 ring-border" />
          ))}
        </div>
      )}
      {claims !== null && claims.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Ticket size={26} className="text-foreground/30" />
          <p className="text-sm text-foreground/50">No coupons claimed yet — go find an offer!</p>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {claims?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
            <div>
              <p className="font-mono text-lg font-bold tracking-widest">{c.unique_code}</p>
              <p className="text-xs text-foreground/45">Claimed {timeAgo(c.claimed_at)}</p>
            </div>
            <Badge variant={c.status === "redeemed" ? "success" : "brand"}>
              {c.status === "redeemed" && <CheckCircle2 size={12} />}
              {c.status === "redeemed" ? "Redeemed" : "Show at shop"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
