import { Shell } from "@/components/Shell";
import { CommunityFeed } from "@/components/CommunityFeed";
import { seedIfEmpty } from "@/db/seed";
import { listCommunityPosts } from "@/lib/community";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  await seedIfEmpty();
  const posts = await listCommunityPosts();

  return (
    <Shell active="/community">
      <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <CommunityFeed posts={posts} />
      </div>
    </Shell>
  );
}
