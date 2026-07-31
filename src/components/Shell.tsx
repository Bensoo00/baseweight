import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const links = [
  { href: "/pack", label: "My Pack" },
  { href: "/pack/add", label: "Add Gear" },
  { href: "/recommend", label: "Recommend" },
];

export function Shell({
  children,
  tone = "light",
  active,
}: {
  children: React.ReactNode;
  tone?: "light" | "immersive";
  active?: string;
}) {
  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="app-frame">
        <div className="app-shell" data-tone={tone}>
          <header className="flex items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5">
            <Link href="/" className="flex items-center gap-3">
              <span
                className={`grid h-9 w-9 place-items-center rounded-full border text-sm ${
                  tone === "immersive"
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-black/10 bg-white text-ink"
                }`}
              >
                ✻
              </span>
              <div>
                <div
                  className={`font-[family-name:var(--font-fraunces)] text-xl tracking-tight ${
                    tone === "immersive" ? "text-white" : "text-ink"
                  }`}
                >
                  Baseweight
                </div>
                <div
                  className={`text-xs ${
                    tone === "immersive" ? "text-white/65" : "text-ink-soft"
                  }`}
                >
                  Pack smarter. Carry less.
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {links.map((link) => {
                const isActive = active === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3.5 py-2 text-sm transition ${
                      tone === "immersive"
                        ? isActive
                          ? "bg-white text-ink"
                          : "text-white/80 hover:bg-white/10"
                        : isActive
                          ? "bg-ink text-white"
                          : "text-ink-soft hover:bg-black/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <Link
              href="/recommend"
              className={`pill ${tone === "immersive" ? "pill-ghost" : "pill-cta"} hidden sm:inline-flex`}
            >
              {tone !== "immersive" && (
                <span className="arrow">
                  <ArrowUpRight size={14} />
                </span>
              )}
              Find gear
            </Link>
          </header>

          <main className="flex flex-1 flex-col">{children}</main>

          <div className="flex gap-2 px-4 pb-4 md:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-1 rounded-full px-2 py-2 text-center text-xs ${
                  tone === "immersive"
                    ? "bg-white/10 text-white"
                    : "bg-black/5 text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
