"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight } from "lucide-react";

export function CloneShareButton({
  slug,
  dark = false,
}: {
  slug: string;
  dark?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function clone() {
    startTransition(async () => {
      const res = await fetch(`/api/share/${slug}/clone`, { method: "POST" });
      if (res.status === 401) {
        router.push("/#account");
        return;
      }
      const data = await res.json();
      if (data.trip?.trip?.id) {
        router.push(`/trips/${data.trip.trip.id}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={clone}
      disabled={pending}
      className={`pill ${dark ? "pill-ghost" : "pill-cta"}`}
    >
      {!dark && (
        <span className="arrow">
          <ArrowRight size={14} />
        </span>
      )}
      {pending ? "Cloning…" : "Clone this pack"}
    </button>
  );
}
