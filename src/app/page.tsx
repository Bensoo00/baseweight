import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { desc } from "drizzle-orm";
import { AddGearForm } from "@/components/AddGearForm";
import { CommunityFeed } from "@/components/CommunityFeed";
import { LockerClient } from "@/components/LockerClient";
import { Recommender } from "@/components/Recommender";
import { Section } from "@/components/Section";
import { Shell } from "@/components/Shell";
import { TripsClient } from "@/components/TripsClient";
import { Weight } from "@/components/UnitProvider";
import { db } from "@/db";
import { lockerItems } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { listCommunityPosts } from "@/lib/community";
import { listTrails } from "@/lib/recommend";
import { getTripDetail, listTrips } from "@/lib/trips";
import { formatUsd } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await seedIfEmpty();

  const [locker, tripRows, trails, posts] = await Promise.all([
    db.select().from(lockerItems).orderBy(desc(lockerItems.createdAt)),
    listTrips(),
    listTrails(),
    listCommunityPosts(),
  ]);

  const details = await Promise.all(tripRows.map((t) => getTripDetail(t.id)));
  const trips = details.filter(Boolean).map((d) => ({
    ...d!.trip,
    trail: d!.trail,
    stats: d!.stats,
    failCount: d!.checks.filter((c) => c.severity === "fail").length,
    warnCount: d!.checks.filter((c) => c.severity === "warn").length,
  }));

  const latest = details[0] ?? null;
  const lockerValue = locker.reduce((s, i) => s + i.priceUsd * i.quantity, 0);
  const lockerSummary = {
    itemCount: locker.reduce((sum, i) => sum + i.quantity, 0),
    totalGrams: locker.reduce((sum, i) => sum + i.weightGrams * i.quantity, 0),
    totalValueUsd: lockerValue,
  };

  return (
    <Shell>
      {/* 01 Hero */}
      <section id="home" className="onepager-section onepager-section-hero">
        <div className="topo-hero absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/20" />
        <div className="relative z-10 px-6 pb-14 pt-24 text-center md:px-10">
          <p className="serif-label animate-rise text-white/75">Baseweight</p>
          <h1 className="animate-rise animate-rise-delay-1 mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            Know every ounce before you hit the trail.
          </h1>
          <p className="animate-rise animate-rise-delay-2 mx-auto mt-5 max-w-xl text-base text-white/80 md:text-lg">
            One page for your locker, trip packs, coach, and community
            shakedowns — scroll to use everything.
          </p>
          <div className="animate-rise animate-rise-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#locker" className="pill pill-cta">
              <span className="arrow">
                <ArrowRight size={14} />
              </span>
              Start with locker
            </a>
            <a href="#trips" className="pill pill-ghost">
              Jump to trips
            </a>
          </div>
        </div>
      </section>

      {/* 02 Snapshot */}
      <Section
        id="snapshot"
        index="01 — 04"
        eyebrow="Snapshot"
        title="Your kit at a glance — then keep scrolling to manage it."
      >
        <div className="grid gap-8 border-t border-black/8 pt-8 md:grid-cols-3">
          {[
            {
              value: latest ? (
                <Weight grams={latest.stats.baseWeightGrams} />
              ) : (
                "—"
              ),
              label: "Latest base weight",
              detail: latest?.trip.name ?? "Create a trip pack below.",
            },
            {
              value: String(lockerSummary.itemCount),
              label: "Locker pieces",
              detail: `${formatUsd(lockerValue)} in owned gear ready to pack.`,
            },
            {
              value: String(posts.length),
              label: "Community posts",
              detail: "Shakedowns you can read, comment, and clone.",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`animate-rise animate-rise-delay-${i + 1}`}
            >
              <div className="stat-number">{stat.value}</div>
              <div className="mt-3 font-semibold">{stat.label}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {stat.detail}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 h-14 overflow-hidden rounded-[1.4rem] bg-gradient-to-r from-[#2f4a3c] via-[#5f7f6e] to-[#c6f06a]" />
      </Section>

      {/* 03 Locker */}
      <Section
        id="locker"
        index="02 — 04"
        eyebrow="Gear locker"
        title="Own it once. Drop it into any trip later."
        tone="ink"
      >
        <div className="rounded-[1.5rem] bg-[var(--paper)] p-4 text-ink md:p-6">
          <LockerClient initialItems={locker} summary={lockerSummary} />
          <div id="add-gear" className="mt-10 scroll-mt-24 border-t border-black/8 pt-8">
            <h3 className="mb-4 text-xl font-semibold tracking-tight">
              Add gear
            </h3>
            <AddGearForm />
          </div>
        </div>
      </Section>

      {/* 04 Trips */}
      <Section
        id="trips"
        index="03 — 04"
        eyebrow="Trip packs"
        title="Build a pack for the trail — checks and share links included."
      >
        <TripsClient initialTrips={trips} trails={trails} />
        {latest && (
          <p className="mt-6 text-sm text-ink-soft">
            Tip: open a trip for full editing, gap checks, and{" "}
            <Link href={`/s/${latest.trip.shareSlug}`} className="underline">
              public share view
            </Link>
            .
          </p>
        )}
      </Section>

      {/* 05 Coach */}
      <Section
        id="coach"
        index="04 — 04"
        eyebrow="Pack coach"
        title="Tell us the trip constraints. We’ll shortlist the kit."
        tone="ink"
      >
        <div className="rounded-[1.5rem] bg-[var(--paper)] p-4 text-ink md:p-6">
          <Recommender trails={trails} />
        </div>
      </Section>

      {/* 06 Community */}
      <Section
        id="community"
        index="05"
        eyebrow="Community"
        title="Shakedowns, comments, and copyable packs."
      >
        <CommunityFeed posts={posts} />
      </Section>

      <footer className="border-t border-black/8 px-6 py-10 text-center text-sm text-ink-soft md:px-10">
        Baseweight — pack coach for real trails. Use the taskbar to jump
        sections.
      </footer>
    </Shell>
  );
}
