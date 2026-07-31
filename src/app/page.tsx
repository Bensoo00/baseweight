import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Shell } from "@/components/Shell";
import { StatGrid } from "@/components/StatGrid";
import { seedIfEmpty } from "@/db/seed";
import { db } from "@/db";
import { userGear } from "@/db/schema";
import { computePackStats } from "@/lib/pack-stats";
import { gramsToDisplay, formatUsd } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await seedIfEmpty();
  const gear = await db.select().from(userGear);
  const stats = computePackStats(gear);

  return (
    <Shell tone="immersive" active="/">
      <section className="relative flex flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/55" />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-10 text-center">
          <p className="serif-label animate-rise text-white/75">Baseweight</p>
          <h1 className="animate-rise animate-rise-delay-1 mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Know every ounce before you hit the trail.
          </h1>
          <p className="animate-rise animate-rise-delay-2 mt-5 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
            A friendly gear locker for backpackers and mountaineers — track base
            weight, compare kits, and get recommendations tuned to budget, trail,
            and conditions.
          </p>
          <div className="animate-rise animate-rise-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/pack" className="pill pill-cta">
              <span className="arrow">
                <ArrowRight size={14} />
              </span>
              Open my pack
            </Link>
            <Link href="/recommend" className="pill pill-ghost">
              Gear recommender
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f4f7f5] px-6 py-10 text-ink md:px-10 md:py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="serif-label text-ink-soft">Your kit snapshot</p>
            <p className="mt-1 text-xs text-ink-soft/80">(01 — live)</p>
          </div>
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight md:text-3xl">
            Real stats from the gear you already own — not vanity metrics.
          </h2>
        </div>

        <StatGrid
          items={[
            {
              value: gramsToDisplay(stats.baseWeightGrams),
              label: "Base weight",
              detail:
                "Packed gear excluding worn clothing and consumables. The number ultralighters obsess over.",
            },
            {
              value: String(stats.itemCount),
              label: "Packed items",
              detail:
                "Everything currently marked packed in your kit, across categories from shelter to stove fuel.",
            },
            {
              value: formatUsd(stats.totalValueUsd),
              label: "Kit value",
              detail:
                "Rough replacement cost of your tracked inventory — useful when budgeting upgrades.",
            },
          ]}
        />

        <div className="mt-10 h-16 overflow-hidden rounded-[1.4rem] bg-gradient-to-r from-[#2f4a3c] via-[#5f7f6e] to-[#d4a35c]" />
      </section>
    </Shell>
  );
}
