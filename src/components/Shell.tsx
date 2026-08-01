"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Backpack,
  Home,
  MessageSquare,
  Package,
  Sparkles,
} from "lucide-react";
import { UnitToggle } from "@/components/UnitProvider";

const tabs = [
  { href: "/", label: "Home", icon: Home, match: (path: string) => path === "/" },
  {
    href: "/trips",
    label: "Trips",
    icon: Backpack,
    match: (path: string) => path.startsWith("/trips") || path.startsWith("/pack"),
  },
  {
    href: "/locker",
    label: "Locker",
    icon: Package,
    match: (path: string) => path.startsWith("/locker"),
  },
  {
    href: "/recommend",
    label: "Coach",
    icon: Sparkles,
    match: (path: string) => path.startsWith("/recommend"),
  },
  {
    href: "/community",
    label: "Community",
    icon: MessageSquare,
    match: (path: string) => path.startsWith("/community"),
  },
];

export function Shell({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  /** @deprecated path is inferred from the URL */
  active?: string;
}) {
  const pathname = usePathname() || "/";

  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="app-frame">
        <div
          className="app-shell"
          data-tone={tone === "dark" ? "dark" : "light"}
        >
          <header className="flex items-center justify-between gap-3 border-b border-black/8 px-4 py-3 md:px-6">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  tone === "dark"
                    ? "bg-lichen text-[var(--lichen-ink)]"
                    : "bg-ink text-lichen"
                }`}
              >
                Bw
              </span>
              <span
                className={`truncate font-[family-name:var(--font-fraunces)] text-lg tracking-tight ${
                  tone === "dark" ? "text-[var(--paper)]" : "text-ink"
                }`}
              >
                Baseweight
              </span>
            </Link>
            <UnitToggle dark={tone === "dark"} />
          </header>

          <main className="flex flex-1 flex-col overflow-y-auto pb-[4.75rem]">
            {children}
          </main>

          <nav className="taskbar" aria-label="Main">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="taskbar-item"
                  data-active={isActive}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
