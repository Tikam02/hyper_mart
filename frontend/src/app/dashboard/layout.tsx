"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageCircleQuestion, Package, Ticket, UserRound } from "lucide-react";
import { DashboardShopProvider } from "./shop-context";

const TABS = [
  { href: "/dashboard", label: "Shop", icon: LayoutGrid },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/coupons", label: "Offers", icon: Ticket },
  { href: "/dashboard/requests", label: "Questions", icon: MessageCircleQuestion },
  { href: "/dashboard/account", label: "Account", icon: UserRound },
];

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const pathname = usePathname();

  return (
    <DashboardShopProvider>
      <div className="flex flex-1 flex-col">
        <nav className="flex bg-surface shadow-sm">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium ${
                  active ? "border-b-2 border-brand text-brand" : "border-b-2 border-transparent text-foreground/50"
                }`}
              >
                <tab.icon size={18} strokeWidth={active ? 2.5 : 2} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 px-4 py-5">{children}</div>
      </div>
    </DashboardShopProvider>
  );
}
