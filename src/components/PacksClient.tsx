"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileUp,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import type { Trail } from "@/db/schema";
import { LOCKER_UPDATED_EVENT } from "@/components/AddGearForm";
import { Weight } from "@/components/UnitProvider";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [packs, setPacks] = useState(initialPacks);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [assignTrip, setAssignTrip] = useState(false);
  const [pending, startTransition] = useTransition();
  const [importError, setImportError] = useState<string | null>(null);
  const [importName, setImportName] = useState("");
  const [alsoLocker, setAlsoLocker] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    trailId: "",
    nights: 2,
    season: "summer",
    seedFromLocker: false,
  });

  async function refresh() {
    const res = await fetch("/api/trips");
    const data = await res.json();
    setPacks(data.trips ?? []);
  }

  function duplicatePack(id: number) {
    startTransition(async () => {
      const res = await fetch(`/api/trips/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      await refresh();
      if (data.trip?.trip?.id) {
        router.push(`/trips/${data.trip.trip.id}`);
      }
    });
  }

  function deletePack(pack: PackRow) {
    if (
      !window.confirm(
        `Delete “${pack.name}”? Items stay in your gear inventory.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await fetch(`/api/trips/${pack.id}`, { method: "DELETE" });
      setPacks((prev) => prev.filter((p) => p.id !== pack.id));
    });
  }

  async function copyShareLink(pack: PackRow) {
    const url = `${window.location.origin}/s/${pack.shareSlug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(pack.id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  function exportCsv(pack: PackRow) {
    window.open(`/api/trips/${pack.id}/export`, "_blank", "noopener,noreferrer");
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

  function importCsv(file: File) {
    setImportError(null);
    startTransition(async () => {
      const csv = await file.text();
      const res = await fetch("/api/trips/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv,
          name: importName || file.name.replace(/\.csv$/i, ""),
          alsoAddToLocker: alsoLocker,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(
          typeof data.error === "string"
            ? data.error
            : "Could not import that CSV.",
        );
        return;
      }
      if (alsoLocker) {
        window.dispatchEvent(new CustomEvent(LOCKER_UPDATED_EVENT));
      }
      setImportOpen(false);
      setImportName("");
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
          Build a pack list, import a LighterPack CSV, or add items directly on
          the pack — no inventory required.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="pill pill-soft w-fit"
            onClick={() => {
              setImportOpen((v) => !v);
              setOpen(false);
            }}
          >
            <FileUp size={16} />
            Import CSV
          </button>
          <button
            type="button"
            className="pill pill-cta w-fit"
            onClick={() => {
              setOpen((v) => !v);
              setImportOpen(false);
            }}
          >
            <span className="arrow">
              <Plus size={14} />
            </span>
            New pack
          </button>
        </div>
      </div>

      {importOpen && (
        <div className="glass-card space-y-4 p-5">
          <div>
            <p className="font-semibold">Import from LighterPack CSV</p>
            <p className="mt-1 text-sm text-ink-soft">
              On LighterPack: Share → Export to CSV, then upload that file here.
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Pack name (optional)</span>
            <input
              className="field"
              placeholder="Uses the file name if blank"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={alsoLocker}
              onChange={(e) => setAlsoLocker(e.target.checked)}
            />
            <span className="text-sm">
              Also copy items into my gear inventory
            </span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importCsv(file);
              e.target.value = "";
            }}
          />
          {importError && (
            <p className="text-sm text-[var(--signal-fail)]">{importError}</p>
          )}
          <button
            type="button"
            className="pill pill-cta w-fit"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            <span className="arrow">
              <FileUp size={14} />
            </span>
            {pending ? "Importing…" : "Choose CSV file"}
          </button>
        </div>
      )}

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
            <div
              key={pack.id}
              className={`glass-card pack-row animate-rise animate-rise-delay-${(index % 3) + 1}`}
            >
              <Link
                href={`/trips/${pack.id}`}
                className="min-w-0 flex-1 group"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-ink-soft">
                  {isTrip ? (
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]">
                      Trip
                    </span>
                  ) : (
                    <span className="rounded-md bg-white/8 px-2 py-0.5">
                      Pack
                    </span>
                  )}
                  <span className="normal-case tracking-normal">
                    {pack.trail?.name ??
                      (isTrip ? "Custom route" : "No trip")}
                    {pack.nights > 0
                      ? ` · ${pack.nights}n`
                      : ""}
                  </span>
                </div>
                <h2 className="mt-0.5 truncate text-base font-semibold tracking-tight group-hover:text-[var(--accent)]">
                  {pack.name}
                </h2>
              </Link>
              <div className="grid grid-cols-3 gap-3 text-sm md:w-[240px]">
                <div>
                  <div className="text-[11px] text-ink-soft">Base</div>
                  <div className="font-semibold tabular-nums">
                    <Weight grams={pack.stats.baseWeightGrams} />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-soft">Items</div>
                  <div className="font-semibold">{pack.stats.itemCount}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-soft">Checks</div>
                  <div className="font-semibold">
                    {pack.failCount === 0 && pack.warnCount === 0
                      ? "Clear"
                      : `${pack.failCount}F / ${pack.warnCount}W`}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="pill pill-soft !px-2.5 !py-1.5 text-xs"
                  onClick={() => void copyShareLink(pack)}
                  disabled={pending}
                >
                  {copiedId === pack.id ? (
                    <Check size={13} />
                  ) : (
                    <Share2 size={13} />
                  )}
                </button>
                <button
                  type="button"
                  className="pill pill-soft !px-2.5 !py-1.5 text-xs"
                  onClick={() => duplicatePack(pack.id)}
                  disabled={pending}
                  title="Duplicate"
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  className="pill pill-soft !px-2.5 !py-1.5 text-xs"
                  onClick={() => exportCsv(pack)}
                  disabled={pending}
                  title="Export CSV"
                >
                  <Download size={13} />
                </button>
                <button
                  type="button"
                  className="pill pill-soft !px-2.5 !py-1.5 text-xs text-[var(--signal-fail)]"
                  onClick={() => deletePack(pack)}
                  disabled={pending}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
                <Link
                  href={`/trips/${pack.id}`}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-white/8 transition hover:bg-[var(--accent)] hover:text-white"
                  aria-label={`Open ${pack.name}`}
                >
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
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
