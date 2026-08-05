import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Shell } from "@/components/Shell";
import { TripDetailClient } from "@/components/TripDetailClient";
import { db } from "@/db";
import { lockerItems } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { getCurrentUser, toPublicUser } from "@/lib/auth";
import { listTrails } from "@/lib/recommend";
import { getOwnedTripDetail } from "@/lib/trips";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TripDetailPage({ params }: Props) {
  await seedIfEmpty();
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/#account");

  const id = Number((await params).id);
  const user = toPublicUser(currentUser);
  const [detail, locker, trails] = await Promise.all([
    getOwnedTripDetail(id, user.id),
    db
      .select()
      .from(lockerItems)
      .where(eq(lockerItems.userId, user.id))
      .orderBy(desc(lockerItems.createdAt)),
    listTrails(),
  ]);

  if (!detail) notFound();

  return (
    <Shell user={user}>
      <div className="dash-panel">
        <div className="biz-card p-4 md:p-6">
          <TripDetailClient
            initial={detail}
            locker={locker}
            trails={trails}
          />
        </div>
      </div>
    </Shell>
  );
}
