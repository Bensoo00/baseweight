"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Megaphone,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import type { LockerItem, Trail, Trip, TripItem } from "@/db/schema";
import type { GapCheck, UpgradeSuggestion } from "@/lib/gap-checks";
import type { PackStats } from "@/lib/pack-stats";
import { LOCKER_UPDATED_EVENT } from "@/components/AddGearForm";
import { CategoryBars } from "@/components/CategoryBars";
import { GapPanel } from "@/components/GapPanel";
import { Weight, useUnit } from "@/components/UnitProvider";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  formatUsd,
  type Category,
} from "@/lib/units";

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
  const { unit, format } = useUnit();
  const [detail, setDetail] = useState(initial);
  const [pending, startTransition] = useTransition();
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
  }, []);

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

  function applyDetail(data: Detail) {
    setDetail(data);
  }

  function saveTrip(patch: Record<string, unknown>) {
    startTransition(async () => {
      const res = await fetch(`/api/trips/${detail.trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      applyDetail(await res.json());
    });
  }

  function addSelected() {
    startTransition(async () => {
      const res = await fetch(`/api/trips/${detail.trip.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockerItemIds: selected }),
      });
      applyDetail(await res.json());
      setSelected([]);
      setPickerOpen(false);
    });
  }

  function addDirectItem() {
    if (!newItem.name.trim()) return;
    startTransition(async () => {
      const res = await fetch(`/api/trips/${detail.trip.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: newItem }),
      });
      if (!res.ok) return;
      applyDetail(await res.json());
      if (newItem.alsoAddToLocker) {
        window.dispatchEvent(new CustomEvent(LOCKER_UPDATED_EVENT));
      }
      setNewItem((prev) => ({
        ...prev,
        name: "",
        brand: "",
        weightGrams: 100,
        priceUsd: 0,
      }));
      setAddOpen(false);
    });
  }

  function patchItem(id: number, patch: Record<string, unknown>) {
    startTransition(async () => {
      const res = await fetch(`/api/trips/${detail.trip.id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      applyDetail(await res.json());
    });
  }

  function removeItem(itemId: number) {
    startTransition(async () => {
      const res = await fetch(
        `/api/trips/${detail.trip.id}/items?itemId=${itemId}`,
        { method: "DELETE" },
      );
      applyDetail(await res.json());
    });
  }

  async function copyShare() {
    const url = `${window.location.origin}/s/${detail.trip.shareSlug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
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
            {copied ? "Copied link" : "Share link"}
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
          <Link
            href={`/s/${detail.trip.shareSlug}`}
            className="pill pill-cta"
            target="_blank"
          >
            <span className="arrow">
              <ArrowUpRight size={14} />
            </span>
            Public view
          </Link>
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
            <div className="space-y-3">
              {groupedItems.map(([category, list]) => {
                const isCollapsed = collapsedCats[category];
                const grams = list.reduce(
                  (sum, i) => sum + i.weightGrams * i.quantity,
                  0,
                );
                return (
                  <div
                    key={category}
                    className="overflow-hidden rounded-[1.25rem] border border-black/10 bg-white/90"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
                      onClick={() =>
                        setCollapsedCats((prev) => ({
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
                        className={`shrink-0 text-ink-soft transition ${
                          isCollapsed ? "-rotate-90" : ""
                        }`}
                      />
                    </button>

                    {!isCollapsed && (
                      <div className="divide-y divide-black/8 border-t border-black/8">
                        {list.map((item) => {
                          const open = openId === item.id;
                          return (
                            <div key={item.id} className="px-5 py-3.5">
                              <button
                                type="button"
                                className="flex w-full items-center gap-4 text-left"
                                onClick={() =>
                                  setOpenId(open ? null : item.id)
                                }
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-semibold">
                                    {item.name}
                                    {item.quantity === 0 && (
                                      <span className="ml-2 rounded-full bg-black/8 px-2 py-0.5 text-xs font-medium">
                                        qty 0
                                      </span>
                                    )}
                                    {item.quantity > 1 && (
                                      <span className="ml-2 rounded-full bg-black/8 px-2 py-0.5 text-xs font-medium">
                                        ×{item.quantity}
                                      </span>
                                    )}
                                  </div>
                                  <div className="truncate text-sm text-ink-soft">
                                    {item.brand || "Unbranded"}
                                    {item.worn ? " · Worn" : ""}
                                    {item.consumable ? " · Consumable" : ""}
                                    {item.maybe ? " · Maybe" : ""}
                                  </div>
                                </div>
                                <div className="hidden text-right sm:block">
                                  <div className="font-semibold tabular-nums">
                                    <Weight
                                      grams={item.weightGrams * item.quantity}
                                    />
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
                                <div className="mt-3 space-y-3 rounded-2xl bg-[var(--paper-2)] p-4">
                                  <label className="block space-y-1.5">
                                    <span className="text-sm font-semibold">
                                      Category
                                    </span>
                                    <select
                                      className="field"
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
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      className="chip"
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
                                      className="chip"
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
                                      className="chip"
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
                                      className="chip text-[var(--signal-fail)]"
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
