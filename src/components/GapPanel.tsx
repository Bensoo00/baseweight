import type { GapCheck } from "@/lib/gap-checks";

export function GapPanel({
  checks,
}: {
  checks: GapCheck[];
  /** @deprecated Ignored — upgrade suggestions removed (too often wrong). */
  upgrades?: unknown;
}) {
  const fails = checks.filter((c) => c.severity === "fail").length;
  const warns = checks.filter((c) => c.severity === "warn").length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="serif-label text-ink-soft">Trail checks</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">
            {fails === 0 && warns === 0
              ? "Kit looks solid for this trip"
              : `${fails} gap${fails === 1 ? "" : "s"}, ${warns} watch-out${warns === 1 ? "" : "s"}`}
          </h3>
        </div>
      </div>

      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3"
          >
            <div>
              <div className="font-semibold">{check.title}</div>
              <p className="mt-1 text-sm text-ink-soft">{check.detail}</p>
            </div>
            <span className="signal shrink-0" data-severity={check.severity}>
              {check.severity}
            </span>
          </div>
        ))}
        {checks.length === 0 && (
          <p className="text-sm text-ink-soft">
            Assign a trail to run overnight and climate checks.
          </p>
        )}
      </div>
    </div>
  );
}
