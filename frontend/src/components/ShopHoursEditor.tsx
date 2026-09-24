"use client";

import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { WEEKDAYS } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { Shop } from "@/lib/types";

const fieldStyles =
  "w-full rounded-xl bg-background px-3.5 py-3 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand";

/** "09:00:00" -> "09:00" for <input type="time">, which rejects seconds. */
function toInputTime(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

export function ShopHoursEditor({ shop, onSaved }: { shop: Shop; onSaved: () => Promise<void> | void }) {
  const [opensAt, setOpensAt] = useState(toInputTime(shop.opens_at));
  const [closesAt, setClosesAt] = useState(toInputTime(shop.closes_at));
  const [weeklyOff, setWeeklyOff] = useState(shop.weekly_off == null ? "" : String(shop.weekly_off));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bothOrNeither = Boolean(opensAt) === Boolean(closesAt);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!bothOrNeither) {
      setError("Set both an opening and a closing time, or leave both blank.");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/api/shops/me", {
        opens_at: opensAt ? `${opensAt}:00` : null,
        closes_at: closesAt ? `${closesAt}:00` : null,
        weekly_off: weeklyOff === "" ? null : Number(weeklyOff),
      });
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save timings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1.5 font-semibold">
        <Clock size={16} className="text-brand" /> Shop timings
      </h2>
      <p className="-mt-2 text-sm text-foreground/50">
        Set these once and customers see Open or Closed automatically — you don&apos;t have to switch
        anything on and off each day.
      </p>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-foreground/70">
          Opens
          <input type="time" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={fieldStyles} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-foreground/70">
          Closes
          <input type="time" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={fieldStyles} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground/70">
        Weekly off
        <select value={weeklyOff} onChange={(e) => setWeeklyOff(e.target.value)} className={fieldStyles}>
          <option value="">No weekly off</option>
          {WEEKDAYS.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={saving} size="sm" className="self-start">
        {saved && !saving && <Check size={14} />}
        {saving ? "Saving..." : saved ? "Saved" : "Save timings"}
      </Button>
    </form>
  );
}
