import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { Shell } from "@/components/Shell";
import { TripDetailClient } from "@/components/TripDetailClient";
import { db } from "@/db";
import { lockerItems } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { listTrails } from "@/lib/recommend";
import { getTripDetail } from "@/lib/trips";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TripDetailPage({ params }: Props) {
  await seedIfEmpty();
  const id = Number((await params).id);
  const [detail, locker, trails] = await Promise.all([
    getTripDetail(id),
    db.select().from(lockerItems).orderBy(desc(lockerItems.createdAt)),
    listTrails(),
  ]);

  if (!detail) notFound();

  return (
    <Shell active="/trips">
      <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <TripDetailClient
          initial={detail}
          locker={locker}
          trails={trails}
        />
      </div>
    </Shell>
  );
}
