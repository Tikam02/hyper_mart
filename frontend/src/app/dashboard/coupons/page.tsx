"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ChevronDown, Plus, ScanLine, Ticket } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { timeLeft } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Coupon, DiscountType } from "@/lib/types";

const fieldStyles =
  "w-full rounded-xl bg-background px-3.5 py-3 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand";

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function DashboardCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState({
    title: "",
    discount_type: "percent" as DiscountType,
    discount_value: "",
    valid_to: todayPlus(7),
    max_claims: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemCouponId, setRedeemCouponId] = useState<number | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const [redeemOk, setRedeemOk] = useState(false);

  function loadCoupons() {
    api.get<Coupon[]>("/api/shops/me/coupons").then(setCoupons).catch(() => {});
  }

  useEffect(loadCoupons, []);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/api/shops/me/coupons", {
        title: form.title,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        valid_from: new Date().toISOString(),
        valid_to: new Date(form.valid_to).toISOString(),
        max_claims: form.max_claims ? Number(form.max_claims) : null,
      });
      setForm({ title: "", discount_type: "percent", discount_value: "", valid_to: todayPlus(7), max_claims: "" });
      loadCoupons();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create coupon");
    } finally {
      setSaving(false);
    }
  }

  async function disableCoupon(id: number) {
    await api.patch(`/api/coupons/${id}`, { status: "disabled" });
    loadCoupons();
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!redeemCouponId) return;
    setRedeemMsg(null);
    try {
      await api.post(`/api/coupons/${redeemCouponId}/redeem`, { unique_code: redeemCode.trim().toUpperCase() });
      setRedeemOk(true);
      setRedeemMsg("Redeemed");
      setRedeemCode("");
    } catch (err) {
      setRedeemOk(false);
      setRedeemMsg(err instanceof ApiError ? err.message : "Could not redeem");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleRedeem} className="flex flex-col gap-3 rounded-2xl bg-brand-soft/50 p-4 ring-1 ring-brand/25">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <ScanLine size={16} className="text-brand" /> Redeem a customer&apos;s code
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-40">
            <select
              required
              value={redeemCouponId ?? ""}
              onChange={(e) => setRedeemCouponId(Number(e.target.value))}
              className={`${fieldStyles} appearance-none pr-9 ${redeemCouponId ? "" : "text-foreground/40"}`}
            >
              <option value="">Coupon</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id} className="text-foreground">
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          </div>
          <input
            required
            placeholder="8-char code"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            maxLength={8}
            className={`${fieldStyles} flex-1 font-mono tracking-[0.2em]`}
          />
          <Button type="submit">Redeem</Button>
        </div>
        {redeemMsg && (
          <p className={`inline-flex items-center gap-1.5 text-sm font-medium ${redeemOk ? "text-success" : "text-danger"}`}>
            {redeemOk && <BadgeCheck size={15} />}
            {redeemMsg}
          </p>
        )}
      </form>

      <form onSubmit={createCoupon} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Plus size={16} className="text-brand" /> Create a coupon
        </h2>
        <input
          required
          placeholder="Title, e.g. Diwali Sale"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={fieldStyles}
        />
        <div className="flex gap-2">
          <div className="relative w-28 shrink-0">
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value as DiscountType })}
              className={`${fieldStyles} appearance-none pr-8`}
            >
              <option value="percent">% off</option>
              <option value="flat">₹ off</option>
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          </div>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Value"
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
            className={`${fieldStyles} flex-1`}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground/70">
          Valid until
          <input
            type="datetime-local"
            value={form.valid_to}
            onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
            className={`${fieldStyles} font-normal`}
          />
        </label>
        <input
          type="number"
          min="1"
          placeholder="Max claims (optional)"
          value={form.max_claims}
          onChange={(e) => setForm({ ...form, max_claims: e.target.value })}
          className={fieldStyles}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? "Creating..." : "Create coupon"}
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Your coupons ({coupons.length})</h2>
        {coupons.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Ticket size={24} className="text-foreground/25" />
            <p className="text-sm text-foreground/50">No coupons yet — create your first offer above.</p>
          </div>
        )}
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
            <div className="min-w-0">
              <p className="truncate font-medium">{c.title}</p>
              <p className="mt-0.5 text-xs text-foreground/50">
                <span className="font-mono">{c.code}</span> · {timeLeft(c.valid_to) ?? "Expired"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={c.status === "active" ? "success" : "neutral"}>{c.status}</Badge>
              {c.status === "active" && (
                <button onClick={() => disableCoupon(c.id)} className="text-xs font-medium text-foreground/40 hover:text-danger">
                  Disable
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
