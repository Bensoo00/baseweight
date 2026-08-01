import { Shell } from "@/components/Shell";
import { TripsClient } from "@/components/TripsClient";
import { seedIfEmpty } from "@/db/seed";
import { listTrails } from "@/lib/recommend";
import { getTripDetail, listTrips } from "@/lib/trips";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  await seedIfEmpty();
  const [tripRows, trails] = await Promise.all([listTrips(), listTrails()]);
  const details = await Promise.all(tripRows.map((t) => getTripDetail(t.id)));
  const trips = details.filter(Boolean).map((d) => ({
    ...d!.trip,
    trail: d!.trail,
    stats: d!.stats,
    failCount: d!.checks.filter((c) => c.severity === "fail").length,
    warnCount: d!.checks.filter((c) => c.severity === "warn").length,
  }));

  return (
    <Shell active="/trips">
      <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <TripsClient initialTrips={trips} trails={trails} />
      </div>
    </Shell>
  );
}
