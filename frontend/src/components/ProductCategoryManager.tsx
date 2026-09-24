"use client";

import { useState } from "react";
import { Check, FolderPlus, Pencil, Trash2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { ProductCategory } from "@/lib/types";

const fieldStyles =
  "w-full rounded-xl bg-background px-3.5 py-2.5 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand";

export function ProductCategoryManager({
  categories,
  onChanged,
}: {
  categories: ProductCategory[];
  onChanged: () => Promise<void> | void;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      await onChanged();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong, try again");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const ok = await run(() => api.post("/api/shops/me/product-categories", { name: newName }));
    if (ok) setNewName("");
  }

  async function saveEdit(id: number) {
    const ok = await run(() => api.patch(`/api/shops/me/product-categories/${id}`, { name: editName }));
    if (ok) setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
      <h2 className="flex items-center gap-1.5 font-semibold">
        <FolderPlus size={16} className="text-brand" /> Catalog sections
      </h2>
      <p className="-mt-2 text-sm text-foreground/50">
        Your own shelves — &ldquo;Cold Drinks&rdquo;, &ldquo;Rice &amp; Atta&rdquo;. Customers use these as tabs on your shop page.
      </p>

      {categories.length > 0 && (
        <ul className="flex flex-col gap-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-xl bg-background px-3 py-2 ring-1 ring-border">
              {editingId === c.id ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    maxLength={100}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                  <button
                    onClick={() => saveEdit(c.id)}
                    disabled={busy}
                    aria-label="Save section name"
                    className="shrink-0 p-1 text-success"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel"
                    className="shrink-0 p-1 text-foreground/35"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                      setError(null);
                    }}
                    aria-label={`Rename ${c.name}`}
                    className="shrink-0 p-1 text-foreground/35 hover:text-brand"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => run(() => api.delete(`/api/shops/me/product-categories/${c.id}`))}
                    disabled={busy}
                    aria-label={`Delete ${c.name}`}
                    className="shrink-0 p-1 text-foreground/35 hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex gap-2">
        <input
          type="text"
          placeholder="New section name"
          value={newName}
          maxLength={100}
          onChange={(e) => setNewName(e.target.value)}
          className={fieldStyles}
        />
        <Button type="submit" size="sm" disabled={busy || !newName.trim()} className="shrink-0">
          Add
        </Button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
