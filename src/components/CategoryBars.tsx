"use client";

import { Weight } from "@/components/UnitProvider";
import { CATEGORY_LABELS, type Category } from "@/lib/units";

export function CategoryBars({
  rows,
  totalGrams,
}: {
  rows: { category: string; grams: number; count: number }[];
  totalGrams: number;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pct = totalGrams === 0 ? 0 : (row.grams / totalGrams) * 100;
        return (
          <div key={row.category}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate">
                {CATEGORY_LABELS[row.category as Category] ?? row.category}
                <span className="text-ink-soft"> · {row.count}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums text-ink-soft">
                <Weight grams={row.grams} /> · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-md bg-black/8">
              <div
                className="h-full rounded-md bg-[linear-gradient(90deg,#2f4a3c,#c6f06a)] transition-[width]"
                style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
