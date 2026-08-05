"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  MessageSquare,
  Package,
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
import { CATEGORY_LABELS, formatUsd, type Category } from "@/lib/units";
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
  const mainPack = props.packs[0] ?? null;

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
            lockerSummary={props.lockerSummary}
            mainPack={mainPack}
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
  lockerSummary,
  mainPack,
  journalCount,
  onOpen,
}: {
  user: PublicUser | null;
  packs: PackRow[];
  lockerSummary: {
    itemCount: number;
    totalGrams: number;
    totalValueUsd: number;
  };
  mainPack: PackRow | null;
  journalCount: number;
  onOpen: (id: DashTabId) => void;
}) {
  const { format } = useUnit();
  const targetGrams = mainPack?.targetBaseWeightGrams || 4536;
  const targetProgress = mainPack
    ? Math.min(
        100,
        Math.round((mainPack.stats.baseWeightGrams / targetGrams) * 100),
      )
    : 0;
  const overTarget = mainPack
    ? mainPack.stats.baseWeightGrams > targetGrams
    : false;

  const heaviest = [...(mainPack?.stats.categoryBreakdown ?? [])]
    .sort((a, b) => b.grams - a.grams)
    .slice(0, 5);

  const maxCatGrams = heaviest[0]?.grams || 1;
  const tripReadyCount = packs.filter(
    (p) => Boolean(p.trail) || p.nights > 0,
  ).length;
  const issueCount = packs.reduce(
    (sum, p) => sum + p.failCount + p.warnCount,
    0,
  );

  const boardColumns = [
    {
      title: "Light packs",
      items: packs.filter((p) => p.stats.baseWeightGrams < 4536).slice(0, 4),
    },
    {
      title: "Trip-ready",
      items: packs
        .filter((p) => Boolean(p.trail) || p.nights > 0)
        .slice(0, 4),
    },
    {
      title: "Needs work",
      items: packs
        .filter((p) => p.failCount > 0 || p.warnCount > 0)
        .slice(0, 4),
    },
    {
      title: "All packs",
      items: packs.slice(0, 4),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Snapshot of packs, kit, and what still needs attention.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onOpen("packs")}
          className="biz-card px-4 py-3.5 text-left transition hover:border-white/20"
        >
          <div className="text-xs text-ink-soft">Main pack base</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">
            {mainPack ? (
              <Weight grams={mainPack.stats.baseWeightGrams} />
            ) : (
              "—"
            )}
          </div>
          <div className="mt-1 truncate text-xs text-ink-soft">
            {mainPack?.name ?? "No pack yet"}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onOpen("packs")}
          className="biz-card px-4 py-3.5 text-left transition hover:border-white/20"
        >
          <div className="text-xs text-ink-soft">Packs</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">
            {packs.length}
          </div>
          <div className="mt-1 text-xs trend-up">
            {tripReadyCount} trip-ready
          </div>
        </button>
        <button
          type="button"
          onClick={() => onOpen("collection")}
          className="biz-card px-4 py-3.5 text-left transition hover:border-white/20"
        >
          <div className="text-xs text-ink-soft">Kit value</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">
            {formatUsd(lockerSummary.totalValueUsd)}
          </div>
          <div className="mt-1 text-xs text-ink-soft">
            {lockerSummary.itemCount} pieces
          </div>
        </button>
        <button
          type="button"
          onClick={() => onOpen("trips")}
          className="biz-card px-4 py-3.5 text-left transition hover:border-white/20"
        >
          <div className="text-xs text-ink-soft">Open checks</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">
            {issueCount}
          </div>
          <div className="mt-1 text-xs text-ink-soft">
            {journalCount} journal {journalCount === 1 ? "entry" : "entries"}
          </div>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="biz-card p-5 lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Heaviest categories</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {mainPack
                  ? `Where weight sits in ${mainPack.name}`
                  : "Create a pack to see category weights"}
              </p>
            </div>
            <button
              type="button"
              className="text-ink-soft hover:text-ink"
              onClick={() => onOpen("packs")}
              aria-label="Open packs"
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {heaviest.length === 0 && (
              <p className="text-sm text-ink-soft">No pack items yet.</p>
            )}
            {heaviest.map((row, i) => {
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
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
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

        <div className="biz-card flex flex-col p-5 lg:col-span-5">
          <p className="text-sm font-medium">Main pack vs your target</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {mainPack
              ? `Target ${format(targetGrams)}`
              : "Set a target on any pack"}
          </p>
          <div className="relative mx-auto mt-4 grid h-36 w-36 place-items-center">
            <svg
              viewBox="0 0 120 120"
              className="absolute inset-0 h-full w-full"
            >
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
                strokeDasharray="4 6"
              />
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke={overTarget ? "var(--accent)" : "var(--success)"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(Math.min(targetProgress, 100) / 100) * 289} 289`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="relative text-center">
              <div className="text-3xl font-bold tracking-tight">
                {mainPack ? `${targetProgress}%` : "—"}
              </div>
              <div className="text-xs text-ink-soft">of target</div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-ink-soft">
            {mainPack ? (
              <>
                <Weight grams={mainPack.stats.baseWeightGrams} /> base
                {overTarget ? " · over target" : " · under target"}
              </>
            ) : (
              "No pack yet"
            )}
          </p>
          {mainPack && (
            <Link
              href={`/trips/${mainPack.id}`}
              className="pill pill-cta mt-4 w-fit self-center !py-2"
            >
              Open {mainPack.name}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
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

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Pack board</h2>
          <button
            type="button"
            className="text-sm font-medium text-ink-soft hover:text-ink"
            onClick={() => onOpen("packs")}
          >
            View all
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {boardColumns.map((col) => (
            <div key={col.title} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{col.title}</span>
                  <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-xs font-medium text-ink-soft">
                    {col.items.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2.5">
                {col.items.length === 0 && (
                  <div className="biz-card border-dashed p-4 text-sm text-ink-soft">
                    Nothing here yet
                  </div>
                )}
                {col.items.map((pack, idx) => {
                  const highlight = idx === 0 && col.title === "Trip-ready";
                  return (
                    <Link
                      key={`${col.title}-${pack.id}`}
                      href={`/trips/${pack.id}`}
                      className={`block rounded-2xl border p-3.5 transition ${
                        highlight
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "biz-card hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {pack.name}
                          </div>
                          <p
                            className={`mt-1 line-clamp-2 text-sm ${
                              highlight ? "text-white/70" : "text-ink-soft"
                            }`}
                          >
                            {pack.trail?.name ??
                              (pack.nights > 0
                                ? `${pack.nights} night trip`
                                : "Pack list")}
                            {" · "}
                            <Weight grams={pack.stats.baseWeightGrams} /> base
                          </p>
                        </div>
                        <ArrowRight
                          size={16}
                          className={
                            highlight ? "text-white/60" : "text-ink-soft"
                          }
                        />
                      </div>
                      <div
                        className={`mt-3 flex flex-wrap items-center gap-3 text-xs ${
                          highlight ? "text-white/55" : "text-ink-soft"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Package size={12} />
                          {pack.stats.itemCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          {pack.season}
                        </span>
                        {(pack.failCount > 0 || pack.warnCount > 0) && (
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare size={12} />
                            {pack.failCount}F/{pack.warnCount}W
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
