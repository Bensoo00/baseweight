"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Backpack,
  LayoutDashboard,
  MessageSquare,
  Package,
  Plus,
  Route,
} from "lucide-react";
import { UnitToggle } from "@/components/UnitProvider";
import type { PublicUser } from "@/db/schema";

export const DASH_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "collection", label: "Collection", icon: Package },
  { id: "packs", label: "Packs", icon: Backpack },
  { id: "trips", label: "Trips", icon: Route },
  { id: "community", label: "Community", icon: MessageSquare },
] as const;

export type DashTabId = (typeof DASH_TABS)[number]["id"];

const hashAliases: Record<string, DashTabId | "account"> = {
  home: "dashboard",
  snapshot: "dashboard",
  gear: "collection",
  locker: "collection",
  feed: "community",
  journal: "trips",
  coach: "dashboard",
  account: "account",
};

type ShellProps = {
  children: React.ReactNode;
  user?: PublicUser | null;
  activeTab?: DashTabId;
  onTabChange?: (id: DashTabId) => void;
  primaryAction?: { label: string; onClick?: () => void; href?: string };
};

export function Shell({
  children,
  user = null,
  activeTab,
  onTabChange,
  primaryAction,
}: ShellProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const isHome = pathname === "/";
  const [localTab, setLocalTab] = useState<DashTabId>("dashboard");
  const tab = activeTab ?? localTab;

  useEffect(() => {
    if (!isHome) return;
    const raw = window.location.hash.replace("#", "");
    if (!raw) return;
    const mapped = hashAliases[raw] ?? raw;
    if (mapped === "account") {
      onTabChange?.("dashboard");
      setLocalTab("dashboard");
      return;
    }
    if (DASH_TABS.some((t) => t.id === mapped)) {
      const id = mapped as DashTabId;
      setLocalTab(id);
      onTabChange?.(id);
    }
  }, [isHome, onTabChange]);

  function go(id: DashTabId) {
    setLocalTab(id);
    onTabChange?.(id);
    if (isHome) {
      window.history.replaceState(null, "", `/#${id}`);
      return;
    }
    router.push(`/#${id}`);
  }

  function Nav({ mobile = false }: { mobile?: boolean }) {
    return (
      <nav
        className={mobile ? "dash-nav dash-nav-mobile" : "dash-nav dash-nav-top"}
        aria-label={mobile ? "Mobile" : "Main"}
      >
        {DASH_TABS.map((t) => {
          const Icon = t.icon;
          const active = isHome && tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className="dash-nav-item"
              data-active={active}
              onClick={() => go(t.id)}
            >
              <Icon size={mobile ? 20 : 16} strokeWidth={active ? 2.4 : 1.9} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="app-frame">
        <div className="app-shell bloom-shell">
          <header className="bloom-header">
            <div className="flex min-w-0 items-center gap-5">
              <button
                type="button"
                onClick={() => go("dashboard")}
                className="flex shrink-0 items-center gap-2.5"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-bold text-white">
                  Bw
                </span>
                <span className="hidden text-lg font-semibold tracking-tight text-ink sm:inline">
                  Baseweight
                </span>
              </button>
              <Nav />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <UnitToggle />
              {primaryAction &&
                (primaryAction.href ? (
                  <Link href={primaryAction.href} className="pill pill-cta !py-2">
                    <Plus size={16} />
                    <span className="hidden sm:inline">{primaryAction.label}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="pill pill-cta !py-2"
                    onClick={primaryAction.onClick}
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">{primaryAction.label}</span>
                  </button>
                ))}
              <button
                type="button"
                onClick={() => {
                  if (isHome) {
                    go("dashboard");
                    window.history.replaceState(null, "", "/#account");
                    requestAnimationFrame(() =>
                      document
                        .getElementById("account-panel")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "nearest",
                        }),
                    );
                  } else {
                    router.push("/#account");
                  }
                }}
                className="hidden rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-[var(--paper-2)] sm:block"
                title={user ? user.email : "Sign in"}
              >
                {user ? "Me" : "Sign in"}
              </button>
            </div>
          </header>

          <div className="dash-scroll">{children}</div>
          <Nav mobile />
        </div>
      </div>
    </>
  );
}
