"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Shop } from "@/lib/types";

interface ShopContextValue {
  shop: Shop;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function DashboardShopProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const mine = await api.get<Shop>("/api/shops/me");
      setShop(mine);
    } catch {
      setShop(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/onboard");
      return;
    }
    api
      .get<Shop>("/api/shops/me")
      .then(setShop)
      .catch(() => setShop(null))
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!loading && !authLoading && user && !shop) {
      router.replace("/onboard");
    }
  }, [loading, authLoading, user, shop, router]);

  if (authLoading || loading || !shop) return null;

  return <ShopContext.Provider value={{ shop, loading, refresh }}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within DashboardShopProvider");
  return ctx;
}
