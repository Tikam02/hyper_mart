"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, MessageCircleQuestion } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { ProductRequest } from "@/lib/types";

export function MyQuestions() {
  const [requests, setRequests] = useState<ProductRequest[] | null>(null);

  useEffect(() => {
    api
      .get<ProductRequest[]>("/api/me/requests")
      .then(setRequests)
      .catch(() => setRequests([]));
  }, []);

  if (requests === null || requests.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1.5 font-semibold">
        <MessageCircleQuestion size={16} className="text-brand" /> Your questions
      </h2>
      {requests.map((r) => (
        <div key={r.id} className="flex flex-col gap-1.5 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/shops/${r.shop_id}`} className="min-w-0 text-sm font-medium text-muted hover:text-foreground">
              <span className="truncate">{r.shop_name}</span>
            </Link>
            {r.status === "pending" ? (
              <Badge variant="neutral" className="shrink-0">
                <Clock size={11} /> Waiting
              </Badge>
            ) : (
              <Badge variant={r.status === "available" ? "success" : "danger"} className="shrink-0">
                {r.status === "available" ? "Available" : "Not available"}
              </Badge>
            )}
          </div>
          <p className="text-sm">{r.text}</p>
          {r.owner_note && (
            <p className="rounded-xl bg-brand-soft/50 px-3 py-2 text-sm text-brand-soft-foreground">
              {r.shop_name}: {r.owner_note}
            </p>
          )}
          <p className="text-xs text-muted-soft">Asked {timeAgo(r.created_at)}</p>
        </div>
      ))}
    </section>
  );
}
