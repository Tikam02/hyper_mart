"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, ExternalLink, Store, Tag } from "lucide-react";
import { useShop } from "./shop-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ShopPhotosEditor } from "@/components/ShopPhotosEditor";
import { ShopHoursEditor } from "@/components/ShopHoursEditor";
import { WEEKDAYS, formatTime, hoursLabel } from "@/lib/format";
import type { Category } from "@/lib/types";

export default function DashboardOverviewPage() {
  const { shop, refresh } = useShop();
  const hasHours = Boolean(shop.opens_at && shop.closes_at);
  const hours = hoursLabel(shop.opens_at, shop.closes_at, shop.weekly_off);
  // Spelling out *why* the shop reads as closed is what makes the override
  // feel responsive: outside trading hours the pill stays "Closed" whichever
  // way the switch is set, so without this line tapping it looks like a no-op.
  const statusLine = shop.is_open_now
    ? "Open to customers"
    : shop.closed_reason === "temporarily_closed"
      ? "You've marked the shop temporarily closed"
      : shop.closed_reason === "weekly_off"
        ? `Closed — ${shop.weekly_off != null ? WEEKDAYS[shop.weekly_off] : "today"} is your weekly off`
        : shop.closed_reason === "outside_hours"
          ? `Closed — outside your timings${formatTime(shop.opens_at) ? `, opens ${formatTime(shop.opens_at)}` : ""}`
          : "Closed to customers";
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({
    name: shop.name,
    address_text: shop.address_text,
    pincode: shop.pincode,
    contact_number: shop.contact_number,
    gst_number: shop.gst_number ?? "",
    description: shop.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<Category[]>("/api/categories").then(setCategories).catch(() => {});
    api
      .get<number[]>("/api/shops/me/categories")
      .then((ids) => setSelected(new Set(ids)))
      .catch(() => {});
  }, []);

  async function toggleOpen() {
    setTogglingOpen(true);
    try {
      await api.patch("/api/shops/me", { is_open: !shop.is_open });
      await refresh();
    } finally {
      setTogglingOpen(false);
    }
  }

  async function toggleCategory(id: number) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
    await api.put("/api/shops/me/categories", { category_ids: Array.from(next) });
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.patch("/api/shops/me", {
        ...form,
        gst_number: form.gst_number || null,
        description: form.description || null,
      });
      await refresh();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
            <Store size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{shop.name}</p>
            <p className="text-sm text-foreground/50">{statusLine}</p>
            {hours && <p className="truncate text-xs text-foreground/40">{hours}</p>}
          </div>
          {/* With timings set the pill only reports what customers see — the
              clock decides it, so making it a switch would be a lie. */}
          {hasHours ? (
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${
                shop.is_open_now ? "bg-success-soft text-success" : "bg-foreground/10 text-foreground/55"
              }`}
            >
              <Circle size={8} className="fill-current" strokeWidth={0} />
              {shop.is_open_now ? "Open" : "Closed"}
            </span>
          ) : (
            <button
              onClick={toggleOpen}
              disabled={togglingOpen}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                shop.is_open ? "bg-success-soft text-success" : "bg-foreground/10 text-foreground/55"
              }`}
            >
              <Circle size={8} className="fill-current" strokeWidth={0} />
              {shop.is_open ? "Open" : "Closed"}
            </button>
          )}
        </div>

        {hasHours && (
          <button
            onClick={toggleOpen}
            disabled={togglingOpen}
            className={`mt-3 w-full rounded-xl py-2.5 text-sm font-medium transition-colors ${
              shop.is_open
                ? "bg-background text-foreground/60 ring-1 ring-border hover:text-danger"
                : "bg-success-soft text-success"
            }`}
          >
            {shop.is_open ? "Temporarily mark closed" : "Cancel temporary close"}
          </button>
        )}
      </div>

      <Link href={`/shops/${shop.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
        View your public shop page <ExternalLink size={13} />
      </Link>

      <div>
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Tag size={16} className="text-brand" /> What kind of shop are you?
        </h2>
        <p className="mb-2.5 mt-1 text-sm text-foreground/50">
          How customers find you when browsing. Your catalog&apos;s own sections are set on the Products tab.
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium shadow-sm transition-colors ${
                selected.has(c.id) ? "bg-brand text-brand-foreground" : "bg-surface text-foreground/60 ring-1 ring-border"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <ShopHoursEditor shop={shop} onSaved={refresh} />

      <ShopPhotosEditor />

      <form onSubmit={saveDetails} className="flex flex-col gap-3">
        <h2 className="font-semibold">Shop details</h2>
        <LabeledInput label="Shop name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground/70">
          About your shop
          <textarea
            value={form.description}
            maxLength={1000}
            rows={3}
            placeholder="What do you sell? What are you known for?"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="resize-none rounded-xl bg-surface px-3.5 py-3 font-normal text-foreground shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <LabeledInput label="Address" value={form.address_text} onChange={(v) => setForm({ ...form, address_text: v })} />
        <LabeledInput
          label="Pincode"
          value={form.pincode}
          onChange={(v) => setForm({ ...form, pincode: v.replace(/\D/g, "") })}
          maxLength={6}
        />
        <LabeledInput
          label="Contact number"
          value={form.contact_number}
          onChange={(v) => setForm({ ...form, contact_number: v.replace(/\D/g, "") })}
          maxLength={10}
        />
        <LabeledInput label="GST number" value={form.gst_number} onChange={(v) => setForm({ ...form, gst_number: v.toUpperCase() })} />
        <Button type="submit" disabled={saving} size="sm" className="self-start">
          {saved && !saving && <Check size={14} />}
          {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground/70">
      {label}
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl bg-surface px-3.5 py-3 font-normal text-foreground shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
      />
    </label>
  );
}
