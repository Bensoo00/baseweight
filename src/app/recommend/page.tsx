import { Shell } from "@/components/Shell";
import { Recommender } from "@/components/Recommender";
import { seedIfEmpty } from "@/db/seed";
import { listTrails } from "@/lib/recommend";

export const dynamic = "force-dynamic";

export default async function RecommendPage() {
  await seedIfEmpty();
  const trails = await listTrails();

  return (
    <Shell active="/recommend">
      <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <Recommender trails={trails} />
      </div>
    </Shell>
  );
}
