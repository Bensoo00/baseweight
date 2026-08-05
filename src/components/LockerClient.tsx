"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { LockerItem } from "@/db/schema";
import { LOCKER_UPDATED_EVENT } from "@/components/AddGearForm";
import { Weight } from "@/components/UnitProvider";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  formatUsd,
  type Category,
} from "@/lib/units";

export function LockerClient({
  initialItems,
  summary,
}: {
  initialItems: LockerItem[];
  summary: { itemCount: number; totalGrams: number; totalValueUsd: number };
}) {
  const [items, setItems] = useState(initialItems);
  const [stats, setStats] = useState(summary);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    name: "",
    brand: "",
    category: "other" as Category,
    weightGrams: 100,
  });

  async function refresh() {
    const res = await fetch("/api/locker");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items ?? []);
    setStats(data.summary);
  }

  useEffect(() => {
    setItems(initialItems);
    setStats(summary);
  }, [initialItems, summary]);

  useEffect(() => {
    function onUpdate() {
      void refresh();
    }
    window.addEventListener(LOCKER_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(LOCKER_UPDATED_EVENT, onUpdate);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<Category, LockerItem[]>();
    for (const cat of CATEGORIES) map.set(cat, []);
    for (const item of items) {
      const list = map.get(item.category as Category) ?? [];
      list.push(item);
      map.set(item.category as Category, list);
    }
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [items]);

  async function removeItem(id: number) {
    await fetch(`/api/locker?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  async function moveCategory(id: number, category: Category) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category } : item)),
    );
    setEditingId(null);
    void fetch("/api/locker", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, category }),
    }).then(() => refresh());
  }

  function addInline() {
    if (!draft.name.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/locker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          brand: draft.brand.trim(),
          category: draft.category,
          weightGrams: Math.max(1, Number(draft.weightGrams) || 1),
          priceUsd: 0,
          quantity: 1,
        }),
      });
      if (!res.ok) return;
      setDraft((prev) => ({ ...prev, name: "", brand: "", weightGrams: 100 }));
      window.dispatchEvent(new CustomEvent(LOCKER_UPDATED_EVENT));
      await refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="biz-card px-4 py-3">
          <div className="text-xs text-ink-soft">Pieces</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">
            {stats.itemCount}
          </div>
        </div>
        <div className="biz-card px-4 py-3">
          <div className="text-xs text-ink-soft">Total weight</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">
            <Weight grams={stats.totalGrams} />
          </div>
        </div>
        <div className="biz-card px-4 py-3">
          <div className="text-xs text-ink-soft">Kit value</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">
            {formatUsd(stats.totalValueUsd)}
          </div>
        </div>
        <div className="biz-card px-4 py-3">
          <div className="text-xs text-ink-soft">Categories</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">
            {grouped.length}
          </div>
        </div>
      </div>

      <div className="biz-card overflow-hidden">
        <div className="grid gap-2 border-b border-[var(--line)] p-3 md:grid-cols-[1.4fr_1fr_0.9fr_7rem_auto]">
          <input
            className="field field-sm"
            placeholder="Item name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") addInline();
            }}
          />
          <input
            className="field field-sm"
            placeholder="Brand"
            value={draft.brand}
            onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") addInline();
            }}
          />
          <select
            className="field field-sm field-category"
            value={draft.category}
            onChange={(e) =>
              setDraft({ ...draft, category: e.target.value as Category })
            }
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <input
            className="field field-sm"
            type="number"
            min={1}
            placeholder="g"
            value={draft.weightGrams}
            onChange={(e) =>
              setDraft({ ...draft, weightGrams: Number(e.target.value) })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") addInline();
            }}
          />
          <button
            type="button"
            className="pill pill-cta !justify-center !px-3 !py-2"
            disabled={pending || !draft.name.trim()}
            onClick={addInline}
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {grouped.map(([category, list]) => {
            const isCollapsed = collapsed[category];
            const grams = list.reduce(
              (sum, i) => sum + i.weightGrams * i.quantity,
              0,
            );
            return (
              <div key={category}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 bg-[#24272b] px-4 py-2.5 text-left transition hover:bg-[#2a2e33]"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [category]: !prev[category],
                    }))
                  }
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="font-semibold">
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-xs text-ink-soft">
                      {list.length} · <Weight grams={grams} />
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-ink-soft transition ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                </button>
                {!isCollapsed &&
                  list.map((item) => {
                    const editing = editingId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="border-t border-[var(--line)] px-4 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() =>
                              setEditingId(editing ? null : item.id)
                            }
                          >
                            <div className="truncate text-sm font-medium">
                              {item.name}
                              {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                            </div>
                            <div className="truncate text-xs text-ink-soft">
                              {item.brand || "Unbranded"}
                            </div>
                          </button>
                          <div className="shrink-0 text-sm font-semibold tabular-nums">
                            <Weight
                              grams={item.weightGrams * item.quantity}
                            />
                          </div>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--signal-fail)] hover:bg-white/6"
                            onClick={() => removeItem(item.id)}
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {editing && (
                          <label className="mt-2 block max-w-xs space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                              Move to category
                            </span>
                            <select
                              className="field field-sm field-category"
                              value={item.category}
                              onChange={(e) =>
                                moveCategory(
                                  item.id,
                                  e.target.value as Category,
                                )
                              }
                            >
                              {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {CATEGORY_LABELS[cat]}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })}
          {grouped.length === 0 && (
            <div className="px-4 py-8 text-sm text-ink-soft">
              Empty inventory — type a name above and hit Add (LighterPack-style).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
