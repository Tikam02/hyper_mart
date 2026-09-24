"use client";

import { useState } from "react";
import { PackageX } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { ProductCategory, Product } from "@/lib/types";

const ALL = -1;

export function ShopCatalog({ products, categories }: { products: Product[]; categories: ProductCategory[] }) {
  const [active, setActive] = useState(ALL);

  // Only offer a tab where the shop actually has stock, so tapping a tab can
  // never land on an empty grid.
  const usedCategories = categories.filter((c) => products.some((p) => p.category_id === c.id));
  const shown = active === ALL ? products : products.filter((p) => p.category_id === active);
  const tabs = usedCategories.length > 1 ? [{ id: ALL, name: "All" }, ...usedCategories] : [];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Catalog</h2>

      {tabs.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active === t.id
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "bg-surface text-muted ring-1 ring-border"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {shown.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border">
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(p.image_url)} alt={p.name} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-brand-soft/50">
                <PackageX size={24} className="text-brand-soft-foreground/40" />
              </div>
            )}
            <div className="p-3">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="text-sm text-muted">{formatPrice(p.price)}</p>
              {!p.in_stock && (
                <Badge variant="danger" className="mt-1">
                  Out of stock
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
