import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { AddGearForm } from "@/components/AddGearForm";
import { AuthGate, AuthPanel } from "@/components/AuthPanel";
import { CommunityFeed } from "@/components/CommunityFeed";
import { JournalClient } from "@/components/JournalClient";
import { LockerClient } from "@/components/LockerClient";
import { PacksClient } from "@/components/PacksClient";
import { Recommender } from "@/components/Recommender";
import { Section } from "@/components/Section";
import { Shell } from "@/components/Shell";
import { Weight } from "@/components/UnitProvider";
import { db } from "@/db";
import { lockerItems } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { getCurrentUser, toPublicUser } from "@/lib/auth";
import { listCommunityPosts } from "@/lib/community";
import { listJournalEntries } from "@/lib/journal";
import { listTrails } from "@/lib/recommend";
import { getTripDetail, listTrips } from "@/lib/trips";
import { formatUsd } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await seedIfEmpty();
  const currentUser = await getCurrentUser();
  const user = currentUser ? toPublicUser(currentUser) : null;

  const [locker, tripRows, trails, posts, journal] = await Promise.all([
    user
      ? db
          .select()
          .from(lockerItems)
          .where(eq(lockerItems.userId, user.id))
          .orderBy(desc(lockerItems.createdAt))
      : Promise.resolve([]),
    user ? listTrips(user.id) : Promise.resolve([]),
    listTrails(),
    listCommunityPosts(),
    user ? listJournalEntries(user.id) : Promise.resolve([]),
  ]);

  const details = await Promise.all(tripRows.map((t) => getTripDetail(t.id)));
  const packs = details.filter(Boolean).map((d) => ({
    ...d!.trip,
    trail: d!.trail,
    stats: d!.stats,
    failCount: d!.checks.filter((c) => c.severity === "fail").length,
    warnCount: d!.checks.filter((c) => c.severity === "warn").length,
  }));

  const packOptions = details.filter(Boolean).map((d) => ({
    id: d!.trip.id,
    name: d!.trip.name,
    items: d!.items.map((i) => ({
      name: i.name,
      brand: i.brand,
      category: i.category,
    })),
  }));

  const mainPack = details[0] ?? null;
  const lockerValue = locker.reduce((s, i) => s + i.priceUsd * i.quantity, 0);
  const lockerSummary = {
    itemCount: locker.reduce((sum, i) => sum + i.quantity, 0),
    totalGrams: locker.reduce((sum, i) => sum + i.weightGrams * i.quantity, 0),
    totalValueUsd: lockerValue,
  };

  return (
    <Shell user={user}>
      {/* Hero */}
      <section id="home" className="onepager-section onepager-section-hero">
        <div className="topo-hero absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="relative z-10 px-6 pb-12 pt-20 text-center md:px-10">
          <p className="serif-label animate-rise text-white/80">Baseweight</p>
          <h1 className="animate-rise animate-rise-delay-1 mx-auto mt-4 max-w-3xl font-[family-name:var(--font-fraunces)] text-4xl font-semibold tracking-tight md:text-6xl">
            Pack lighter. Learn every trip.
          </h1>
          <p className="animate-rise animate-rise-delay-2 mx-auto mt-5 max-w-lg text-base text-white/80 md:text-lg">
            Build packs, assign trips when you need them, and journal what
            actually worked on trail.
          </p>
          <div className="animate-rise animate-rise-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={user ? "#packs" : "#account"}
              className="pill pill-cta"
            >
              <span className="arrow">
                <ArrowRight size={14} />
              </span>
              {user ? "Open packs" : "Sign in"}
            </a>
            <a href="#dashboard" className="pill pill-ghost">
              Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <Section
        id="dashboard"
        index="01"
        eyebrow="Dashboard"
        title="Your kit snapshot — packs first, trips when you need them."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              value: mainPack ? (
                <Weight grams={mainPack.stats.baseWeightGrams} />
              ) : (
                "—"
              ),
              label: "Main pack base",
              detail: mainPack?.trip.name ?? "Create a pack to see weight.",
              href: "#packs",
            },
            {
              value: String(packs.length),
              label: "Pack lists",
              detail: user
                ? `${lockerSummary.itemCount} gear pieces ready to load.`
                : "Sign in to manage packs.",
              href: "#packs",
            },
            {
              value: String(journal.length),
              label: "Journal entries",
              detail: "Trail notes on what to keep or cut.",
              href: "#journal",
            },
          ].map((stat, i) => (
            <a
              key={stat.label}
              href={stat.href}
              className={`glass-card block p-5 transition hover:-translate-y-0.5 animate-rise animate-rise-delay-${i + 1}`}
            >
              <div className="stat-number">{stat.value}</div>
              <div className="mt-3 font-semibold">{stat.label}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {stat.detail}
              </p>
            </a>
          ))}
        </div>

        {mainPack && (
          <div className="glass-card mt-4 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-soft">
                Main pack
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight">
                {mainPack.trip.name}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                <Weight grams={mainPack.stats.baseWeightGrams} /> base ·{" "}
                {mainPack.stats.committedCount} items ·{" "}
                {formatUsd(mainPack.stats.totalValueUsd)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/trips/${mainPack.trip.id}`} className="pill pill-cta">
                <span className="arrow">
                  <ArrowRight size={14} />
                </span>
                Edit pack
              </Link>
              <a href="#journal" className="pill pill-soft">
                Log a trip
              </a>
            </div>
          </div>
        )}

        {!user && (
          <div id="account" className="glass-card mt-4 scroll-mt-24 p-5">
            <AuthPanel user={user} />
          </div>
        )}
      </Section>

      {user && (
        <Section
          id="account"
          index="02"
          eyebrow="Account"
          title="You’re signed in — gear stays private to this login."
        >
          <div className="glass-card p-5">
            <AuthPanel user={user} />
          </div>
        </Section>
      )}

      {/* Packs */}
      <Section
        id="packs"
        index="03"
        eyebrow="Packs"
        title="Make a pack list. Assign a trip only if you need one."
      >
        <AuthGate
          user={user}
          message="Sign in to create and edit your pack lists."
        >
          <PacksClient initialPacks={packs} trails={trails} />
        </AuthGate>
      </Section>

      {/* Gear inventory */}
      <Section
        id="gear"
        index="04"
        eyebrow="Gear inventory"
        title="Your closet — add once, drop into any pack."
      >
        <AuthGate
          user={user}
          message="Sign in to manage gear you own."
        >
          <div className="glass-card p-4 md:p-6">
            <LockerClient initialItems={locker} summary={lockerSummary} />
            <div
              id="add-gear"
              className="mt-10 scroll-mt-24 border-t border-white/30 pt-8"
            >
              <h3 className="mb-4 text-xl font-semibold tracking-tight">
                Add gear
              </h3>
              <AddGearForm />
              <p className="mt-3 text-sm text-ink-soft">
                Tip: you can also add items directly on a pack, or import a
                LighterPack CSV under Packs.
              </p>
            </div>
          </div>
        </AuthGate>
      </Section>

      {/* Journal */}
      <Section
        id="journal"
        index="05"
        eyebrow="Trip journal"
        title="Record what worked, what didn’t, and which pieces to rethink."
      >
        <AuthGate
          user={user}
          message="Sign in to keep a trip journal tied to your packs."
        >
          <JournalClient initialEntries={journal} packs={packOptions} />
        </AuthGate>
      </Section>

      {/* Coach */}
      <Section
        id="coach"
        index="06"
        eyebrow="Pack coach"
        title="Constraints in, shortlisted kit out."
      >
        <div className="glass-card p-4 md:p-6">
          <Recommender trails={trails} />
        </div>
      </Section>

      {/* Community */}
      <Section
        id="community"
        index="07"
        eyebrow="Community"
        title="Shakedowns you can read, comment, and clone."
      >
        <div className="glass-card p-4 md:p-6">
          <CommunityFeed posts={posts} />
        </div>
      </Section>

      <footer className="px-6 py-10 text-center text-sm text-ink-soft md:px-10">
        Baseweight — packs, trips, and trail lessons in one glass frame.
      </footer>
    </Shell>
  );
}
