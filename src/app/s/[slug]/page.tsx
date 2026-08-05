import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CategoryBars } from "@/components/CategoryBars";
import { CloneShareButton } from "@/components/CloneShareButton";
import { GapPanel } from "@/components/GapPanel";
import { UnitToggle, Weight } from "@/components/UnitProvider";
import { seedIfEmpty } from "@/db/seed";
import { getTripBySlug } from "@/lib/trips";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_CATEGORY_COLORS,
  formatUsd,
  type Category,
} from "@/lib/units";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = { params: Promise<{ slug: string }> };

export default async function SharePage({ params }: Props) {
  await connection();
  await seedIfEmpty();
  const { slug } = await params;
  const detail = await getTripBySlug(slug);
  if (!detail) notFound();

  const { trip, trail, items, stats, checks, upgrades } = detail;
  const overTarget = stats.baseWeightGrams - trip.targetBaseWeightGrams;
  const isTrip = Boolean(trail) || trip.nights > 0;

  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="app-frame">
        <div className="app-shell bloom-shell">
          <header className="bloom-header">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-sm font-bold text-white">
                Bw
              </span>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold tracking-tight text-ink">
                  Baseweight
                </div>
                <div className="text-xs text-ink-soft">Shared pack</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <UnitToggle dark />
              <CloneShareButton slug={slug} />
            </div>
          </header>

          <div className="dash-scroll">
            <div className="dash-panel space-y-6">
              <section className="biz-card overflow-hidden">
                <div className="relative px-5 py-7 md:px-7 md:py-9">
                  <p className="text-sm font-medium text-[var(--accent)]">
                    {trail?.name ?? (isTrip ? "Custom route" : "Pack list")}
                  </p>
                  <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
                    {trip.name}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-ink-soft md:text-base">
                    {trail
                      ? `${trail.region} · ${trip.nights} night${trip.nights === 1 ? "" : "s"} · ${trip.season} · ${trail.difficulty}`
                      : isTrip
                        ? `${trip.nights} night${trip.nights === 1 ? "" : "s"} · ${trip.season}`
                        : `${stats.committedCount} items · no trip assigned`}
                  </p>
                  <div className="mt-7 grid max-w-3xl gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white/5 px-4 py-3">
                      <div className="text-2xl font-bold tracking-tight">
                        <Weight grams={stats.baseWeightGrams} />
                      </div>
                      <div className="mt-1 text-xs text-ink-soft">
                        Base weight
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 px-4 py-3">
                      <div className="text-2xl font-bold tracking-tight">
                        <Weight grams={stats.packWeightGrams} />
                      </div>
                      <div className="mt-1 text-xs text-ink-soft">
                        Pack (total − worn)
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 px-4 py-3">
                      <div className="text-2xl font-bold tracking-tight">
                        {stats.committedCount}
                      </div>
                      <div className="mt-1 text-xs text-ink-soft">
                        Packed items
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="biz-card p-4">
                  <div className="text-xs uppercase tracking-wide text-ink-soft">
                    vs target
                  </div>
                  <div className="mt-1.5 text-xl font-semibold">
                    {overTarget <= 0 ? (
                      <span className="trend-up">
                        <Weight grams={Math.abs(overTarget)} /> under
                      </span>
                    ) : (
                      <span className="text-[var(--accent)]">
                        <Weight grams={overTarget} /> over
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    Goal <Weight grams={trip.targetBaseWeightGrams} />
                  </p>
                </div>
                <div className="biz-card p-4">
                  <div className="text-xs uppercase tracking-wide text-ink-soft">
                    Worn / consumable / maybe
                  </div>
                  <div className="mt-1.5 text-xl font-semibold">
                    <Weight grams={stats.wornWeightGrams} /> ·{" "}
                    <Weight grams={stats.consumableWeightGrams} /> ·{" "}
                    <Weight grams={stats.maybeWeightGrams} />
                  </div>
                </div>
                <div className="biz-card p-4">
                  <div className="text-xs uppercase tracking-wide text-ink-soft">
                    Kit value
                  </div>
                  <div className="mt-1.5 text-xl font-semibold">
                    {formatUsd(stats.totalValueUsd)}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">
                      Pack list
                    </h2>
                    <span className="text-xs text-ink-soft">By category</span>
                  </div>

                  <div className="biz-card p-4">
                    <div className="mb-3 text-sm font-semibold">
                      Weight by category
                    </div>
                    <CategoryBars
                      rows={stats.categoryBreakdown}
                      totalGrams={stats.packWeightGrams}
                    />
                  </div>

                  {items.length === 0 ? (
                    <div className="biz-card p-6 text-sm text-ink-soft">
                      This pack has no items yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {CATEGORIES.map((cat) => {
                        const list = items.filter((i) => i.category === cat);
                        if (!list.length) return null;
                        const grams = list.reduce(
                          (sum, i) => sum + i.weightGrams * i.quantity,
                          0,
                        );
                        const accent =
                          DEFAULT_CATEGORY_COLORS[cat as Category];
                        return (
                          <div key={cat} className="category-section">
                            <div
                              className="flex items-center justify-between gap-2 px-4 py-2.5"
                              style={{ background: accent, color: "#f4f1ea" }}
                            >
                              <div className="text-sm font-semibold">
                                {CATEGORY_LABELS[cat]}
                              </div>
                              <div className="text-xs opacity-85">
                                {list.length} · <Weight grams={grams} />
                              </div>
                            </div>
                            <div className="divide-y divide-[var(--line)] bg-[rgba(28,30,38,0.55)]">
                              {list.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">
                                      {item.name}
                                      {item.quantity > 1 && (
                                        <span className="ml-1.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">
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
                                  <div className="shrink-0 text-right">
                                    <div className="text-sm font-semibold tabular-nums">
                                      <Weight
                                        grams={
                                          item.weightGrams * item.quantity
                                        }
                                      />
                                    </div>
                                    <div className="text-xs text-ink-soft">
                                      {formatUsd(item.priceUsd)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <aside className="space-y-4">
                  <div className="biz-card p-5">
                    <GapPanel checks={checks} upgrades={upgrades} />
                  </div>
                  <div className="biz-card border-[var(--accent)]/30 p-5">
                    <div className="font-semibold">Want this kit?</div>
                    <p className="mt-2 text-sm text-ink-soft">
                      Clone it into your packs, or discuss it in the community
                      feed.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <CloneShareButton slug={slug} />
                      <Link href="/#community" className="pill pill-soft">
                        Community
                      </Link>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4 text-sm text-ink-soft md:px-7">
            <span>Baseweight — packs, trips, and trail lessons</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[var(--accent)]"
            >
              Open app <ArrowRight size={14} />
            </Link>
          </footer>
        </div>
      </div>
    </>
  );
}
