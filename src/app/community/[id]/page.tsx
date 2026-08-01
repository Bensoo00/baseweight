import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { CommunityPostClient } from "@/components/CommunityPostClient";
import { seedIfEmpty } from "@/db/seed";
import { getCurrentUser, toPublicUser } from "@/lib/auth";
import { getCommunityPost } from "@/lib/community";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CommunityPostPage({ params }: Props) {
  await seedIfEmpty();
  const currentUser = await getCurrentUser();
  const user = currentUser ? toPublicUser(currentUser) : null;
  const id = Number((await params).id);
  const data = await getCommunityPost(id);
  if (!data) notFound();

  return (
    <Shell user={user} active="/community">
      <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <CommunityPostClient
          post={data.post}
          comments={data.comments}
          detail={data.detail}
        />
      </div>
    </Shell>
  );
}
