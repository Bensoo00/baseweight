"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Weight } from "@/components/UnitProvider";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  formatUsd,
  type Category,
} from "@/lib/units";

export const LOCKER_UPDATED_EVENT = "bw:locker-updated";

const emptyForm = {
  name: "",
  brand: "",
  category: "other" as Category,
  weightGrams: 200,
  priceUsd: 0,
  quantity: 1,
  wornDefault: false,
  consumableDefault: false,
  notes: "",
};

export function AddGearForm({
  onSaved,
  compact = false,
}: {
  onSaved?: () => void;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Give your gear a name first.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/locker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError("Could not save gear. Check the fields and try again.");
        return;
      }
      setForm(emptyForm);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
      window.dispatchEvent(new CustomEvent(LOCKER_UPDATED_EVENT));
      onSaved?.();
    });
  }

  return (
    <div className={compact ? "space-y-4" : "grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"}>
      <div className="space-y-4">
        {!compact && (
          <div>
            <p className="serif-label text-ink-soft">Quick add</p>
            <p className="mt-1 text-sm text-ink-soft">
              One form — no wizard. Or skip this and add items straight on a pack.
            </p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1.5 md:col-span-2">
            <span className="text-sm font-semibold">Name</span>
            <input
              className="field"
              placeholder="e.g. NeoAir XLite NXT"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Brand</span>
            <input
              className="field"
              placeholder="Therm-a-Rest"
              value={form.brand}
              onChange={(e) => update("brand", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Category</span>
            <select
              className="field"
              value={form.category}
              onChange={(e) => update("category", e.target.value as Category)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">
              Weight (g) — <Weight grams={form.weightGrams * form.quantity} />
            </span>
            <input
              className="field"
              type="number"
              min={1}
              value={form.weightGrams}
              onChange={(e) => update("weightGrams", Number(e.target.value))}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Price (USD)</span>
            <input
              className="field"
              type="number"
              min={0}
              value={form.priceUsd}
              onChange={(e) => update("priceUsd", Number(e.target.value))}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Qty</span>
            <input
              className="field"
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => update("quantity", Number(e.target.value))}
            />
          </label>
          <label className="block space-y-1.5 md:col-span-2">
            <span className="text-sm font-semibold">Notes</span>
            <input
              className="field"
              placeholder="Optional"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="chip"
            data-active={form.wornDefault}
            onClick={() => update("wornDefault", !form.wornDefault)}
          >
            Worn
          </button>
          <button
            type="button"
            className="chip"
            data-active={form.consumableDefault}
            onClick={() => update("consumableDefault", !form.consumableDefault)}
          >
            Consumable
          </button>
        </div>

        {error && <p className="text-sm text-[var(--signal-fail)]">{error}</p>}

        <button
          type="button"
          className="pill pill-cta"
          onClick={submit}
          disabled={pending}
        >
          <span className="arrow">
            {savedFlash ? <Check size={14} /> : <ArrowRight size={14} />}
          </span>
          {pending ? "Saving…" : savedFlash ? "Saved" : "Save to inventory"}
        </button>
      </div>

      {!compact && (
        <aside className="panel-ink h-fit p-5">
          <p className="text-sm text-white/70">Preview</p>
          <p className="mt-2 text-xl font-semibold">
            {form.name || "Untitled gear"}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {form.brand || "No brand"} · {CATEGORY_LABELS[form.category]}
          </p>
          <p className="mt-4 text-sm text-white/85">
            <Weight grams={form.weightGrams * form.quantity} /> ·{" "}
            {formatUsd(form.priceUsd * form.quantity)}
          </p>
        </aside>
      )}
    </div>
  );
}
