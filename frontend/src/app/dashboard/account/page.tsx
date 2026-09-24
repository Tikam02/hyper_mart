"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, LogOut, Mail, Smartphone, Store } from "lucide-react";
import { useShop } from "../shop-context";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { User } from "@/lib/types";

export default function DashboardAccountPage() {
  const { shop } = useShop();
  const { user, logout, refresh } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.patch<User>("/api/auth/me", { email: email || null });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save, try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    // Hard navigation, not router.replace: clearing the user would otherwise race
    // the dashboard provider's own "no user -> /onboard" redirect, and a full
    // reload drops any client state left over from the signed-in session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
          <Smartphone size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-foreground/45">Signed in as</p>
          <p className="font-semibold">+91 {user?.phone}</p>
        </div>
      </div>

      <form onSubmit={saveProfile} className="flex flex-col gap-3">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Mail size={16} className="text-brand" /> Contact email
        </h2>
        <p className="-mt-2 text-sm text-foreground/50">
          Optional. We&apos;ll use it for receipts and account recovery — your mobile number stays your login.
        </p>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl bg-surface px-3.5 py-3 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={saving} size="sm" className="self-start">
          {saved && !saving && <Check size={14} />}
          {saving ? "Saving..." : saved ? "Saved" : "Save email"}
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Store size={16} className="text-brand" /> Your shop
        </h2>
        <Link
          href={`/shops/${shop.id}`}
          target="_blank"
          className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{shop.name}</p>
            <p className="text-xs text-foreground/45">View public page</p>
          </div>
          <ExternalLink size={16} className="shrink-0 text-foreground/35" />
        </Link>
        <Link href="/" className="rounded-2xl bg-surface p-4 text-center text-sm font-medium text-foreground/60 shadow-sm ring-1 ring-border">
          Browse offers as a customer
        </Link>
      </div>

      <Button variant="outline" onClick={handleLogout} className="border-danger text-danger hover:bg-red-50">
        <LogOut size={16} /> Sign out
      </Button>
    </div>
  );
}
