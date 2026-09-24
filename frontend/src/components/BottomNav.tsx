"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Store, Ticket, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/claims", label: "Coupons", icon: Ticket },
  { href: "/account", label: "Account", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboard")) return null;

  return (
    <nav className="sticky bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur">
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.href === "/account" && user?.role === "shop_owner" ? Store : item.icon;
        const label = item.href === "/account" && user?.role === "shop_owner" ? "Shop" : item.label;
        return (
          <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center gap-1 py-3 text-xs">
            <Icon size={20} strokeWidth={active ? 2.5 : 2} className={active ? "text-brand" : "text-foreground/45"} />
            <span className={active ? "font-medium text-brand" : "text-foreground/45"}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
