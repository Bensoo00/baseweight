"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Backpack,
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  Package,
  Sparkles,
} from "lucide-react";
import { UnitToggle } from "@/components/UnitProvider";
import type { PublicUser } from "@/db/schema";

const tabs = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "packs", label: "Packs", icon: Backpack },
  { id: "gear", label: "Gear", icon: Package },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "coach", label: "Coach", icon: Sparkles },
  { id: "community", label: "Feed", icon: MessageSquare },
];

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `/#${id}`);
  return true;
}

const hashAliases: Record<string, string> = {
  home: "dashboard",
  snapshot: "dashboard",
  locker: "gear",
  trips: "packs",
  account: "dashboard",
};

export function Shell({
  children,
  user = null,
}: {
  children: React.ReactNode;
  user?: PublicUser | null;
  tone?: "light" | "dark";
  active?: string;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const isOnePager = pathname === "/";
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    if (!isOnePager) return;

    const raw = window.location.hash.replace("#", "");
    const hash = hashAliases[raw] ?? raw;
    if (hash) {
      setActive(hash);
      requestAnimationFrame(() => scrollToId(hash));
    }

    const sectionIds = tabs.map((t) => t.id);
    const root = document.querySelector(".onepager-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      {
        root,
        threshold: [0.15, 0.3, 0.45],
        rootMargin: "-10% 0px -55% 0px",
      },
    );

    for (const id of sectionIds) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [isOnePager]);

  function go(id: string) {
    setActive(id);
    if (isOnePager) {
      scrollToId(id);
      return;
    }
    router.push(`/#${id}`);
  }

  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="app-frame">
        <div className="app-shell bloom-shell">
          <header className="bloom-header">
            <button
              type="button"
              onClick={() => go("dashboard")}
              className="flex min-w-0 items-center gap-2.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink text-xs font-semibold text-white">
                Bw
              </span>
              <span className="truncate text-lg font-semibold tracking-tight text-ink">
                Baseweight
              </span>
            </button>

            <nav className="nav-glass" aria-label="Sections">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-active={isOnePager && active === tab.id}
                  onClick={() => go(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(user ? "dashboard" : "account")}
                className="hidden max-w-[9rem] truncate rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-[var(--paper-2)] sm:block"
                title={user ? user.email : "Sign in"}
              >
                {user ? user.name : "Sign in"}
              </button>
              <UnitToggle />
            </div>
          </header>

          <div
            className={
              isOnePager
                ? "onepager-scroll"
                : "flex flex-1 flex-col overflow-y-auto pb-[4.75rem]"
            }
          >
            {children}
          </div>

          <nav className="taskbar" aria-label="Main">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = isOnePager && active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="taskbar-item"
                  data-active={isActive}
                  onClick={() => go(tab.id)}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
