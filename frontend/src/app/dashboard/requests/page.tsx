"use client";

import { useEffect, useState } from "react";
import { Check, Inbox, MessageCircleQuestion, Phone, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { RequestStatus, ShopProductRequest } from "@/lib/types";

export default function DashboardRequestsPage() {
  const [requests, setRequests] = useState<ShopProductRequest[] | null>(null);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<ShopProductRequest[]>("/api/shops/me/requests")
      .then(setRequests)
      .catch(() => setRequests([]));
  }

  useEffect(load, []);

  async function respond(id: number, status: RequestStatus) {
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/api/requests/${id}`, { status, owner_note: note || null });
      setReplyingId(null);
      setNote("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send your reply");
    } finally {
      setBusy(false);
    }
  }

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const answered = requests?.filter((r) => r.status !== "pending") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-1.5 font-semibold">
          <MessageCircleQuestion size={16} className="text-brand" /> Customer questions
        </h2>
        <p className="mt-1 text-sm text-foreground/50">
          People asking whether you stock something. Answering fast is the whole point — they&apos;re deciding
          whether to walk over.
        </p>
      </div>

      {requests === null && (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface shadow-sm ring-1 ring-border" />
          ))}
        </div>
      )}

      {requests?.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Inbox size={26} className="text-foreground/25" />
          <p className="text-sm text-foreground/50">No questions yet.</p>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground/60">
            Waiting for you ({pending.length})
          </h3>
          {pending.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-brand/30">
              <div>
                <p className="font-medium">{r.text}</p>
                <p className="mt-0.5 text-xs text-foreground/45">Asked {timeAgo(r.created_at)}</p>
              </div>

              <a
                href={`tel:+91${r.customer_phone}`}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand"
              >
                <Phone size={14} /> +91 {r.customer_phone}
              </a>

              {replyingId === r.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    type="text"
                    maxLength={300}
                    placeholder="Add a note (optional) — e.g. ₹520, or coming Friday"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="rounded-xl bg-background px-3.5 py-2.5 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy} onClick={() => respond(r.id, "available")}>
                      <Check size={14} /> Yes, available
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => respond(r.id, "unavailable")}
                      className="border-border text-foreground/60"
                    >
                      <X size={14} /> Not available
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    setReplyingId(r.id);
                    setNote("");
                  }}
                >
                  Reply
                </Button>
              )}
            </div>
          ))}
        </section>
      )}

      {answered.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground/60">Answered</h3>
          {answered.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm">{r.text}</p>
                <Badge variant={r.status === "available" ? "success" : "neutral"} className="shrink-0">
                  {r.status === "available" ? "Available" : "Not available"}
                </Badge>
              </div>
              {r.owner_note && <p className="text-sm text-foreground/55">You said: {r.owner_note}</p>}
              <p className="text-xs text-foreground/40">
                +91 {r.customer_phone} · answered {r.responded_at ? timeAgo(r.responded_at) : ""}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
