import type { GapCheck, UpgradeSuggestion } from "@/lib/gap-checks";
import { Weight } from "@/components/UnitProvider";
import { CATEGORY_LABELS, formatUsd } from "@/lib/units";

export function GapPanel({
  checks,
  upgrades,
}: {
  checks: GapCheck[];
  upgrades: UpgradeSuggestion[];
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
            className="flex items-start justify-between gap-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-3"
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
      </div>

      {upgrades.length > 0 && (
        <div className="panel p-4">
          <div className="text-sm font-semibold">Upgrade first</div>
          <p className="mt-1 text-sm text-ink-soft">
            Heaviest pieces with lighter catalog alternatives nearby in price.
          </p>
          <div className="mt-4 space-y-3">
            {upgrades.map((u) => (
              <div
                key={`${u.currentName}-${u.suggestionName}`}
                className="rounded-2xl bg-[var(--paper-2)] px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-semibold">
                    {u.suggestionBrand} {u.suggestionName}
                  </div>
                  <div className="text-sm text-[var(--signal-pass)]">
                    −<Weight grams={u.gramsSaved} />
                  </div>
                </div>
                <div className="mt-1 text-sm text-ink-soft">
                  Replace {u.currentName} (
                  <Weight grams={u.currentWeightGrams} /> ·{" "}
                  {formatUsd(u.currentPriceUsd)}) →{" "}
                  <Weight grams={u.suggestionWeightGrams} /> ·{" "}
                  {formatUsd(u.suggestionPriceUsd)} ·{" "}
                  {CATEGORY_LABELS[u.category]}
                </div>
                <p className="mt-2 text-sm text-ink-soft">{u.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
