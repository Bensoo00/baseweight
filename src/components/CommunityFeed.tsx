"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Copy } from "lucide-react";
import type { CommunityPostWithMeta } from "@/lib/community";
import { Weight } from "@/components/UnitProvider";

export function CommunityFeed({ posts }: { posts: CommunityPostWithMeta[] }) {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <p className="serif-label text-ink-soft">Community</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Shakedowns, shares, and copyable packs.
        </h1>
        <p className="mt-3 text-ink-soft">
          Publish a trip pack, get comments, and let others clone the list into
          their own trips — the UL forum energy, without the pie charts.
        </p>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/community/${post.id}`}
            className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-soft">
                  {post.authorName}
                  {post.trailName ? ` · ${post.trailName}` : ""} · {post.nights}{" "}
                  night{post.nights === 1 ? "" : "s"}
                </div>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {post.title}
                </h2>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-black/5">
                <ArrowRight size={16} />
              </span>
            </div>
            {post.body && (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                {post.body}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <div>
                <div className="text-ink-soft">Base</div>
                <div className="font-semibold">
                  <Weight grams={post.baseWeightGrams} />
                </div>
              </div>
              <div>
                <div className="text-ink-soft">Pack (total − worn)</div>
                <div className="font-semibold">
                  <Weight grams={post.packWeightGrams} />
                </div>
              </div>
              <div>
                <div className="text-ink-soft">Items</div>
                <div className="font-semibold">{post.itemCount}</div>
              </div>
              <div className="ml-auto flex items-center gap-3 text-ink-soft">
                <span className="inline-flex items-center gap-1">
                  <MessageCircle size={14} /> {post.commentCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Copy size={14} /> {post.clonesCount}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {posts.length === 0 && (
          <div className="panel p-8 text-ink-soft">
            No posts yet. Open a trip and hit “Post to community”.
          </div>
        )}
      </div>
    </div>
  );
}
