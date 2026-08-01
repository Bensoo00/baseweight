"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eraser,
  Megaphone,
  Palette,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import type { LockerItem, Trail, Trip, TripItem } from "@/db/schema";
import type { GapCheck, UpgradeSuggestion } from "@/lib/gap-checks";
import { LOCKER_UPDATED_EVENT } from "@/components/AddGearForm";
import { CategoryBars } from "@/components/CategoryBars";
import { GapPanel } from "@/components/GapPanel";
import { Weight, useUnit } from "@/components/UnitProvider";
import {
  computePackStats,
  tripItemsToPackable,
  type PackStats,
} from "@/lib/pack-stats";
import {
  CATEGORIES,
  CATEGORY_COLOR_SWATCHES,
  CATEGORY_LABELS,
  contrastOnColor,
  DEFAULT_CATEGORY_COLORS,
  formatUsd,
  type Category,
} from "@/lib/units";

const CATEGORY_COLORS_KEY = "bw-category-colors";

type Detail = {
  trip: Trip;
  trail: Trail | null;
  items: TripItem[];
  stats: PackStats;
  checks: GapCheck[];
  upgrades: UpgradeSuggestion[];
};

export function TripDetailClient({
  initial,
  locker,
  trails,
}: {
  initial: Detail;
  locker: LockerItem[];
  trails: Trail[];
}) {
  const router = useRouter();
  const { unit, format } = useUnit();
  const [detail, setDetail] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [shareReady, setShareReady] = useState(true);
  const writeQueue = useRef(Promise.resolve());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [postBody, setPostBody] = useState("");
  const [openId, setOpenId] = useState<number | null>(
    initial.items[0]?.id ?? null,
  );
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>(
    {},
  );
  const [categoryColors, setCategoryColors] = useState<
    Record<Category, string>
  >(DEFAULT_CATEGORY_COLORS);
  const [colorPickerCat, setColorPickerCat] = useState<Category | null>(null);
  const [newItem, setNewItem] = useState({
    name: "",
    brand: "",
    category: "other" as Category,
    weightGrams: 100,
    priceUsd: 0,
    quantity: 1,
    worn: false,
    consumable: false,
    alsoAddToLocker: false,
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("bw-author");
    if (saved) setAuthorName(saved);
    try {
      const raw = window.localStorage.getItem(CATEGORY_COLORS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<Category, string>>;
      setCategoryColors((prev) => {
        const next = { ...prev };
        for (const cat of CATEGORIES) {
          const value = parsed[cat];
          if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
            next[cat] = value;
          }
        }
        return next;
      });
    } catch {
      /* ignore bad localStorage */
    }
  }, []);

  useEffect(() => {
    if (!colorPickerCat) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-category-color-picker]")) return;
      setColorPickerCat(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [colorPickerCat]);

  function setCategoryColor(category: Category, color: string) {
    setCategoryColors((prev) => {
      const next = { ...prev, [category]: color };
      window.localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(next));
      return next;
    });
  }

  const inTripLockerIds = useMemo(
    () => new Set(detail.items.map((i) => i.lockerItemId).filter(Boolean)),
    [detail.items],
  );

  const availableLocker = locker.filter((l) => !inTripLockerIds.has(l.id));

  const groupedItems = useMemo(() => {
    const map = new Map<Category, TripItem[]>();
    for (const cat of CATEGORIES) map.set(cat, []);
    for (const item of detail.items) {
      const cat = (CATEGORIES.includes(item.category as Category)
        ? item.category
        : "other") as Category;
      map.get(cat)!.push(item);
    }
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [detail.items]);

  const targetDisplay =
    unit === "g"
      ? detail.trip.targetBaseWeightGrams
      : Math.round(detail.trip.targetBaseWeightGrams / 28.3495);
  const progress = Math.min(
    100,
    (detail.stats.baseWeightGrams / detail.trip.targetBaseWeightGrams) * 100,
  );

  function applyItemsStats(
    items: TripItem[],
    stats: PackStats,
    lockerSynced?: boolean,
  ) {
    const updatedAt = new Date().toISOString();
    setDetail((prev) => ({
      ...prev,
      items,
      stats,
      trip: { ...prev.trip, updatedAt },
    }));
    if (lockerSynced) {
      window.dispatchEvent(new CustomEvent(LOCKER_UPDATED_EVENT));
    }
  }

  function withLocalStats(items: TripItem[]) {
    return {
      items,
      stats: computePackStats(tripItemsToPackable(items)),
    };
  }

  function enqueueWrite(task: () => Promise<void>) {
    setShareReady(false);
    writeQueue.current = writeQueue.current
      .then(task)
      .catch(() => {})
      .finally(() => {
        // Only mark ready if this was the last queued write
        void writeQueue.current.then(() => setShareReady(true));
      });
    return writeQueue.current;
  }

  function shareUrl() {
    const stamp = detail.trip.updatedAt || new Date().toISOString();
    return `${window.location.origin}/s/${detail.trip.shareSlug}?v=${encodeURIComponent(stamp)}`;
  }

  function saveTrip(patch: Record<string, unknown>) {
    setDetail((prev) => ({
      ...prev,
      trip: {
        ...prev.trip,
        ...patch,
        updatedAt: new Date().toISOString(),
      } as Trip,
    }));
    void enqueueWrite(async () => {
      await fetch(`/api/trips/${detail.trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    });
  }

  function addSelected() {
    const picked = selected.slice();
    setSelected([]);
    setPickerOpen(false);
    void enqueueWrite(async () => {
      const res = await fetch(`/api/trips/${detail.trip.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockerItemIds: picked }),
      });
      const data = await res.json();
      if (data.items && data.stats) applyItemsStats(data.items, data.stats);
    });
  }

  function addDirectItem() {
    if (!newItem.name.trim()) return;
    const payload = { ...newItem };
    setAddOpen(false);
    setNewItem((prev) => ({
      ...prev,
      name: "",
      brand: "",
      weightGrams: 100,
      priceUsd: 0,
    }));
    void enqueueWrite(async () => {
      const res = await fetch(`/api/trips/${detail.trip.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: payload }),
      });
      const data = await res.json();
      if (data.items && data.stats) {
        applyItemsStats(data.items, data.stats, data.lockerSynced);
      }
    });
  }

  function patchItem(id: number, patch: Record<string, unknown>) {
    // Optimistic local update — UI responds immediately
    setDetail((prev) => {
      const items = prev.items.map((item) =>
        item.id === id ? ({ ...item, ...patch } as TripItem) : item,
      );
      const { stats } = withLocalStats(items);
      return {
        ...prev,
        items,
        stats,
        trip: { ...prev.trip, updatedAt: new Date().toISOString() },
      };
    });

    void enqueueWrite(async () => {
      const res = await fetch(`/api/trips/${detail.trip.id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (data.items && data.stats) {
        applyItemsStats(data.items, data.stats, data.lockerSynced);
      }
    });
  }

  function removeItem(itemId: number) {
    setDetail((prev) => {
      const items = prev.items.filter((item) => item.id !== itemId);
      const { stats } = withLocalStats(items);
      return {
        ...prev,
        items,
        stats,
        trip: { ...prev.trip, updatedAt: new Date().toISOString() },
      };
    });
    setOpenId(null);
    void enqueueWrite(async () => {
      const res = await fetch(
        `/api/trips/${detail.trip.id}/items?itemId=${itemId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.items && data.stats) applyItemsStats(data.items, data.stats);
    });
  }

  async function copyShare() {
    await writeQueue.current;
    const url = shareUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function openPublicView() {
    await writeQueue.current;
    window.open(shareUrl(), "_blank", "noopener,noreferrer");
  }

  function publish() {
    startTransition(async () => {
      const name = authorName.trim() || "Anonymous";
      window.localStorage.setItem("bw-author", name);
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: detail.trip.id,
          authorName: name,
          title: detail.trip.name,
          body: postBody || detail.trip.notes,
        }),
      });
      if (res.ok) {
        setPublished(true);
        setPublishOpen(false);
      }
    });
  }

  function exportCsv() {
    window.open(
      `/api/trips/${detail.trip.id}/export`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function duplicatePack() {
    startTransition(async () => {
      await writeQueue.current;
      const res = await fetch(`/api/trips/${detail.trip.id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.trip?.trip?.id) {
        router.push(`/trips/${data.trip.trip.id}`);
      }
    });
  }

  function clearPack() {
    if (
      !window.confirm(
        "Remove every item from this pack? Gear stays in your inventory.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/trips/${detail.trip.id}/items?clearAll=1`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.items && data.stats) applyItemsStats(data.items, data.stats);
    });
  }

  function deletePack() {
    if (
      !window.confirm(
        `Delete “${detail.trip.name}”? Items stay in your gear inventory.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await writeQueue.current;
      const res = await fetch(`/api/trips/${detail.trip.id}`, {
        method: "DELETE",
      });
      if (res.ok) router.push("/#packs");
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <Link href="/#packs" className="text-sm text-ink-soft hover:text-ink">
            ← All packs
          </Link>
          <input
            className="mt-3 w-full border-0 bg-transparent text-3xl font-semibold tracking-tight outline-none md:text-4xl"
            value={detail.trip.name}
            onChange={(e) =>
              setDetail({
                ...detail,
                trip: { ...detail.trip, name: e.target.value },
              })
            }
            onBlur={(e) => saveTrip({ name: e.target.value })}
          />
          <p className="mt-2 text-ink-soft">
            {detail.trail
              ? `${detail.trail.region} · ${detail.trail.difficulty} · ${detail.trail.climate}`
              : "No trail linked yet — add one for smarter checks."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="pill pill-soft" onClick={copyShare}>
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? "Copied link" : shareReady ? "Share link" : "Saving…"}
          </button>
          <button type="button" className="pill pill-soft" onClick={exportCsv}>
            <Download size={16} />
            Export CSV
          </button>
          <button
            type="button"
            className="pill pill-soft"
            onClick={duplicatePack}
            disabled={pending}
          >
            <Copy size={16} />
            Duplicate
          </button>
          <button
            type="button"
            className="pill pill-soft"
            onClick={() => setPublishOpen((v) => !v)}
          >
            <Megaphone size={16} />
            {published ? "Posted" : "Post to community"}
          </button>
          <Link href="/#journal" className="pill pill-soft">
            Log in journal
          </Link>
          <button
            type="button"
            className="pill pill-cta"
            onClick={openPublicView}
          >
            <span className="arrow">
              <ArrowUpRight size={14} />
            </span>
            {shareReady ? "Public view" : "Saving…"}
          </button>
          <button
            type="button"
            className="pill pill-soft"
            onClick={clearPack}
            disabled={pending || detail.items.length === 0}
          >
            <Eraser size={16} />
            Clear items
          </button>
          <button
            type="button"
            className="pill pill-soft text-[var(--signal-fail)]"
            onClick={deletePack}
            disabled={pending}
          >
            <Trash2 size={16} />
            Delete pack
          </button>
        </div>
      </div>

      {publishOpen && (
        <div className="panel space-y-3 p-5">
          <div className="font-semibold">Post this pack for a shakedown</div>
          <p className="text-sm text-ink-soft">
            Shows up in Community with comments and a one-click clone.
          </p>
          <input
            className="field"
            placeholder="Display name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
          <textarea
            className="field min-h-24"
            placeholder="What should people roast or help with?"
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
          />
          <button
            type="button"
            className="pill pill-cta"
            onClick={publish}
            disabled={pending}
          >
            Publish pack
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <label className="panel block space-y-2 p-4">
          <span className="text-sm font-semibold">Trail</span>
          <select
            className="field"
            value={detail.trip.trailId ?? ""}
            onChange={(e) =>
              saveTrip({
                trailId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">None</option>
            {trails.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="panel block space-y-2 p-4">
          <span className="text-sm font-semibold">Nights</span>
          <input
            className="field"
            type="number"
            min={0}
            value={detail.trip.nights}
            onChange={(e) => saveTrip({ nights: Number(e.target.value) })}
          />
        </label>
        <label className="panel block space-y-2 p-4">
          <span className="text-sm font-semibold">Season</span>
          <select
            className="field"
            value={detail.trip.season}
            onChange={(e) => saveTrip({ season: e.target.value })}
          >
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
            <option value="shoulder">Shoulder</option>
          </select>
        </label>
        <label className="panel block space-y-2 p-4">
          <span className="text-sm font-semibold">
            Target base ({unit})
          </span>
          <input
            className="field"
            type="number"
            value={targetDisplay}
            onChange={(e) => {
              const raw = Number(e.target.value);
              saveTrip({
                targetBaseWeightGrams:
                  unit === "g" ? Math.round(raw) : Math.round(raw * 28.3495),
              });
            }}
          />
        </label>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.25fr]">
        <aside className="space-y-5">
          <div className="panel-ink p-6">
            <div className="stat-number text-[var(--paper)]">
              <Weight grams={detail.stats.baseWeightGrams} />
            </div>
            <div className="mt-2 font-semibold">Base weight</div>
            <p className="mt-2 text-sm text-white/65">
              Target {format(detail.trip.targetBaseWeightGrams)}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[var(--lichen)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-white/60">Pack (total − worn)</div>
                <div className="mt-1 text-lg font-semibold">
                  <Weight grams={detail.stats.packWeightGrams} />
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-white/60">Maybe</div>
                <div className="mt-1 text-lg font-semibold">
                  <Weight grams={detail.stats.maybeWeightGrams} />
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-white/60">Worn</div>
                <div className="mt-1 text-lg font-semibold">
                  <Weight grams={detail.stats.wornWeightGrams} />
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-white/60">Consumable</div>
                <div className="mt-1 text-lg font-semibold">
                  <Weight grams={detail.stats.consumableWeightGrams} />
                </div>
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <div className="mb-4 text-sm font-semibold">
              Weight by category (bars)
            </div>
            <CategoryBars
              rows={detail.stats.categoryBreakdown}
              totalGrams={detail.stats.packWeightGrams}
            />
          </div>

          <div className="panel p-5">
            <div className="text-sm font-semibold">Decision math</div>
            <p className="mt-1 text-sm text-ink-soft">
              Where money sits relative to ounces in base weight.
            </p>
            <div className="mt-4 space-y-2">
              {detail.stats.costPerOzSavedHints.map((hint) => (
                <div
                  key={hint.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate">{hint.name}</span>
                  <span className="shrink-0 text-ink-soft">
                    {formatUsd(hint.dollarsPerOz)}/oz ·{" "}
                    <Weight grams={hint.weightGrams} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <GapPanel checks={detail.checks} upgrades={detail.upgrades} />
        </aside>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              Pack list
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="pill pill-cta"
                onClick={() => {
                  setAddOpen((v) => !v);
                  setPickerOpen(false);
                }}
              >
                <span className="arrow">
                  <Plus size={14} />
                </span>
                Add item
              </button>
              <button
                type="button"
                className="pill pill-soft"
                onClick={() => {
                  setPickerOpen((v) => !v);
                  setAddOpen(false);
                }}
              >
                <Copy size={16} />
                From inventory
              </button>
            </div>
          </div>

          {addOpen && (
            <div className="panel grid gap-3 p-4 md:grid-cols-2">
              <div className="md:col-span-2 text-sm font-semibold">
                Add straight to this pack
              </div>
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-sm font-semibold">Name</span>
                <input
                  className="field"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  placeholder="Item name"
                  autoFocus
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Brand</span>
                <input
                  className="field"
                  value={newItem.brand}
                  onChange={(e) =>
                    setNewItem({ ...newItem, brand: e.target.value })
                  }
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Category</span>
                <select
                  className="field"
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      category: e.target.value as Category,
                    })
                  }
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Weight (g)</span>
                <input
                  className="field"
                  type="number"
                  min={1}
                  value={newItem.weightGrams}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      weightGrams: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Price (USD)</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  value={newItem.priceUsd}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      priceUsd: Number(e.target.value),
                    })
                  }
                />
              </label>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button
                  type="button"
                  className="chip"
                  data-active={newItem.worn}
                  onClick={() =>
                    setNewItem({ ...newItem, worn: !newItem.worn })
                  }
                >
                  Worn
                </button>
                <button
                  type="button"
                  className="chip"
                  data-active={newItem.consumable}
                  onClick={() =>
                    setNewItem({
                      ...newItem,
                      consumable: !newItem.consumable,
                    })
                  }
                >
                  Consumable
                </button>
                <button
                  type="button"
                  className="chip"
                  data-active={newItem.alsoAddToLocker}
                  onClick={() =>
                    setNewItem({
                      ...newItem,
                      alsoAddToLocker: !newItem.alsoAddToLocker,
                    })
                  }
                >
                  Also save to inventory
                </button>
              </div>
              <button
                type="button"
                className="pill pill-cta w-fit"
                disabled={pending || !newItem.name.trim()}
                onClick={addDirectItem}
              >
                <span className="arrow">
                  <Plus size={14} />
                </span>
                {pending ? "Adding…" : "Add to pack"}
              </button>
            </div>
          )}

          {pickerOpen && (
            <div className="panel space-y-3 p-4">
              <div className="text-sm font-semibold">
                Add owned gear to this pack
              </div>
              {availableLocker.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Nothing left in inventory for this pack. Use Add item above,
                  or{" "}
                  <Link href="/#gear" className="underline">
                    manage inventory
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <div className="flex max-h-56 flex-col gap-2 overflow-auto">
                    {availableLocker.map((item) => {
                      const on = selected.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="flex items-center justify-between rounded-xl border border-black/8 px-3 py-2 text-left text-sm"
                          onClick={() =>
                            setSelected((prev) =>
                              on
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id],
                            )
                          }
                        >
                          <span>
                            {item.name}{" "}
                            <span className="text-ink-soft">
                              · <Weight grams={item.weightGrams} />
                            </span>
                          </span>
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-full ${
                              on
                                ? "bg-[var(--lichen)] text-[var(--lichen-ink)]"
                                : "bg-black/5"
                            }`}
                          >
                            {on ? <Check size={14} /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="pill pill-cta"
                    disabled={!selected.length || pending}
                    onClick={addSelected}
                  >
                    Add {selected.length || ""} item
                    {selected.length === 1 ? "" : "s"}
                  </button>
                </>
              )}
            </div>
          )}

          {detail.items.length === 0 ? (
            <div className="glass-card-soft p-8 text-ink-soft">
              Nothing packed yet. Add an item, import a CSV, or pull from
              inventory.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groupedItems.map(([category, list]) => {
                const isCollapsed = collapsedCats[category];
                const grams = list.reduce(
                  (sum, i) => sum + i.weightGrams * i.quantity,
                  0,
                );
                const headerColor =
                  categoryColors[category] ?? DEFAULT_CATEGORY_COLORS[category];
                const headerInk = contrastOnColor(headerColor);
                const pickerOpen = colorPickerCat === category;
                return (
                  <div
                    key={category}
                    className="category-tile flex min-h-[220px] flex-col overflow-hidden"
                  >
                    <div
                      className="relative flex items-start justify-between gap-2 px-3.5 py-3"
                      style={{ background: headerColor, color: headerInk }}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() =>
                          setCollapsedCats((prev) => ({
                            ...prev,
                            [category]: !prev[category],
                          }))
                        }
                      >
                        <div className="text-[15px] font-semibold leading-tight tracking-tight">
                          {CATEGORY_LABELS[category]}
                        </div>
                        <div
                          className="mt-0.5 text-xs tabular-nums"
                          style={{ opacity: 0.85 }}
                        >
                          {list.length} item{list.length === 1 ? "" : "s"} ·{" "}
                          <Weight grams={grams} />
                        </div>
                      </button>
                      <div
                        className="relative flex shrink-0 items-center gap-1"
                        data-category-color-picker
                      >
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/15"
                          style={{ color: headerInk }}
                          aria-label={`Change ${CATEGORY_LABELS[category]} color`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorPickerCat((prev) =>
                              prev === category ? null : category,
                            );
                          }}
                        >
                          <Palette size={15} />
                        </button>
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/15"
                          style={{ color: headerInk }}
                          aria-label={
                            isCollapsed ? "Expand category" : "Collapse category"
                          }
                          onClick={() =>
                            setCollapsedCats((prev) => ({
                              ...prev,
                              [category]: !prev[category],
                            }))
                          }
                        >
                          <ChevronDown
                            size={16}
                            className={`transition ${
                              isCollapsed ? "-rotate-90" : ""
                            }`}
                          />
                        </button>
                        {pickerOpen && (
                          <div
                            className="absolute right-0 top-full z-20 mt-2 w-[188px] rounded-xl border border-black/10 bg-white p-2.5 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                              Header color
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {CATEGORY_COLOR_SWATCHES.map((swatch) => (
                                <button
                                  key={swatch}
                                  type="button"
                                  className="h-8 w-full rounded-md border border-black/10 transition hover:scale-105"
                                  style={{ background: swatch }}
                                  aria-label={`Set color ${swatch}`}
                                  onClick={() => {
                                    setCategoryColor(category, swatch);
                                    setColorPickerCat(null);
                                  }}
                                />
                              ))}
                            </div>
                            <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                              <span>Custom</span>
                              <input
                                type="color"
                                value={headerColor}
                                className="h-8 w-full cursor-pointer rounded border border-black/10 bg-transparent"
                                onChange={(e) =>
                                  setCategoryColor(category, e.target.value)
                                }
                              />
                            </label>
                            <button
                              type="button"
                              className="mt-2 w-full text-left text-xs text-ink-soft hover:text-ink"
                              onClick={() => {
                                setCategoryColor(
                                  category,
                                  DEFAULT_CATEGORY_COLORS[category],
                                );
                                setColorPickerCat(null);
                              }}
                            >
                              Reset default
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="flex flex-1 flex-col divide-y divide-black/8 bg-[rgba(255,255,255,0.82)]">
                        {list.map((item) => {
                          const open = openId === item.id;
                          return (
                            <div key={item.id} className="px-3 py-2">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 text-left"
                                onClick={() =>
                                  setOpenId(open ? null : item.id)
                                }
                              >
                                <div
                                  className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
                                  style={{ background: headerColor }}
                                  aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium leading-tight">
                                    {item.name}
                                    {item.quantity > 1 && (
                                      <span className="ml-1.5 rounded-full bg-black/8 px-1.5 py-0.5 text-[10px] font-medium">
                                        ×{item.quantity}
                                      </span>
                                    )}
                                  </div>
                                  <div className="truncate text-xs text-ink-soft">
                                    {item.brand || "Unbranded"}
                                    {item.worn ? " · Worn" : ""}
                                    {item.consumable ? " · Cons." : ""}
                                    {item.maybe ? " · Maybe" : ""}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                                  <Weight
                                    grams={item.weightGrams * item.quantity}
                                  />
                                </div>
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-black/10 bg-white">
                                  <ArrowUpRight
                                    size={13}
                                    className={`transition ${open ? "rotate-45" : ""}`}
                                  />
                                </span>
                              </button>
                              {open && (
                                <div className="mt-2 space-y-2 rounded-xl bg-[#e8eee6]/90 p-3">
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                                      Category
                                    </span>
                                    <select
                                      className="field field-sm field-category"
                                      value={item.category}
                                      onChange={(e) =>
                                        patchItem(item.id, {
                                          category: e.target.value,
                                        })
                                      }
                                    >
                                      {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                          {CATEGORY_LABELS[cat]}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="block space-y-1 sm:col-span-2">
                                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                                        Name
                                      </span>
                                      <input
                                        className="field field-sm"
                                        defaultValue={item.name}
                                        key={`name-${item.id}-${item.name}`}
                                        onBlur={(e) => {
                                          const value = e.target.value.trim();
                                          if (value && value !== item.name) {
                                            patchItem(item.id, { name: value });
                                          }
                                        }}
                                      />
                                    </label>
                                    <label className="block space-y-1">
                                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                                        Brand
                                      </span>
                                      <input
                                        className="field field-sm"
                                        defaultValue={item.brand}
                                        key={`brand-${item.id}-${item.brand}`}
                                        onBlur={(e) => {
                                          if (e.target.value !== item.brand) {
                                            patchItem(item.id, {
                                              brand: e.target.value,
                                            });
                                          }
                                        }}
                                      />
                                    </label>
                                    <label className="block space-y-1">
                                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                                        Weight (g)
                                      </span>
                                      <input
                                        className="field field-sm"
                                        type="number"
                                        min={1}
                                        defaultValue={item.weightGrams}
                                        key={`wt-${item.id}-${item.weightGrams}`}
                                        onBlur={(e) => {
                                          const value = Number(e.target.value);
                                          if (
                                            value > 0 &&
                                            value !== item.weightGrams
                                          ) {
                                            patchItem(item.id, {
                                              weightGrams: value,
                                            });
                                          }
                                        }}
                                      />
                                    </label>
                                    <label className="block space-y-1">
                                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                                        Price (USD)
                                      </span>
                                      <input
                                        className="field field-sm"
                                        type="number"
                                        min={0}
                                        defaultValue={item.priceUsd}
                                        key={`price-${item.id}-${item.priceUsd}`}
                                        onBlur={(e) => {
                                          const value = Number(e.target.value);
                                          if (
                                            Number.isFinite(value) &&
                                            value !== item.priceUsd
                                          ) {
                                            patchItem(item.id, {
                                              priceUsd: value,
                                            });
                                          }
                                        }}
                                      />
                                    </label>
                                    <label className="block space-y-1">
                                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                                        Qty
                                      </span>
                                      <input
                                        className="field field-sm"
                                        type="number"
                                        min={0}
                                        max={99}
                                        defaultValue={item.quantity}
                                        key={`qty-${item.id}-${item.quantity}`}
                                        onBlur={(e) => {
                                          const value = Number(e.target.value);
                                          if (
                                            Number.isFinite(value) &&
                                            value !== item.quantity
                                          ) {
                                            patchItem(item.id, {
                                              quantity: value,
                                            });
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                  {item.lockerItemId ? (
                                    <p className="text-[11px] text-ink-soft">
                                      Linked to inventory — edits update the
                                      locker too.
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-ink-soft">
                                      Pack-only item (not in inventory).
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      className="chip !px-2.5 !py-1 !text-xs"
                                      data-active={item.worn}
                                      onClick={() =>
                                        patchItem(item.id, {
                                          worn: !item.worn,
                                          maybe: false,
                                        })
                                      }
                                    >
                                      Worn
                                    </button>
                                    <button
                                      type="button"
                                      className="chip !px-2.5 !py-1 !text-xs"
                                      data-active={item.consumable}
                                      onClick={() =>
                                        patchItem(item.id, {
                                          consumable: !item.consumable,
                                        })
                                      }
                                    >
                                      Consumable
                                    </button>
                                    <button
                                      type="button"
                                      className="chip !px-2.5 !py-1 !text-xs"
                                      data-active={item.maybe}
                                      onClick={() =>
                                        patchItem(item.id, {
                                          maybe: !item.maybe,
                                          worn: false,
                                        })
                                      }
                                    >
                                      Maybe
                                    </button>
                                    <button
                                      type="button"
                                      className="chip !px-2.5 !py-1 !text-xs text-[var(--signal-fail)]"
                                      onClick={() => removeItem(item.id)}
                                    >
                                      <Trash2 size={12} className="mr-1" />
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isCollapsed && (
                      <button
                        type="button"
                        className="flex flex-1 items-center justify-center bg-[rgba(255,255,255,0.7)] px-3 py-6 text-sm text-ink-soft"
                        onClick={() =>
                          setCollapsedCats((prev) => ({
                            ...prev,
                            [category]: false,
                          }))
                        }
                      >
                        Expand items
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
