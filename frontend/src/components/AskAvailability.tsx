"use client";

import { useState } from "react";
import { Check, MessageCircleQuestion, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { ProductRequest } from "@/lib/types";

export function AskAvailability({ shopId, shopName }: { shopId: number; shopName: string }) {
  const { requireAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await requireAuth();
      await api.post<ProductRequest>(`/api/shops/${shopId}/requests`, { text });
      setSent(true);
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send, try again");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl bg-success-soft p-4">
        <Check size={18} className="mt-0.5 shrink-0 text-success" />
        <div>
          <p className="text-sm font-medium text-success">Question sent to {shopName}</p>
          <p className="mt-0.5 text-xs text-success/80">
            You&apos;ll see their answer under Questions in your account.
          </p>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="border-border text-muted">
        <MessageCircleQuestion size={16} /> Ask if something&apos;s available
      </Button>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-2.5 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
      <label htmlFor="ask-text" className="text-sm font-medium">
        What are you looking for?
      </label>
      <p className="-mt-1.5 text-xs text-muted">
        Save yourself the trip — {shopName} gets your question and replies whether they have it.
      </p>
      <input
        id="ask-text"
        autoFocus
        type="text"
        maxLength={300}
        placeholder="e.g. Aashirvaad atta 10kg"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="rounded-xl bg-background px-3.5 py-2.5 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || !text.trim()}>
          <Send size={14} /> {busy ? "Sending..." : "Send"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="text-muted"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
