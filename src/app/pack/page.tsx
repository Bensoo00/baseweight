import { Shell } from "@/components/Shell";
import { GearList } from "@/components/GearList";
import { db } from "@/db";
import { userGear } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { computePackStats } from "@/lib/pack-stats";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PackPage() {
  await seedIfEmpty();
  const gear = await db.select().from(userGear).orderBy(desc(userGear.createdAt));
  const stats = computePackStats(gear);

  return (
    <Shell active="/pack">
      <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <GearList initialGear={gear} initialStats={stats} />
      </div>
    </Shell>
  );
}
