"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { Review } from "@/lib/types";

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= rating ? "fill-star text-star" : "text-border"} />
      ))}
    </div>
  );
}

export function ReviewSection({ shopId }: { shopId: number }) {
  const { requireAuth } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get<Review[]>(`/api/shops/${shopId}/reviews`).then(setReviews).catch(() => {});
  }, [shopId]);

  async function submit() {
    if (!rating) return;
    setBusy(true);
    try {
      await requireAuth();
      const review = await api.put<Review>(`/api/shops/${shopId}/reviews/me`, { rating, text: text || null });
      setReviews((prev) => [review, ...prev.filter((r) => r.id !== review.id)]);
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Reviews {reviews.length > 0 && `(${reviews.length})`}</h2>

      {!submitted && (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}>
                <Star size={24} className={n <= rating ? "fill-star text-star" : "text-border"} />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience (optional)"
            className="rounded-lg bg-background p-2.5 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
            rows={2}
          />
          <Button onClick={submit} disabled={busy || !rating} size="sm" className="self-start">
            {busy ? "Posting..." : "Post review"}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
            <div className="flex items-center justify-between">
              <Stars rating={r.rating} />
              <span className="text-xs text-muted-soft">{timeAgo(r.created_at)}</span>
            </div>
            {r.text && <p className="mt-2 text-sm text-muted">{r.text}</p>}
            {r.shop_reply_text && (
              <p className="mt-2 rounded-lg bg-brand-soft p-2.5 text-sm text-brand-soft-foreground">
                <span className="font-medium">Shop reply: </span>
                {r.shop_reply_text}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
