"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import type { Trail } from "@/db/schema";
import { Weight } from "@/components/UnitProvider";
import { formatUsd } from "@/lib/units";

type PackRow = {
  id: number;
  name: string;
  nights: number;
  season: string;
  shareSlug: string;
  trail: Trail | null;
  stats: {
    baseWeightGrams: number;
    itemCount: number;
    totalValueUsd: number;
  };
  failCount: number;
  warnCount: number;
};

export function PacksClient({
  initialPacks,
  trails,
}: {
  initialPacks: PackRow[];
  trails: Trail[];
}) {
  const router = useRouter();
  const [packs, setPacks] = useState(initialPacks);
  const [open, setOpen] = useState(false);
  const [assignTrip, setAssignTrip] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    trailId: "",
    nights: 2,
    season: "summer",
    seedFromLocker: true,
  });

  async function refresh() {
    const res = await fetch("/api/trips");
    const data = await res.json();
    setPacks(data.trips ?? []);
  }

  function createPack() {
    startTransition(async () => {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || "My pack",
          trailId:
            assignTrip && form.trailId ? Number(form.trailId) : null,
          nights: assignTrip ? form.nights : 0,
          season: assignTrip ? form.season : "summer",
          seedFromLocker: form.seedFromLocker,
        }),
      });
      const data = await res.json();
      setOpen(false);
      setAssignTrip(false);
      await refresh();
      if (data.trip?.trip?.id) {
        router.push(`/trips/${data.trip.trip.id}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="max-w-xl text-sm text-ink-soft">
          Build a pack list first — like LighterPack. Optionally assign it to a
          trail later, then log how the gear performed in Journal.
        </p>
        <button
          type="button"
          className="pill pill-cta w-fit"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="arrow">
            <Plus size={14} />
          </span>
          New pack
        </button>
      </div>

      {open && (
        <div className="glass-card grid gap-4 p-5 md:grid-cols-2">
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">Pack name</span>
            <input
              className="field"
              placeholder="Weekend ultralight"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </label>

          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.seedFromLocker}
              onChange={(e) =>
                setForm({ ...form, seedFromLocker: e.target.checked })
              }
            />
            <span className="text-sm">Preload gear from my inventory</span>
          </label>

          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={assignTrip}
              onChange={(e) => setAssignTrip(e.target.checked)}
            />
            <span className="text-sm font-medium">
              Assign to a trip (optional)
            </span>
          </label>

          {assignTrip && (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-semibold">Trail</span>
                <select
                  className="field"
                  value={form.trailId}
                  onChange={(e) =>
                    setForm({ ...form, trailId: e.target.value })
                  }
                >
                  <option value="">Pick a trail</option>
                  {trails.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold">Nights</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  value={form.nights}
                  onChange={(e) =>
                    setForm({ ...form, nights: Number(e.target.value) })
                  }
                />
              </label>
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-semibold">Season</span>
                <select
                  className="field"
                  value={form.season}
                  onChange={(e) =>
                    setForm({ ...form, season: e.target.value })
                  }
                >
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="fall">Fall</option>
                  <option value="winter">Winter</option>
                  <option value="shoulder">Shoulder</option>
                </select>
              </label>
            </>
          )}

          <button
            type="button"
            className="pill pill-cta w-fit"
            onClick={createPack}
            disabled={pending}
          >
            <span className="arrow">
              <ArrowRight size={14} />
            </span>
            {pending ? "Creating…" : "Create pack"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {packs.map((pack, index) => {
          const isTrip = Boolean(pack.trail) || pack.nights > 0;
          return (
            <Link
              key={pack.id}
              href={`/trips/${pack.id}`}
              className={`glass-card group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between animate-rise animate-rise-delay-${(index % 3) + 1}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-ink-soft">
                  <span className="rounded-full bg-white/35 px-2.5 py-0.5">
                    Pack
                  </span>
                  {isTrip && (
                    <span className="rounded-full bg-[rgba(125,207,74,0.25)] px-2.5 py-0.5 text-[var(--lichen-ink)]">
                      Trip assigned
                    </span>
                  )}
                  <span>
                    {pack.trail?.name ??
                      (isTrip ? "Custom route" : "No trip yet")}
                    {pack.nights > 0
                      ? ` · ${pack.nights} night${pack.nights === 1 ? "" : "s"}`
                      : ""}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {pack.name}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm md:w-[280px]">
                <div>
                  <div className="text-ink-soft">Base</div>
                  <div className="mt-0.5 font-semibold">
                    <Weight grams={pack.stats.baseWeightGrams} />
                  </div>
                </div>
                <div>
                  <div className="text-ink-soft">Items</div>
                  <div className="mt-0.5 font-semibold">
                    {pack.stats.itemCount}
                  </div>
                </div>
                <div>
                  <div className="text-ink-soft">Checks</div>
                  <div className="mt-0.5 font-semibold">
                    {pack.failCount === 0 && pack.warnCount === 0
                      ? "Clear"
                      : `${pack.failCount}F / ${pack.warnCount}W`}
                  </div>
                </div>
              </div>
              <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-white/35 transition group-hover:bg-ink group-hover:text-white md:grid">
                <ArrowRight size={16} />
              </span>
              <div className="text-xs text-ink-soft md:hidden">
                Kit {formatUsd(pack.stats.totalValueUsd)}
              </div>
            </Link>
          );
        })}
        {packs.length === 0 && (
          <div className="glass-card-soft p-8 text-ink-soft">
            No packs yet. Create one, add gear, then assign a trip when you’re
            headed out.
          </div>
        )}
      </div>
    </div>
  );
}
