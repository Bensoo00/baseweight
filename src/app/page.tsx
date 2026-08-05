import { desc, eq } from "drizzle-orm";
import { DashboardApp } from "@/components/DashboardApp";
import { db } from "@/db";
import { lockerItems } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { getCurrentUser, toPublicUser } from "@/lib/auth";
import { listCommunityPosts } from "@/lib/community";
import { listJournalEntries } from "@/lib/journal";
import { listTrails } from "@/lib/recommend";
import { getTripDetail, listTrips } from "@/lib/trips";

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

  const lockerValue = locker.reduce((s, i) => s + i.priceUsd * i.quantity, 0);
  const lockerSummary = {
    itemCount: locker.reduce((sum, i) => sum + i.quantity, 0),
    totalGrams: locker.reduce((sum, i) => sum + i.weightGrams * i.quantity, 0),
    totalValueUsd: lockerValue,
  };

  return (
    <DashboardApp
      user={user}
      packs={packs}
      locker={locker}
      lockerSummary={lockerSummary}
      trails={trails}
      posts={posts}
      journal={journal}
      packOptions={packOptions}
    />
  );
}
