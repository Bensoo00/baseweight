"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Trail } from "@/db/schema";
import type { ScoredRecommendation } from "@/lib/recommend";
import { Weight } from "@/components/UnitProvider";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  formatUsd,
  type Category,
} from "@/lib/units";

type Result = {
  trail: Trail | null;
  recommendations: ScoredRecommendation[];
  totalCandidates: number;
};

export function Recommender({ trails }: { trails: Trail[] }) {
  const [budget, setBudget] = useState(300);
  const [maxWeightOz, setMaxWeightOz] = useState(40);
  const [trailId, setTrailId] = useState<number | "">(trails[0]?.id ?? "");
  const [category, setCategory] = useState<Category | "">("");
  const [skillLevel, setSkillLevel] = useState<
    "beginner" | "intermediate" | "advanced"
  >("intermediate");
  const [prioritize, setPrioritize] = useState<
    "weight" | "value" | "comfort" | "durability"
  >("weight");
  const [result, setResult] = useState<Result | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const params = new URLSearchParams({
        budget: String(budget),
        maxWeightOz: String(maxWeightOz),
        skillLevel,
        prioritize,
      });
      if (trailId) params.set("trailId", String(trailId));
      if (category) params.set("category", category);
      const res = await fetch(`/api/recommend?${params}`);
      const data = (await res.json()) as Result;
      setResult(data);
      setOpenId(data.recommendations[0]?.id ?? null);
    });
  }

  useEffect(() => {
    run();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addToLocker(item: ScoredRecommendation) {
    await fetch("/api/locker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: item.name,
        brand: item.brand,
        category: item.category,
        weightGrams: item.weightGrams,
        priceUsd: item.priceUsd,
        catalogItemId: item.id,
        notes: `Recommended for ${result?.trail?.name ?? "your trip"}`,
      }),
    });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 1600);
  }

  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-[0.95fr_1.25fr]">
      <aside className="space-y-5">
        <div>
          <p className="serif-label text-ink-soft">Pack coach</p>
          <p className="mt-1 text-xs text-ink-soft/70">SQL catalog · trail-aware</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Tell us the trip. We&apos;ll shortlist the kit.
          </h1>
        </div>

        <div className="panel space-y-4 p-5">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Trail</span>
            <select
              className="field"
              value={trailId}
              onChange={(e) =>
                setTrailId(e.target.value ? Number(e.target.value) : "")
              }
            >
              {trails.map((trail) => (
                <option key={trail.id} value={trail.id}>
                  {trail.name} · {trail.difficulty}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold">
              Budget per item — {formatUsd(budget)}
            </span>
            <input
              type="range"
              min={40}
              max={800}
              step={10}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-[var(--ridge)]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold">
              Max item weight — {maxWeightOz} oz
            </span>
            <input
              type="range"
              min={4}
              max={80}
              step={1}
              value={maxWeightOz}
              onChange={(e) => setMaxWeightOz(Number(e.target.value))}
              className="w-full accent-[var(--ridge)]"
            />
          </label>

          <div>
            <div className="mb-2 text-sm font-semibold">Category</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="chip"
                data-active={category === ""}
                onClick={() => setCategory("")}
              >
                Any
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="chip"
                  data-active={category === cat}
                  onClick={() => setCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Skill</span>
              <select
                className="field"
                value={skillLevel}
                onChange={(e) =>
                  setSkillLevel(
                    e.target.value as "beginner" | "intermediate" | "advanced",
                  )
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Prioritize</span>
              <select
                className="field"
                value={prioritize}
                onChange={(e) =>
                  setPrioritize(
                    e.target.value as
                      | "weight"
                      | "value"
                      | "comfort"
                      | "durability",
                  )
                }
              >
                <option value="weight">Lowest weight</option>
                <option value="value">Best value</option>
                <option value="comfort">Comfort</option>
                <option value="durability">Durability</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="pill pill-cta"
            onClick={run}
            disabled={pending}
          >
            <span className="arrow">
              <Sparkles size={14} />
            </span>
            {pending ? "Scoring…" : "Update recommendations"}
          </button>
        </div>

        {result?.trail && (
          <div className="rounded-[1.5rem] bg-[#eef3ef] p-5 text-sm leading-relaxed text-ink-soft">
            <div className="font-semibold text-ink">{result.trail.name}</div>
            <p className="mt-2">
              {result.trail.region} · {result.trail.distanceMiles} mi ·{" "}
              {result.trail.elevationGainFt.toLocaleString()} ft gain ·{" "}
              {result.trail.climate} climate
            </p>
            <p className="mt-2">{result.trail.notes}</p>
          </div>
        )}
      </aside>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="max-w-md text-2xl font-semibold tracking-tight">
            Ranked from the catalog using your constraints.
          </h2>
          <div className="text-sm text-ink-soft">
            {result ? `${result.recommendations.length} shown` : "Loading…"}
          </div>
        </div>

        <div className="divide-y divide-black/8 overflow-hidden rounded-[1.25rem] border border-black/8 bg-white/80">
          {(result?.recommendations ?? []).map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} className="px-5 py-4">
                <button
                  type="button"
                  className="flex w-full items-center gap-4 text-left"
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {item.brand} {item.name}
                    </div>
                    <div className="text-sm text-ink-soft">
                      {CATEGORY_LABELS[item.category as Category]} · score{" "}
                      {item.score}
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="font-semibold">
                      <Weight grams={item.weightGrams} />
                    </div>
                    <div className="text-sm text-ink-soft">
                      {formatUsd(item.priceUsd)}
                    </div>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white">
                    <ArrowRight
                      size={16}
                      className={`transition ${open ? "rotate-90" : ""}`}
                    />
                  </span>
                </button>

                {open && (
                  <div className="mt-4 space-y-3 rounded-2xl bg-[var(--paper-2)] p-4">
                    <p className="text-sm leading-relaxed text-ink-soft">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="chip">Durability {item.durability}/10</span>
                      <span className="chip">Comfort {item.comfort}/10</span>
                      <span className="chip">Trail fit {item.trailFit}%</span>
                      {item.rValue != null && (
                        <span className="chip">R-{item.rValue}</span>
                      )}
                      {item.temperatureRatingF != null && (
                        <span className="chip">
                          {item.temperatureRatingF}°F
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1 text-sm text-ink-soft">
                      {item.reasons.map((reason) => (
                        <li key={reason}>· {reason}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="pill pill-cta"
                      onClick={() => addToLocker(item)}
                    >
                      <span className="arrow">
                        <ArrowRight size={14} />
                      </span>
                      {addedId === item.id ? "Added to locker" : "Add to locker"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {result && result.recommendations.length === 0 && (
            <div className="p-8 text-ink-soft">
              No catalog items match those constraints. Loosen budget or weight.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
