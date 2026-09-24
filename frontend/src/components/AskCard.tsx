"use client";

import Link from "next/link";
import { Check, Clock, Phone, Store, X } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import type { Ask } from "@/lib/types";

export function AskCard({ ask }: { ask: Ask }) {
  const hydrated = useHydrated();
  const answered = ask.replies.filter((r) => r.status !== "pending");
  const waiting = ask.replies.filter((r) => r.status === "pending");
  const yes = answered.filter((r) => r.status === "available");

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
      <div>
        <p className="font-semibold leading-snug">{ask.text}</p>
        <p className="mt-0.5 text-xs text-muted">
          Asked {hydrated ? timeAgo(ask.created_at) : "recently"} · {ask.replies.length} shop
          {ask.replies.length === 1 ? "" : "s"}
          {answered.length > 0 && ` · ${answered.length} replied`}
        </p>
      </div>

      {answered.map((r) => (
        <div
          key={r.request_id}
          className={`flex flex-col gap-2 rounded-xl p-3 ${
            r.status === "available" ? "bg-success-soft" : "bg-surface-sunken"
          }`}
        >
          <div className="flex items-center gap-2">
            {r.status === "available" ? (
              <Check size={15} className="shrink-0 text-success" />
            ) : (
              <X size={15} className="shrink-0 text-muted" />
            )}
            <Link href={`/shops/${r.shop_id}`} className="min-w-0 flex-1 truncate text-sm font-semibold">
              {r.shop_name}
            </Link>
            <span
              className={`shrink-0 text-xs font-semibold ${
                r.status === "available" ? "text-success-soft-foreground" : "text-muted"
              }`}
            >
              {r.status === "available" ? "Has it" : "Doesn't have it"}
            </span>
          </div>
          {r.owner_note && <p className="text-sm">{r.owner_note}</p>}
          {r.status === "available" && (
            <a
              href={`tel:+91${r.shop_contact_number}`}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Phone size={13} /> Call {r.shop_name}
            </a>
          )}
        </div>
      ))}

      {/* The floor: even with nothing answered, these are shops that exist, are
          open, and can be rung right now. A question that goes unanswered should
          still leave the customer better off than before they asked. */}
      {waiting.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Clock size={12} />
            {yes.length > 0
              ? "Still waiting on"
              : answered.length > 0
                ? "No luck yet — these haven't replied"
                : "No replies yet — you can call them directly"}
          </p>
          <div className="flex flex-col gap-1.5">
            {waiting.map((r) => (
              <div key={r.request_id} className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2">
                <Store size={14} className="shrink-0 text-muted-soft" />
                <Link href={`/shops/${r.shop_id}`} className="min-w-0 flex-1 truncate text-sm">
                  {r.shop_name}
                </Link>
                <span className={`shrink-0 text-[11px] font-medium ${r.shop_is_open ? "text-success" : "text-muted-soft"}`}>
                  {r.shop_is_open ? "Open" : "Closed"}
                </span>
                <a
                  href={`tel:+91${r.shop_contact_number}`}
                  aria-label={`Call ${r.shop_name}`}
                  className="shrink-0 rounded-lg bg-brand-soft p-1.5 text-brand"
                >
                  <Phone size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {ask.replies.length === 0 && (
        <p className="rounded-xl bg-surface-sunken px-3 py-3 text-sm text-muted">
          No shops are listed in this area yet, so there was no one to ask.
        </p>
      )}
    </div>
  );
}
