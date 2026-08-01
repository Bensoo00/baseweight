"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, Trash2 } from "lucide-react";
import type { LockerItem } from "@/db/schema";
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

  async function refresh() {
    const res = await fetch("/api/locker");
    const data = await res.json();
    setItems(data.items);
    setStats(data.summary);
  }

  async function removeItem(id: number) {
    await fetch(`/api/locker?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-[0.85fr_1.35fr]">
      <aside className="space-y-5">
        <div>
          <p className="serif-label text-ink-soft">Gear inventory</p>
          <p className="mt-1 text-xs text-ink-soft/70">
            Closet by category · collapse sections
          </p>
        </div>

        <div className="panel-ink p-6">
          <div className="stat-number text-white">{stats.itemCount}</div>
          <div className="mt-2 font-semibold">Pieces owned</div>
          <p className="mt-2 text-sm text-white/65">
            <Weight grams={stats.totalGrams} /> total ·{" "}
            {formatUsd(stats.totalValueUsd)}
          </p>
          <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/85">
            Own it once here, then load pieces into any pack list.
          </p>
        </div>

        <a href="#add-gear" className="pill pill-cta w-fit">
          <span className="arrow">
            <ArrowUpRight size={14} />
          </span>
          Add gear
        </a>
      </aside>

      <section>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-sm text-ink-soft">
            Inventory by category. Add pieces below, then drop them into a pack.
          </p>
          <a href="#packs" className="pill pill-soft w-fit">
            Build a pack
          </a>
        </div>

        <div className="space-y-3">
          {grouped.map(([category, list]) => {
            const isCollapsed = collapsed[category];
            const grams = list.reduce(
              (sum, i) => sum + i.weightGrams * i.quantity,
              0,
            );
            return (
              <div
                key={category}
                className="glass-card-soft overflow-hidden"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [category]: !prev[category],
                    }))
                  }
                >
                  <div>
                    <div className="font-semibold">
                      {CATEGORY_LABELS[category]}
                    </div>
                    <div className="text-sm text-ink-soft">
                      {list.length} item{list.length === 1 ? "" : "s"} ·{" "}
                      <Weight grams={grams} />
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`transition ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-black/8 border-t border-black/8">
                    {list.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{item.name}</div>
                          <div className="truncate text-sm text-ink-soft">
                            {item.brand || "Unbranded"} ·{" "}
                            <Weight grams={item.weightGrams * item.quantity} />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="chip text-[var(--signal-fail)]"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {grouped.length === 0 && (
            <div className="panel p-8 text-ink-soft">Locker is empty.</div>
          )}
        </div>
      </section>
    </div>
  );
}
