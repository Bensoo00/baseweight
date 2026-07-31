"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  formatUsd,
  gramsToDisplay,
  type Category,
} from "@/lib/units";

const steps = ["Basics", "Stats", "Flags"] as const;

export function AddGearForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    brand: "",
    category: "sleep" as Category,
    weightGrams: 300,
    priceUsd: 100,
    quantity: 1,
    worn: false,
    consumable: false,
    packed: true,
    notes: "",
  });

  const preview = useMemo(() => {
    const total = form.weightGrams * form.quantity;
    const contributesToBase = form.packed && !form.worn && !form.consumable;
    return {
      total,
      contributesToBase,
      label: contributesToBase
        ? "Adds to base weight"
        : form.worn
          ? "Worn — excluded from base weight"
          : form.consumable
            ? "Consumable — excluded from base weight"
            : "Not packed",
    };
  }, [form]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    setError(null);
    if (step === 0 && !form.name.trim()) {
      setError("Give your gear a name first.");
      return;
    }
    if (step < steps.length - 1) setStep((s) => s + 1);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/gear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError("Could not save gear. Check the fields and try again.");
        return;
      }
      router.push("/pack");
      router.refresh();
    });
  }

  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <div className="mb-6">
          <p className="serif-label text-ink-soft">Add gear</p>
          <p className="mt-1 text-xs text-ink-soft/70">
            Step {step + 1} of {steps.length} — {steps[step]}
          </p>
          <h1 className="mt-4 max-w-lg text-3xl font-semibold tracking-tight md:text-4xl">
            Log kit in under a minute without spreadsheet pain.
          </h1>
        </div>

        <div className="mb-6 flex gap-2">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              className="chip"
              data-active={step === index}
              onClick={() => setStep(index)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4 rounded-[1.5rem] border border-black/8 bg-white/75 p-5 md:p-7">
          {step === 0 && (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-semibold">What is it?</span>
                <input
                  className="field"
                  placeholder="e.g. NeoAir XLite NXT"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  autoFocus
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold">Brand</span>
                <input
                  className="field"
                  placeholder="Therm-a-Rest"
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}
                />
              </label>
              <div>
                <div className="mb-2 text-sm font-semibold">Category</div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className="chip"
                      data-active={form.category === cat}
                      onClick={() => update("category", cat)}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-semibold">
                  Weight (grams) — {gramsToDisplay(form.weightGrams)}
                </span>
                <input
                  type="range"
                  min={10}
                  max={4000}
                  step={1}
                  value={form.weightGrams}
                  onChange={(e) => update("weightGrams", Number(e.target.value))}
                  className="w-full accent-[var(--ridge)]"
                />
                <input
                  className="field"
                  type="number"
                  value={form.weightGrams}
                  onChange={(e) => update("weightGrams", Number(e.target.value))}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold">Price (USD)</span>
                  <input
                    className="field"
                    type="number"
                    value={form.priceUsd}
                    onChange={(e) => update("priceUsd", Number(e.target.value))}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold">Quantity</span>
                  <input
                    className="field"
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => update("quantity", Number(e.target.value))}
                  />
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold">Notes</span>
                <textarea
                  className="field min-h-24 resize-y"
                  placeholder="Size, colorway, trail notes…"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                />
              </label>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {(
                [
                  ["packed", "Packed in this kit", "Counts toward pack totals"],
                  ["worn", "Worn while hiking", "Excluded from base weight"],
                  [
                    "consumable",
                    "Consumable",
                    "Food, fuel, water — excluded from base weight",
                  ],
                ] as const
              ).map(([key, title, detail]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update(key, !form[key])}
                  className="flex w-full items-center justify-between rounded-2xl border border-black/8 bg-[#f5f8f5] px-4 py-4 text-left"
                >
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-sm text-ink-soft">{detail}</div>
                  </div>
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${
                      form[key]
                        ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                        : "bg-white text-ink-soft"
                    }`}
                  >
                    {form[key] ? <Check size={16} /> : null}
                  </span>
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            {step > 0 && (
              <button
                type="button"
                className="pill border border-black/10 bg-white"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button type="button" className="pill pill-cta" onClick={next}>
                <span className="arrow">
                  <ArrowRight size={14} />
                </span>
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="pill pill-cta"
                onClick={submit}
                disabled={pending}
              >
                <span className="arrow">
                  <Check size={14} />
                </span>
                {pending ? "Saving…" : "Save to pack"}
              </button>
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="floaty rounded-[1.5rem] bg-gradient-to-br from-[#24362d] via-[#304a3c] to-[#1a2820] p-6 text-white">
          <p className="serif-label text-white/70">Live preview</p>
          <h2 className="mt-3 text-2xl font-semibold">
            {form.name || "Untitled gear"}
          </h2>
          <p className="mt-1 text-white/70">
            {form.brand || "No brand"} · {CATEGORY_LABELS[form.category]}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div>
              <div className="stat-number text-3xl text-white">
                {gramsToDisplay(preview.total)}
              </div>
              <div className="mt-2 text-sm text-white/70">Total weight</div>
            </div>
            <div>
              <div className="stat-number text-3xl text-white">
                {formatUsd(form.priceUsd * form.quantity)}
              </div>
              <div className="mt-2 text-sm text-white/70">Line value</div>
            </div>
          </div>
          <p className="mt-6 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/85">
            {preview.label}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-black/8 bg-white/70 p-5">
          <div className="text-sm font-semibold">Why these fields?</div>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
            <li>Base weight ignores worn clothes and consumables — classic UL math.</li>
            <li>Category breakdown shows where ounces hide in your kit.</li>
            <li>Price helps the recommender suggest upgrades within budget.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
