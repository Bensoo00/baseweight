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
import { AddGearForm } from "@/components/AddGearForm";
import { AuthGate, AuthPanel } from "@/components/AuthPanel";
import { CommunityFeed } from "@/components/CommunityFeed";
import { JournalClient } from "@/components/JournalClient";
import { LockerClient } from "@/components/LockerClient";
import { PacksClient } from "@/components/PacksClient";
import { Shell, type DashTabId } from "@/components/Shell";
import { TripsClient } from "@/components/TripsClient";
import { Weight } from "@/components/UnitProvider";
import type { JournalEntryDetail } from "@/lib/journal";
import type { CommunityPostWithMeta } from "@/lib/community";
import type { PackStats } from "@/lib/pack-stats";
import { formatUsd } from "@/lib/units";
import type { LockerItem, PublicUser, Trail } from "@/db/schema";

type PackRow = {
  id: number;
  name: string;
  nights: number;
  season: string;
  shareSlug: string;
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DashboardApp(props: Props) {
  const [tab, setTab] = useState<DashTabId>("dashboard");
  const mainPack = props.packs[0] ?? null;

  const primaryAction = useMemo(() => {
    if (tab === "collection") {
      return {
        label: "Add gear",
        onClick: () => {
          setTab("collection");
          requestAnimationFrame(() =>
            document.getElementById("add-gear")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          );
        },
      };
    }
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
      primaryAction={primaryAction}
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
            subtitle="Your closet — add once, drop into any pack."
          >
            <AuthGate
              user={props.user}
              message="Sign in to manage gear you own."
            >
              <div className="biz-card p-5 md:p-6">
                <LockerClient
                  initialItems={props.locker}
                  summary={props.lockerSummary}
                />
                <div
                  id="add-gear"
                  className="mt-8 border-t border-[var(--line)] pt-6"
                >
                  <h3 className="mb-4 text-lg font-semibold tracking-tight">
                    Add gear
                  </h3>
                  <AddGearForm />
                </div>
              </div>
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
  const targetProgress = mainPack
    ? Math.min(
        100,
        Math.round((mainPack.stats.baseWeightGrams / 4536) * 100),
      )
    : 0;

  const bars = (mainPack?.stats.categoryBreakdown ?? [])
    .slice(0, 7)
    .map((row, i) => ({
      label: WEEKDAYS[i] ?? row.category.slice(0, 3),
      pct:
        mainPack && mainPack.stats.packWeightGrams > 0
          ? (row.grams / mainPack.stats.packWeightGrams) * 100
          : 20 + ((i * 13) % 50),
      filled: i % 2 === 0,
    }));

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

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="biz-card p-5 lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Weight mix</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {mainPack
                  ? `From ${mainPack.name}`
                  : "Create a pack to chart categories"}
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
          <div className="mt-6 flex h-36 items-end justify-between gap-2 px-1">
            {(bars.length
              ? bars
              : WEEKDAYS.map((d, i) => ({
                  label: d,
                  pct: 18 + ((i * 17) % 55),
                  filled: i % 2 === 0,
                }))
            ).map((bar) => (
              <div
                key={bar.label}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    className={`w-[70%] max-w-8 rounded-md ${
                      bar.filled
                        ? "bg-ink"
                        : "bg-[repeating-linear-gradient(-45deg,#111_0_2px,transparent_2px_5px)]"
                    }`}
                    style={{ height: `${Math.max(12, bar.pct)}%` }}
                  />
                </div>
                <span className="text-[11px] text-ink-soft">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="biz-card flex flex-col items-center justify-center p-5 lg:col-span-3">
          <p className="text-sm font-medium text-ink">vs 10 lb target</p>
          <div className="relative mt-4 grid h-36 w-36 place-items-center">
            <svg
              viewBox="0 0 120 120"
              className="absolute inset-0 h-full w-full"
            >
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="#e4e4e0"
                strokeWidth="8"
                strokeDasharray="4 6"
              />
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="#111"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(targetProgress / 100) * 289} 289`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="relative text-center">
              <div className="text-3xl font-bold tracking-tight">
                {targetProgress}%
              </div>
              <div className="text-xs text-ink-soft">of target</div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-ink-soft">
            {mainPack ? (
              <>
                <Weight grams={mainPack.stats.baseWeightGrams} /> base
              </>
            ) : (
              "No pack yet"
            )}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
          <button
            type="button"
            onClick={() => onOpen("packs")}
            className="biz-card flex items-center justify-between gap-3 p-5 text-left transition hover:border-ink/30"
          >
            <div>
              <div className="text-3xl font-bold tracking-tight">
                {packs.length}
              </div>
              <div className="mt-1 text-sm text-ink-soft">Packs in progress</div>
            </div>
            <ArrowUpRight size={18} className="text-ink-soft" />
          </button>
          <button
            type="button"
            onClick={() => onOpen("collection")}
            className="biz-card flex items-center justify-between gap-3 p-5 text-left transition hover:border-ink/30"
          >
            <div>
              <div className="text-3xl font-bold tracking-tight">
                {formatUsd(lockerSummary.totalValueUsd)}
              </div>
              <div className="mt-1 text-sm text-ink-soft">
                Kit value · {lockerSummary.itemCount} pieces
              </div>
            </div>
            <ArrowUpRight size={18} className="text-ink-soft" />
          </button>
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
                      className={`block rounded-2xl border p-4 transition ${
                        highlight
                          ? "border-ink bg-ink text-white"
                          : "biz-card hover:border-ink/25"
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
