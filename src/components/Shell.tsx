"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Backpack,
  Home,
  MessageSquare,
  Package,
  Sparkles,
} from "lucide-react";
import { UnitToggle } from "@/components/UnitProvider";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "locker", label: "Locker", icon: Package },
  { id: "trips", label: "Trips", icon: Backpack },
  { id: "coach", label: "Coach", icon: Sparkles },
  { id: "community", label: "Community", icon: MessageSquare },
];

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `/#${id}`);
  return true;
}

export function Shell({
  children,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  active?: string;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const isOnePager = pathname === "/";
  const [active, setActive] = useState("home");

  useEffect(() => {
    if (!isOnePager) return;

    const hash = window.location.hash.replace("#", "");
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
              onClick={() => go("home")}
              className="flex min-w-0 items-center gap-2.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-lichen">
                Bw
              </span>
              <span className="truncate font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-ink">
                Baseweight
              </span>
            </button>

            <nav className="hidden items-center gap-1 md:flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm transition"
                  onClick={() => go(tab.id)}
                  style={{
                    background:
                      isOnePager && active === tab.id
                        ? "var(--ink)"
                        : "transparent",
                    color:
                      isOnePager && active === tab.id
                        ? "white"
                        : "var(--ink-soft)",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <UnitToggle />
          </header>

          <div className={isOnePager ? "onepager-scroll" : "flex flex-1 flex-col overflow-y-auto pb-[4.75rem]"}>
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
