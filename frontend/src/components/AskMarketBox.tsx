"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Ask } from "@/lib/types";

/**
 * The app's front door: one box that puts a question to every nearby shop.
 *
 * Deliberately not a category picker or a filtered search. The customer's
 * problem is "who around here has this" — they usually can't classify it
 * themselves, and every step added here is a step at which they give up and
 * ride to three shops instead.
 */
export function AskMarketBox({ pincode, onAsked }: { pincode: string; onAsked: (ask: Ask) => void }) {
  const { requireAuth } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await requireAuth();
      const ask = await api.post<Ask>("/api/asks", { text, pincode });
      setText("");
      onAsked(ask);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send, try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
      <label htmlFor="ask-market" className="text-base font-bold tracking-tight">
        Looking for something?
      </label>
      <p className="-mt-1 text-sm text-muted">
        Ask every shop nearby at once. Save yourself the trip.
      </p>
      <div className="mt-1 flex gap-2">
        <input
          id="ask-market"
          type="text"
          maxLength={300}
          placeholder="e.g. Aashirvaad atta 10kg"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-background px-3.5 py-3 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          aria-label="Ask nearby shops"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Ask
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
