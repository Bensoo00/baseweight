"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Trash2 } from "lucide-react";
import type { UserGear } from "@/db/schema";
import type { PackStats } from "@/lib/pack-stats";
import { CATEGORY_LABELS, formatUsd, gramsToDisplay, type Category } from "@/lib/units";

export function GearList({
  initialGear,
  initialStats,
}: {
  initialGear: UserGear[];
  initialStats: PackStats;
}) {
  const [gear, setGear] = useState(initialGear);
  const [stats, setStats] = useState(initialStats);
  const [openId, setOpenId] = useState<number | null>(initialGear[0]?.id ?? null);
  const [filter, setFilter] = useState<Category | "all">("all");

  const categories = useMemo(() => {
    const set = new Set(gear.map((g) => g.category));
    return ["all", ...set] as ("all" | Category)[];
  }, [gear]);

  const visible = gear.filter(
    (g) => filter === "all" || g.category === filter,
  );

  async function refresh() {
    const res = await fetch("/api/gear");
    const data = await res.json();
    setGear(data.gear);
    setStats(data.stats);
  }

  async function togglePacked(item: UserGear) {
    await fetch("/api/gear", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, packed: !item.packed }),
    });
    await refresh();
  }

  async function removeItem(id: number) {
    await fetch(`/api/gear?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-[0.9fr_1.3fr]">
      <aside className="space-y-6">
        <div>
          <p className="serif-label text-ink-soft">My pack</p>
          <p className="mt-1 text-xs text-ink-soft/70">
            ({String(stats.itemCount).padStart(2, "0")} items)
          </p>
        </div>

        <div className="rounded-[1.4rem] bg-gradient-to-br from-[#24362d] to-[#1a2820] p-6 text-white shadow-lg">
          <div className="stat-number text-white">
            {gramsToDisplay(stats.baseWeightGrams)}
          </div>
          <div className="mt-2 font-semibold">Base weight</div>
          <p className="mt-2 text-sm text-white/70">
            Worn {gramsToDisplay(stats.wornWeightGrams)} · Consumables{" "}
            {gramsToDisplay(stats.consumableWeightGrams)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-white/60">Pack weight</div>
              <div className="mt-1 text-lg font-semibold">
                {gramsToDisplay(stats.packedWeightGrams)}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-white/60">Kit value</div>
              <div className="mt-1 text-lg font-semibold">
                {formatUsd(stats.totalValueUsd)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-ink">Weight by category</div>
          {stats.categoryBreakdown.slice(0, 6).map((row) => {
            const pct =
              stats.packedWeightGrams === 0
                ? 0
                : (row.grams / stats.packedWeightGrams) * 100;
            return (
              <div key={row.category}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{CATEGORY_LABELS[row.category as Category] ?? row.category}</span>
                  <span className="text-ink-soft">{gramsToDisplay(row.grams)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/8">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#5f7f6e,#c8f06c)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <section>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-md text-2xl font-semibold tracking-tight md:text-3xl">
            Every piece of kit, with the stats that actually matter on trail.
          </h2>
          <Link href="/pack/add" className="pill pill-cta w-fit">
            <span className="arrow">
              <ArrowUpRight size={14} />
            </span>
            Add gear
          </Link>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className="chip"
              data-active={filter === cat}
              onClick={() => setFilter(cat)}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="divide-y divide-black/8 rounded-[1.5rem] border border-black/8 bg-white/70">
          {visible.length === 0 && (
            <div className="p-8 text-ink-soft">No gear in this category yet.</div>
          )}
          {visible.map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} className="px-5 py-4">
                <button
                  type="button"
                  className="flex w-full items-center gap-4 text-left"
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{item.name}</div>
                    <div className="truncate text-sm text-ink-soft">
                      {item.brand || "Unbranded"} ·{" "}
                      {CATEGORY_LABELS[item.category as Category]}
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="font-semibold">
                      {gramsToDisplay(item.weightGrams * item.quantity)}
                    </div>
                    <div className="text-sm text-ink-soft">
                      {formatUsd(item.priceUsd)}
                    </div>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white">
                    <ArrowUpRight
                      size={16}
                      className={`transition ${open ? "rotate-45" : ""}`}
                    />
                  </span>
                </button>

                {open && (
                  <div className="mt-4 grid gap-4 rounded-2xl bg-[#f3f6f3] p-4 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-2 text-sm text-ink-soft">
                      <p>
                        <span className="font-semibold text-ink">Flags: </span>
                        {item.packed ? "Packed" : "Unpacked"}
                        {item.worn ? " · Worn" : ""}
                        {item.consumable ? " · Consumable" : ""}
                      </p>
                      {item.notes && <p>{item.notes}</p>}
                      <p>
                        Unit weight {gramsToDisplay(item.weightGrams)} · Qty{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <button
                        type="button"
                        className="chip"
                        onClick={() => togglePacked(item)}
                      >
                        {item.packed ? "Unpack" : "Pack"}
                      </button>
                      <button
                        type="button"
                        className="chip text-[var(--danger)]"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 size={14} className="mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
