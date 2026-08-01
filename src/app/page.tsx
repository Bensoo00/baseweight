import Link from "next/link";
import { ArrowRight, Backpack, MessageSquare, Package, Sparkles } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Weight } from "@/components/UnitProvider";
import { db } from "@/db";
import { lockerItems } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { getTripDetail, listTrips } from "@/lib/trips";
import { formatUsd } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await seedIfEmpty();
  const locker = await db.select().from(lockerItems);
  const tripRows = await listTrips();
  const latest = tripRows[0] ? await getTripDetail(tripRows[0].id) : null;
  const openChecks = latest
    ? latest.checks.filter((c) => c.severity !== "pass").length
    : 0;
  const lockerValue = locker.reduce((s, i) => s + i.priceUsd * i.quantity, 0);

  const actions = [
    {
      href: "/trips",
      title: "Trips",
      detail: "Build a pack for a hike",
      icon: Backpack,
    },
    {
      href: "/locker",
      title: "Locker",
      detail: "Gear you already own",
      icon: Package,
    },
    {
      href: "/recommend",
      title: "Coach",
      detail: "Get gear suggestions",
      icon: Sparkles,
    },
    {
      href: "/community",
      title: "Community",
      detail: "Share and clone packs",
      icon: MessageSquare,
    },
  ];

  return (
    <Shell>
      <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <div className="mb-6">
          <p className="serif-label text-ink-soft">Home</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            What do you want to do?
          </h1>
          <p className="mt-2 max-w-xl text-ink-soft">
            Use the taskbar below anytime. Start with your locker, then make a
            trip pack.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="panel flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-lichen">
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{action.title}</span>
                  <span className="block text-sm text-ink-soft">{action.detail}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-ink-soft" />
              </Link>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="panel p-5">
            <div className="text-sm text-ink-soft">Locker</div>
            <div className="mt-2 text-2xl font-semibold">
              {locker.length} items
            </div>
            <div className="mt-1 text-sm text-ink-soft">
              {formatUsd(lockerValue)} owned
            </div>
          </div>
          <div className="panel p-5">
            <div className="text-sm text-ink-soft">Latest trip base weight</div>
            <div className="mt-2 text-2xl font-semibold">
              {latest ? (
                <Weight grams={latest.stats.baseWeightGrams} />
              ) : (
                "No trips yet"
              )}
            </div>
            <div className="mt-1 text-sm text-ink-soft">
              {latest ? latest.trip.name : "Create one from Trips"}
            </div>
          </div>
          <div className="panel p-5">
            <div className="text-sm text-ink-soft">Open trail checks</div>
            <div className="mt-2 text-2xl font-semibold">{openChecks}</div>
            <div className="mt-1 text-sm text-ink-soft">
              {latest ? "On your latest trip" : "Clears when a trip is ready"}
            </div>
          </div>
        </div>

        {latest && (
          <Link
            href={`/trips/${latest.trip.id}`}
            className="pill pill-cta mt-8 inline-flex"
          >
            <span className="arrow">
              <ArrowRight size={14} />
            </span>
            Continue {latest.trip.name}
          </Link>
        )}
      </div>
    </Shell>
  );
}
