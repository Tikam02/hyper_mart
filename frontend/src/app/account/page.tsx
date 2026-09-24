"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, Smartphone, Store } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { OtpForm } from "@/components/OtpForm";
import { MyQuestions } from "@/components/MyQuestions";
import { Button } from "@/components/ui/Button";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <OtpForm />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Account</h1>
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
          <Smartphone size={20} />
        </div>
        <div>
          <p className="text-xs text-foreground/45">Signed in as</p>
          <p className="font-semibold">+91 {user.phone}</p>
        </div>
      </div>

      {user.role === "shop_owner" ? (
        <Link href="/dashboard">
          <Button className="w-full">
            <LayoutDashboard size={16} /> Go to my shop dashboard
          </Button>
        </Link>
      ) : (
        <Link href="/onboard">
          <Button variant="outline" className="w-full">
            <Store size={16} /> Own a shop? List it free
          </Button>
        </Link>
      )}

      <MyQuestions />

      <button onClick={logout} className="inline-flex items-center justify-center gap-1.5 text-sm text-foreground/50">
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}
