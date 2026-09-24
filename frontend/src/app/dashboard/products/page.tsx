"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ImagePlus, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, ApiError, mediaUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { ProductCategoryManager } from "@/components/ProductCategoryManager";
import type { ProductCategory, Product } from "@/lib/types";

const fieldStyles =
  "w-full rounded-xl bg-background px-3.5 py-3 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand";

export default function DashboardProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [form, setForm] = useState({ category_id: "", name: "", price: "", in_stock: true });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  function loadProducts() {
    api.get<Product[]>("/api/shops/me/products").then(setProducts).catch(() => {});
  }

  function loadCategories() {
    return api
      .get<ProductCategory[]>("/api/shops/me/product-categories")
      .then(setCategories)
      .catch(() => {});
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await api.upload<{ url: string }>("/api/uploads/image", file);
      setImageUrl(result.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/api/shops/me/products", {
        category_id: Number(form.category_id),
        name: form.name,
        price: form.price,
        image_url: imageUrl,
        in_stock: form.in_stock,
      });
      setForm({ category_id: "", name: "", price: "", in_stock: true });
      setImageUrl(null);
      loadProducts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add product");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStock(product: Product) {
    await api.patch(`/api/products/${product.id}`, { in_stock: !product.in_stock });
    loadProducts();
  }

  async function removeProduct(id: number) {
    await api.delete(`/api/products/${id}`);
    loadProducts();
  }

  return (
    <div className="flex flex-col gap-6">
      <ProductCategoryManager
        categories={categories}
        onChanged={async () => {
          await loadCategories();
          loadProducts();
        }}
      />

      <form onSubmit={addProduct} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Plus size={16} className="text-brand" /> Add a product
        </h2>

        {categories.length === 0 ? (
          <p className="rounded-xl bg-brand-soft/50 px-3.5 py-3 text-sm text-brand-soft-foreground">
            Add a catalog section above first — every product lives in one.
          </p>
        ) : (
          <div className="relative">
            <select
              required
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className={`${fieldStyles} appearance-none pr-10 ${form.category_id ? "" : "text-muted-soft"}`}
            >
              <option value="">Select section</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="text-foreground">
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-soft" />
          </div>
        )}

        <input
          required
          type="text"
          placeholder="Product name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={fieldStyles}
        />

        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-soft">₹</span>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className={`${fieldStyles} pl-8`}
          />
        </div>

        <StockToggle value={form.in_stock} onChange={(v) => setForm({ ...form, in_stock: v })} />

        {imageUrl ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(imageUrl)} alt="Preview" className="h-24 w-24 rounded-xl object-cover ring-1 ring-border" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <label
            htmlFor="product-image"
            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-6 text-sm text-muted hover:border-brand hover:text-brand"
          >
            <ImagePlus size={20} />
            {uploading ? "Uploading..." : "Add a photo (optional)"}
            <input id="product-image" type="file" accept="image/*" onChange={handleImage} className="sr-only" />
          </label>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={saving || uploading || categories.length === 0} className="self-start">
          {saving ? "Adding..." : "Add product"}
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Your products ({products.length})</h2>
        {products.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Package size={24} className="text-muted-soft" />
            <p className="text-sm text-muted">No products yet — add your first one above.</p>
          </div>
        )}
        {products.map((p) =>
          editingId === p.id ? (
            <ProductEditor
              key={p.id}
              product={p}
              categories={categories}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                loadProducts();
              }}
            />
          ) : (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(p.image_url)} alt={p.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
                  <Package size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted">
                  {formatPrice(p.price)}
                  {categories.find((c) => c.id === p.category_id)?.name &&
                    ` · ${categories.find((c) => c.id === p.category_id)?.name}`}
                </p>
              </div>
              <button
                onClick={() => toggleStock(p)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  p.in_stock ? "bg-success-soft text-success" : "bg-foreground/10 text-muted"
                }`}
              >
                {p.in_stock ? "In stock" : "Out of stock"}
              </button>
              <button
                onClick={() => setEditingId(p.id)}
                className="shrink-0 p-1 text-muted-soft hover:text-brand"
                aria-label={`Edit ${p.name}`}
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => removeProduct(p.id)}
                className="shrink-0 p-1 text-muted-soft hover:text-danger"
                aria-label={`Remove ${p.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function StockToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[true, false].map((state) => (
        <button
          key={String(state)}
          type="button"
          onClick={() => onChange(state)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            value === state
              ? state
                ? "bg-success-soft text-success ring-1 ring-success/30"
                : "bg-foreground/10 text-muted ring-1 ring-border"
              : "bg-background text-muted ring-1 ring-border"
          }`}
        >
          {state ? "In stock" : "Out of stock"}
        </button>
      ))}
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  onCancel,
  onSaved,
}: {
  product: Product;
  categories: ProductCategory[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    category_id: String(product.category_id),
    name: product.name,
    price: String(product.price),
    in_stock: product.in_stock,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(product.image_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await api.upload<{ url: string }>("/api/uploads/image", file);
      setImageUrl(result.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/api/products/${product.id}`, {
        category_id: Number(form.category_id),
        name: form.name,
        price: form.price,
        in_stock: form.in_stock,
        image_url: imageUrl,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-2 ring-brand">
      <h3 className="text-sm font-semibold text-brand">Editing product</h3>

      <input
        required
        type="text"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className={fieldStyles}
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-soft">₹</span>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className={`${fieldStyles} pl-8`}
          />
        </div>
        <div className="relative flex-1">
          <select
            required
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className={`${fieldStyles} appearance-none pr-9`}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft" />
        </div>
      </div>

      <StockToggle value={form.in_stock} onChange={(v) => setForm({ ...form, in_stock: v })} />

      <div className="flex items-center gap-3">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(imageUrl)} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-border" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
            <Package size={20} />
          </div>
        )}
        <label
          htmlFor={`edit-image-${product.id}`}
          className="cursor-pointer text-sm font-medium text-brand hover:underline"
        >
          {uploading ? "Uploading..." : imageUrl ? "Replace photo" : "Add a photo"}
          <input
            id={`edit-image-${product.id}`}
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="sr-only"
          />
        </label>
        {imageUrl && (
          <button type="button" onClick={() => setImageUrl(null)} className="text-sm text-muted-soft hover:text-danger">
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || uploading}>
          <Check size={14} /> {saving ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="border-border text-muted">
          Cancel
        </Button>
      </div>
    </form>
  );
}
