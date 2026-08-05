"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { AuthGate, AuthPanel } from "@/components/AuthPanel";
import { CommunityFeed } from "@/components/CommunityFeed";
import { JournalClient } from "@/components/JournalClient";
import { LockerClient } from "@/components/LockerClient";
import { PacksClient } from "@/components/PacksClient";
import { Shell, type DashTabId } from "@/components/Shell";
import { TripsClient } from "@/components/TripsClient";
import { Weight, useUnit } from "@/components/UnitProvider";
import type { JournalEntryDetail } from "@/lib/journal";
import type { CommunityPostWithMeta } from "@/lib/community";
import type { PackStats } from "@/lib/pack-stats";
import { CATEGORY_LABELS, type Category } from "@/lib/units";
import type { LockerItem, PublicUser, Trail } from "@/db/schema";

type PackRow = {
  id: number;
  name: string;
  nights: number;
  season: string;
  shareSlug: string;
  targetBaseWeightGrams: number;
  trail: Trail | null;
  stats: PackStats;
  failCount: number;
  warnCount: number;
};

type Props = {
  user: PublicUser | null;
  packs: PackRow[];
  locker: LockerItem[];
  lockerSummary: {
    itemCount: number;
    totalGrams: number;
    totalValueUsd: number;
  };
  trails: Trail[];
  posts: CommunityPostWithMeta[];
  journal: JournalEntryDetail[];
  packOptions: {
    id: number;
    name: string;
    items: { name: string; brand: string; category: string }[];
  }[];
};

