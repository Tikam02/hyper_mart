"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { OtpForm } from "@/components/OtpForm";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import type { Shop } from "@/lib/types";

export default function OnboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [shopStatus, setShopStatus] = useState<"pending" | "none" | "exists">("pending");

  const [form, setForm] = useState({ name: "", owner_name: "", address_text: "", pincode: "", contact_number: "", gst_number: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get<Shop>("/api/shops/me")
      .then(() => {
        setShopStatus("exists");
        router.replace("/dashboard");
      })
      .catch(() => setShopStatus("none"));
  }, [user, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const contact_number = form.contact_number || user?.phone || "";
      await api.post<Shop>("/api/shops/me", { ...form, contact_number, gst_number: form.gst_number || null });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create shop, try again");
    } finally {
      setBusy(false);
    }
  }

  const checkingShop = Boolean(user) && shopStatus === "pending";
  if (loading || checkingShop || shopStatus === "exists") return null;

  if (!user) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">List your shop, free</h1>
          <p className="mt-1 text-sm text-foreground/55">Takes under 5 minutes. Verify your number to start.</p>
        </div>
        <OtpForm />
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-1 flex-col gap-3 px-4 py-8">
      <div className="mb-1 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
          <Store size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tell us about your shop</h1>
          <p className="text-sm text-foreground/55">Add photos, products and offers next.</p>
        </div>
      </div>

      <Field label="Shop name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
      <Field label="Owner name" value={form.owner_name} onChange={(v) => setForm({ ...form, owner_name: v })} required />
      <Field label="Address" value={form.address_text} onChange={(v) => setForm({ ...form, address_text: v })} required />
      <Field
        label="Pincode"
        value={form.pincode}
        onChange={(v) => setForm({ ...form, pincode: v.replace(/\D/g, "") })}
        required
        maxLength={6}
      />
      <Field
        label="Contact number"
        value={form.contact_number || user?.phone || ""}
        onChange={(v) => setForm({ ...form, contact_number: v.replace(/\D/g, "") })}
        required
        maxLength={10}
      />
      <Field
        label="GST number (optional, helps build trust)"
        value={form.gst_number}
        onChange={(v) => setForm({ ...form, gst_number: v.toUpperCase() })}
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy} className="mt-2">
        {busy ? "Creating..." : "Create my shop"}
      </Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground/70">
      {label}
      <input
        type="text"
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl bg-surface px-3.5 py-3 font-normal text-foreground shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
      />
    </label>
  );
}
