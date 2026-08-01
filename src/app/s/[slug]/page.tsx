import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CategoryBars } from "@/components/CategoryBars";
import { CloneShareButton } from "@/components/CloneShareButton";
import { GapPanel } from "@/components/GapPanel";
import { UnitToggle, Weight } from "@/components/UnitProvider";
import { seedIfEmpty } from "@/db/seed";
import { getTripBySlug } from "@/lib/trips";
import { CATEGORY_LABELS, formatUsd, type Category } from "@/lib/units";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function SharePage({ params }: Props) {
  await seedIfEmpty();
  const { slug } = await params;
  const detail = await getTripBySlug(slug);
  if (!detail) notFound();

  const { trip, trail, items, stats, checks, upgrades } = detail;
  const overTarget = stats.baseWeightGrams - trip.targetBaseWeightGrams;

  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="app-frame">
        <div className="app-shell">
          <header className="flex items-center justify-between gap-4 border-b border-black/8 px-5 py-4 md:px-7">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-semibold text-lichen">
                Bw
              </span>
              <div>
                <div className="font-[family-name:var(--font-fraunces)] text-xl">
                  Baseweight
                </div>
                <div className="text-xs text-ink-soft">Shared trip pack</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <UnitToggle />
              <CloneShareButton slug={slug} />
            </div>
          </header>

          <div className="flex-1 px-5 py-8 md:px-8">
            <div className="topo-hero mb-8 overflow-hidden rounded-[1.25rem] px-6 py-10 text-white md:px-8">
              <p className="serif-label text-white/75">
                {trail?.name ?? "Custom route"}
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
                {trip.name}
              </h1>
              <p className="mt-3 max-w-2xl text-white/80">
                {trail
                  ? `${trail.region} · ${trip.nights} nights · ${trip.season} · ${trail.difficulty}`
                  : `${trip.nights} nights · ${trip.season}`}
              </p>
              <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
                <div>
                  <div className="stat-number text-3xl text-white">
                    <Weight grams={stats.baseWeightGrams} />
                  </div>
                  <div className="mt-2 text-sm text-white/70">Base weight</div>
                </div>
                <div>
                  <div className="stat-number text-3xl text-white">
                    <Weight grams={stats.packWeightGrams} />
                  </div>
                  <div className="mt-2 text-sm text-white/70">
                    Pack (total − worn)
                  </div>
                </div>
                <div>
                  <div className="stat-number text-3xl text-white">
                    {stats.committedCount}
                  </div>
                  <div className="mt-2 text-sm text-white/70">Packed items</div>
                </div>
              </div>
            </div>

            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="panel p-5">
                <div className="text-sm text-ink-soft">vs target</div>
                <div className="mt-2 text-2xl font-semibold">
                  {overTarget <= 0 ? (
                    <>
                      <Weight grams={Math.abs(overTarget)} /> under
                    </>
                  ) : (
                    <>
                      <Weight grams={overTarget} /> over
                    </>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  Goal <Weight grams={trip.targetBaseWeightGrams} />
                </p>
              </div>
              <div className="panel p-5">
                <div className="text-sm text-ink-soft">Worn / consumable / maybe</div>
                <div className="mt-2 text-2xl font-semibold">
                  <Weight grams={stats.wornWeightGrams} /> ·{" "}
                  <Weight grams={stats.consumableWeightGrams} /> ·{" "}
                  <Weight grams={stats.maybeWeightGrams} />
                </div>
              </div>
              <div className="panel p-5">
                <div className="text-sm text-ink-soft">Kit value</div>
                <div className="mt-2 text-2xl font-semibold">
                  {formatUsd(stats.totalValueUsd)}
                </div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">The pack</h2>
                <div className="panel p-5">
                  <div className="mb-4 text-sm font-semibold">Category bars</div>
                  <CategoryBars
                    rows={stats.categoryBreakdown}
                    totalGrams={stats.packWeightGrams}
                  />
                </div>
                <div className="divide-y divide-black/8 overflow-hidden rounded-[1.25rem] border border-black/8 bg-white/80">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div>
                        <div className="font-semibold">
                          {item.name}
                          {item.quantity === 0 && (
                            <span className="ml-2 rounded-full bg-black/8 px-2 py-0.5 text-xs">
                              qty 0
                            </span>
                          )}
                          {item.quantity > 1 && (
                            <span className="ml-2 rounded-full bg-black/8 px-2 py-0.5 text-xs">
                              ×{item.quantity}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-ink-soft">
                          {item.brand || "Unbranded"} ·{" "}
                          {CATEGORY_LABELS[item.category as Category]}
                          {item.worn ? " · Worn" : ""}
                          {item.consumable ? " · Consumable" : ""}
                          {item.maybe ? " · Maybe" : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          <Weight grams={item.weightGrams * item.quantity} />
                        </div>
                        <div className="text-sm text-ink-soft">
                          {formatUsd(item.priceUsd)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="space-y-6">
                <GapPanel checks={checks} upgrades={upgrades} />
                <div className="panel-ink p-5">
                  <div className="font-semibold">Want this kit?</div>
                  <p className="mt-2 text-sm text-white/70">
                    Clone it into your trips, or discuss it in Community.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <CloneShareButton slug={slug} dark />
                    <Link href="/community" className="pill pill-ghost">
                      Community
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-black/8 px-5 py-4 text-sm text-ink-soft md:px-7">
            <span>Built with Baseweight — pack coach for real trails</span>
            <Link href="/" className="inline-flex items-center gap-1 text-ink">
              Try it <ArrowRight size={14} />
            </Link>
          </footer>
        </div>
      </div>
    </>
  );
}
