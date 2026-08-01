import type { ReactNode } from "react";

export function Section({
  id,
  index,
  eyebrow,
  title,
  children,
  tone = "paper",
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  tone?: "paper" | "ink" | "hero";
}) {
  return (
    <section
      id={id}
      className={`onepager-section ${
        tone === "ink"
          ? "onepager-section-ink"
          : tone === "hero"
            ? "onepager-section-hero"
            : "onepager-section-paper"
      }`}
    >
      {tone !== "hero" && (
        <div className="mb-7">
          <p className="serif-label text-ink-soft">{eyebrow}</p>
          <p className="mt-0.5 text-xs text-ink-soft/70">({index})</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h2>
          <div className="glass-divider mt-6" />
        </div>
      )}
      {children}
    </section>
  );
}
