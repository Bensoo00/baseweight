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
        <div className="mb-8 grid gap-4 md:grid-cols-[0.75fr_1.25fr] md:items-end">
          <div>
            <p className="serif-label opacity-80">{eyebrow}</p>
            <p className="mt-1 text-xs opacity-55">({index})</p>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h2>
        </div>
      )}
      {children}
    </section>
  );
}
