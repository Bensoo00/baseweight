"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import type { Trail } from "@/db/schema";
import { Weight } from "@/components/UnitProvider";
import { formatUsd } from "@/lib/units";

type TripRow = {
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

export function TripsClient({
  initialTrips,
  trails,
}: {
  initialTrips: TripRow[];
  trails: Trail[];
}) {
  const router = useRouter();
  const [trips, setTrips] = useState(initialTrips);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    trailId: trails[0]?.id ? String(trails[0].id) : "",
    nights: 3,
    season: "summer",
    seedFromLocker: true,
  });

  async function refresh() {
    const res = await fetch("/api/trips");
    const data = await res.json();
    setTrips(data.trips);
  }

  function createTrip() {
    startTransition(async () => {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || "New trip",
          trailId: form.trailId ? Number(form.trailId) : null,
          nights: form.nights,
          season: form.season,
          seedFromLocker: form.seedFromLocker,
        }),
      });
      const data = await res.json();
      setOpen(false);
      await refresh();
      if (data.trip?.trip?.id) {
        router.push(`/trips/${data.trip.trip.id}`);
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="serif-label text-ink-soft">Trip packs</p>
          <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Pack for the trail — not a forever spreadsheet.
          </h1>
          <p className="mt-3 max-w-lg text-ink-soft">
            Each trip pulls from your locker, runs gap checks against the route,
            and gets a shareable link.
          </p>
        </div>
        <button
          type="button"
          className="pill pill-cta w-fit"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="arrow">
            <Plus size={14} />
          </span>
          New trip
        </button>
      </div>

      {open && (
        <div className="panel grid gap-4 p-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Trip name</span>
            <input
              className="field"
              placeholder="Wonderland — late July"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Trail</span>
            <select
              className="field"
              value={form.trailId}
              onChange={(e) => setForm({ ...form, trailId: e.target.value })}
            >
              <option value="">No trail yet</option>
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
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Season</span>
            <select
              className="field"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
            >
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
              <option value="shoulder">Shoulder</option>
            </select>
          </label>
          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.seedFromLocker}
              onChange={(e) =>
                setForm({ ...form, seedFromLocker: e.target.checked })
              }
            />
            <span className="text-sm">Preload all gear from my locker</span>
          </label>
          <button
            type="button"
            className="pill pill-cta w-fit"
            onClick={createTrip}
            disabled={pending}
          >
            <span className="arrow">
              <ArrowRight size={14} />
            </span>
            {pending ? "Creating…" : "Create trip pack"}
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {trips.map((trip, index) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className={`panel group p-5 transition hover:-translate-y-0.5 hover:shadow-md animate-rise animate-rise-delay-${(index % 3) + 1}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-soft">
                  {trip.trail?.name ?? "Custom route"} · {trip.nights} night
                  {trip.nights === 1 ? "" : "s"}
                </div>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {trip.name}
                </h2>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-black/5 transition group-hover:bg-ink group-hover:text-white">
                <ArrowRight size={16} />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-ink-soft">Base</div>
                <div className="mt-1 font-semibold">
                  <Weight grams={trip.stats.baseWeightGrams} />
                </div>
              </div>
              <div>
                <div className="text-ink-soft">Items</div>
                <div className="mt-1 font-semibold">{trip.stats.itemCount}</div>
              </div>
              <div>
                <div className="text-ink-soft">Checks</div>
                <div className="mt-1 font-semibold">
                  {trip.failCount === 0 && trip.warnCount === 0
                    ? "Clear"
                    : `${trip.failCount}F / ${trip.warnCount}W`}
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-ink-soft">
              Kit value {formatUsd(trip.stats.totalValueUsd)} · {trip.season}
            </div>
          </Link>
        ))}
        {trips.length === 0 && (
          <div className="panel p-8 text-ink-soft md:col-span-2">
            No trips yet. Create one and pull gear from your locker.
          </div>
        )}
      </div>
    </div>
  );
}
