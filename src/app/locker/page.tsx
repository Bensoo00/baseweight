import { desc } from "drizzle-orm";
import { Shell } from "@/components/Shell";
import { LockerClient } from "@/components/LockerClient";
import { db } from "@/db";
import { lockerItems } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";

export const dynamic = "force-dynamic";

export default async function LockerPage() {
  await seedIfEmpty();
  const items = await db
    .select()
    .from(lockerItems)
    .orderBy(desc(lockerItems.createdAt));
  const summary = {
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    totalGrams: items.reduce((sum, i) => sum + i.weightGrams * i.quantity, 0),
    totalValueUsd: items.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0),
  };

  return (
    <Shell active="/locker">
      <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <LockerClient initialItems={items} summary={summary} />
      </div>
    </Shell>
  );
}