export function DashboardApp(props: Props) {
  const [tab, setTab] = useState<DashTabId>("dashboard");

  const primaryAction = useMemo(() => {
    if (tab === "collection") return null;
    if (tab === "trips") {
      return { label: "New trip", onClick: () => setTab("trips") };
    }
    if (tab === "community") {
      return { label: "Open packs", onClick: () => setTab("packs") };
    }
    return { label: "New pack", onClick: () => setTab("packs") };
  }, [tab]);

  return (
    <Shell
      user={props.user}
      activeTab={tab}
      onTabChange={setTab}
      primaryAction={primaryAction ?? undefined}
    >
      <div className="dash-panel">
        {tab === "dashboard" && (
          <DashboardHome
            user={props.user}
            packs={props.packs}
            journalCount={props.journal.length}
            onOpen={setTab}
          />
        )}

        {tab === "collection" && (
          <Panel
            title="Item collection"
            subtitle="Your closet — add rows inline, like LighterPack."
          >
            <AuthGate
              user={props.user}
              message="Sign in to manage gear you own."
            >
              <LockerClient
                initialItems={props.locker}
                summary={props.lockerSummary}
              />
            </AuthGate>
          </Panel>
        )}

        {tab === "packs" && (
          <Panel
            title="Packs"
            subtitle="Build lists. Assign a trip only when you need one."
          >
            <AuthGate
              user={props.user}
              message="Sign in to create and edit your pack lists."
            >
              <PacksClient
                initialPacks={props.packs}
                trails={props.trails}
              />
            </AuthGate>
          </Panel>
        )}

        {tab === "trips" && (
          <Panel
            title="Trips"
            subtitle="Trail assignments, nights, and what you learned after."
          >
            <AuthGate
              user={props.user}
              message="Sign in to plan trips and keep a journal."
            >
              <div className="space-y-8">
                <TripsClient
                  initialTrips={props.packs.filter(
                    (p) => Boolean(p.trail) || p.nights > 0,
                  )}
                  trails={props.trails}
                />
                <div className="biz-card p-5 md:p-6">
                  <h3 className="text-lg font-semibold tracking-tight">
                    Trip journal
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Log what worked and what to cut next time.
                  </p>
                  <div className="mt-5">
                    <JournalClient
                      initialEntries={props.journal}
                      packs={props.packOptions}
                    />
                  </div>
                </div>
              </div>
            </AuthGate>
          </Panel>
        )}

        {tab === "community" && (
          <Panel
            title="Community"
            subtitle="Shakedowns you can read, comment, and clone."
          >
            <div className="biz-card p-5 md:p-6">
              <CommunityFeed posts={props.posts} />
            </div>
          </Panel>
        )}
      </div>
    </Shell>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function DashboardHome({
  user,
  packs,
  journalCount,
  onOpen,
}: {
  user: PublicUser | null;
  packs: PackRow[];
  journalCount: number;
  onOpen: (id: DashTabId) => void;
}) {
  const { format } = useUnit();
  const [activePackId, setActivePackId] = useState<number | null>(
    packs[0]?.id ?? null,
  );

  const activePack =
    packs.find((p) => p.id === activePackId) ?? packs[0] ?? null;

  const targetGrams = activePack?.targetBaseWeightGrams || 4536;
  const deltaGrams = activePack
    ? activePack.stats.baseWeightGrams - targetGrams
    : 0;
  const overTarget = deltaGrams > 0;
  const targetProgress = activePack
    ? Math.min(
        100,
        Math.round((activePack.stats.baseWeightGrams / targetGrams) * 100),
      )
    : 0;

  const heaviestCats = [...(activePack?.stats.categoryBreakdown ?? [])]
    .sort((a, b) => b.grams - a.grams)
    .slice(0, 5);
  const maxCatGrams = heaviestCats[0]?.grams || 1;

  const cutList = (activePack?.stats.heaviestItems ?? []).slice(0, 8);
  const packGapCount = activePack
    ? activePack.failCount + activePack.warnCount
    : 0;
  const hasTrip =
    Boolean(activePack?.trail) || (activePack?.nights ?? 0) > 0;

  const packsByLightest = [...packs].sort(
    (a, b) => a.stats.baseWeightGrams - b.stats.baseWeightGrams,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Base weight first — cuts, targets, and trip gaps for the pack you’re
          dialing.
        </p>
      </div>

      {/* Active pack hero */}
      <div className="biz-card p-5 md:p-6">
        {packs.length > 0 ? (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Active pack
                </span>
                <select
                  className="field field-sm max-w-md"
                  value={activePack?.id ?? ""}
                  onChange={(e) => setActivePackId(Number(e.target.value))}
                >
                  {packs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.trail ? ` · ${p.trail.name}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-4 stat-number">
                <Weight grams={activePack!.stats.baseWeightGrams} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">Base weight</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="text-ink-soft">
                  Target {format(targetGrams)}
                </span>
                <span className={overTarget ? "text-[var(--accent)]" : "trend-up"}>
                  {overTarget ? (
                    <>
                      <Weight grams={deltaGrams} /> over
                    </>
                  ) : (
                    <>
                      <Weight grams={Math.abs(deltaGrams)} /> under
                    </>
                  )}
                </span>
              </div>
              <div className="mt-3 h-1.5 max-w-md overflow-hidden rounded bg-white/10">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.max(4, targetProgress)}%`,
                    background: overTarget
                      ? "var(--accent)"
                      : "var(--success)",
                  }}
                />
              </div>
            </div>
            <Link
              href={`/trips/${activePack!.id}`}
              className="pill pill-cta w-fit"
            >
              Open pack
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">No pack yet</p>
              <p className="mt-1 text-sm text-ink-soft">
                Create a list to track base weight, cuts, and trip checks.
              </p>
            </div>
            <button
              type="button"
              className="pill pill-cta w-fit"
              onClick={() => onOpen("packs")}
            >
              New pack
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* UL KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="biz-card px-4 py-3.5">
          <div className="text-xs text-ink-soft">Base weight</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">
            {activePack ? (
              <Weight grams={activePack.stats.baseWeightGrams} />
            ) : (
              "—"
            )}
          </div>
          <div className="mt-1 text-xs text-ink-soft">
            Not worn · not consumable
          </div>
        </div>
        <div className="biz-card px-4 py-3.5">
          <div className="text-xs text-ink-soft">Pack weight</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">
            {activePack ? (
              <Weight grams={activePack.stats.packWeightGrams} />
            ) : (
              "—"
            )}
          </div>
          <div className="mt-1 text-xs text-ink-soft">Total − worn</div>
        </div>
        <div className="biz-card px-4 py-3.5">
          <div className="text-xs text-ink-soft">Skin-out</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">
            {activePack ? (
              <Weight grams={activePack.stats.skinOutWeightGrams} />
            ) : (
              "—"
            )}
          </div>
          <div className="mt-1 text-xs text-ink-soft">Pack + worn</div>
        </div>
        <button
          type="button"
          onClick={() => onOpen(hasTrip ? "trips" : "packs")}
          className="biz-card px-4 py-3.5 text-left transition hover:border-white/20"
        >
          <div className="text-xs text-ink-soft">Gap issues</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">
            {activePack
              ? packGapCount === 0
                ? "Clear"
                : packGapCount
              : "—"}
          </div>
          <div className="mt-1 text-xs text-ink-soft">
            {activePack
              ? `${activePack.failCount}F · ${activePack.warnCount}W`
              : "No pack"}
          </div>
        </button>
      </div>

      {/* Weight accounting */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="biz-card p-5">
          <p className="text-sm font-medium">Worn / consumable / maybe</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Kept out of base so the number stays honest
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/5 px-3 py-3">
              <div className="text-[11px] text-ink-soft">Worn</div>
              <div className="mt-1 text-lg font-bold tabular-nums">
                {activePack ? (
                  <Weight grams={activePack.stats.wornWeightGrams} />
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 px-3 py-3">
              <div className="text-[11px] text-ink-soft">Consumable</div>
              <div className="mt-1 text-lg font-bold tabular-nums">
                {activePack ? (
                  <Weight grams={activePack.stats.consumableWeightGrams} />
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 px-3 py-3">
              <div className="text-[11px] text-ink-soft">Maybe</div>
              <div className="mt-1 text-lg font-bold tabular-nums">
                {activePack ? (
                  <Weight grams={activePack.stats.maybeWeightGrams} />
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="biz-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Heaviest categories</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                Base-weight categories
                {activePack ? ` · ${activePack.name}` : ""}
              </p>
            </div>
            {activePack && (
              <Link
                href={`/trips/${activePack.id}`}
                className="text-ink-soft hover:text-ink"
                aria-label="Open pack"
              >
                <ArrowUpRight size={18} />
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-2.5">
            {heaviestCats.length === 0 && (
              <p className="text-sm text-ink-soft">No pack items yet.</p>
            )}
            {heaviestCats.map((row, i) => {
              const pct = (row.grams / maxCatGrams) * 100;
              return (
                <div key={row.category}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="truncate">
                      {CATEGORY_LABELS[row.category as Category] ??
                        row.category}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-soft">
                      <Weight grams={row.grams} />
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(6, pct)}%`,
                        background:
                          i === 0 ? "var(--accent)" : "var(--success)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cut candidates */}
      <div className="biz-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div>
            <p className="text-sm font-medium">Cut candidates</p>
            <p className="text-xs text-ink-soft">
              Heaviest base items — where ounces hide
            </p>
          </div>
          {activePack && (
            <Link
              href={`/trips/${activePack.id}`}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Edit pack
            </Link>
          )}
        </div>
        {cutList.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">
            Add gear to a pack to see cut candidates.
          </p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {cutList.map((item, i) => (
              <Link
                key={`${item.name}-${i}`}
                href={activePack ? `/trips/${activePack.id}` : "/#packs"}
                className="flex items-center justify-between gap-3 px-4 py-2 transition hover:bg-white/4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {item.name}
                  </div>
                  <div className="truncate text-xs text-ink-soft">
                    {item.brand || "Unbranded"}
                    {" · "}
                    {CATEGORY_LABELS[item.category as Category] ??
                      item.category}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold tabular-nums">
                  <Weight grams={item.weightGrams * item.quantity} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Trip readiness */}
      <div className="biz-card p-5">
        <p className="text-sm font-medium">Trip readiness</p>
        {hasTrip && activePack ? (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              {activePack.trail?.name ?? "Custom route"}
              {activePack.nights > 0
                ? ` · ${activePack.nights} night${activePack.nights === 1 ? "" : "s"}`
                : ""}
              {" · "}
              {activePack.season}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`text-lg font-bold ${
                  packGapCount === 0 ? "trend-up" : "text-[var(--accent)]"
                }`}
              >
                {packGapCount === 0
                  ? "Checks clear"
                  : `${activePack.failCount} fail · ${activePack.warnCount} warn`}
              </span>
              <Link
                href={`/trips/${activePack.id}`}
                className="pill pill-soft !py-1.5 !px-3 text-sm"
              >
                Review pack
              </Link>
              <button
                type="button"
                className="text-sm text-ink-soft hover:text-ink"
                onClick={() => onOpen("trips")}
              >
                Trips & journal
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            Assign a trail on Trips for overnight and climate checks.
            <button
              type="button"
              className="ml-2 font-medium text-[var(--accent)] hover:underline"
              onClick={() => onOpen("trips")}
            >
              Open Trips
            </button>
          </p>
        )}
      </div>

      {!user && (
        <div id="account-panel" className="biz-card p-5">
          <AuthPanel user={user} />
        </div>
      )}

      {user && (
        <div id="account-panel" className="biz-card p-4 text-sm text-ink-soft">
          Signed in as <span className="font-medium text-ink">{user.name}</span>
          {" · "}
          {journalCount} journal {journalCount === 1 ? "entry" : "entries"}
        </div>
      )}

      {/* Packs lightest-first */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Your packs</h2>
          <button
            type="button"
            className="text-sm font-medium text-ink-soft hover:text-ink"
            onClick={() => onOpen("packs")}
          >
            Manage all
          </button>
        </div>
        {packsByLightest.length === 0 ? (
          <div className="biz-card border-dashed p-5 text-sm text-ink-soft">
            No packs yet — create one to start tracking base weight.
          </div>
        ) : (
          <div className="biz-card divide-y divide-[var(--line)] overflow-hidden">
            {packsByLightest.map((pack) => {
              const target = pack.targetBaseWeightGrams || 4536;
              const delta = pack.stats.baseWeightGrams - target;
              const over = delta > 0;
              const isActive = pack.id === activePack?.id;
              return (
                <div
                  key={pack.id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    isActive ? "bg-white/5" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setActivePackId(pack.id)}
                  >
                    <div className="truncate text-sm font-semibold">
                      {pack.name}
                      {isActive && (
                        <span className="ml-2 text-[11px] font-medium text-[var(--accent)]">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-ink-soft">
                      {pack.trail?.name ??
                        (pack.nights > 0
                          ? `${pack.nights} night trip`
                          : "Pack list")}
                    </div>
                  </button>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      <Weight grams={pack.stats.baseWeightGrams} />
                    </div>
                    <div
                      className={`text-[11px] ${
                        over ? "text-[var(--accent)]" : "trend-up"
                      }`}
                    >
                      {over ? (
                        <>
                          <Weight grams={delta} /> over
                        </>
                      ) : (
                        <>
                          <Weight grams={Math.abs(delta)} /> under
                        </>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/trips/${pack.id}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/6 text-ink-soft transition hover:bg-[var(--accent)] hover:text-white"
                    aria-label={`Open ${pack.name}`}
                  >
                    <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
