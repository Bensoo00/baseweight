import type { UserGear } from "@/db/schema";

export type PackStats = {
  itemCount: number;
  totalWeightGrams: number;
  baseWeightGrams: number;
  wornWeightGrams: number;
  consumableWeightGrams: number;
  packedWeightGrams: number;
  totalValueUsd: number;
  categoryBreakdown: { category: string; grams: number; count: number }[];
  heaviestItems: UserGear[];
};

export function computePackStats(gear: UserGear[]): PackStats {
  const packed = gear.filter((g) => g.packed);
  const totalWeightGrams = packed.reduce(
    (sum, g) => sum + g.weightGrams * g.quantity,
    0,
  );
  const wornWeightGrams = packed
    .filter((g) => g.worn)
    .reduce((sum, g) => sum + g.weightGrams * g.quantity, 0);
  const consumableWeightGrams = packed
    .filter((g) => g.consumable)
    .reduce((sum, g) => sum + g.weightGrams * g.quantity, 0);
  const baseWeightGrams = packed
    .filter((g) => !g.worn && !g.consumable)
    .reduce((sum, g) => sum + g.weightGrams * g.quantity, 0);
  const totalValueUsd = gear.reduce(
    (sum, g) => sum + g.priceUsd * g.quantity,
    0,
  );

  const byCategory = new Map<string, { grams: number; count: number }>();
  for (const item of packed) {
    const prev = byCategory.get(item.category) ?? { grams: 0, count: 0 };
    byCategory.set(item.category, {
      grams: prev.grams + item.weightGrams * item.quantity,
      count: prev.count + item.quantity,
    });
  }

  const categoryBreakdown = [...byCategory.entries()]
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.grams - a.grams);

  const heaviestItems = [...packed]
    .sort((a, b) => b.weightGrams * b.quantity - a.weightGrams * a.quantity)
    .slice(0, 5);

  return {
    itemCount: packed.reduce((sum, g) => sum + g.quantity, 0),
    totalWeightGrams,
    baseWeightGrams,
    wornWeightGrams,
    consumableWeightGrams,
    packedWeightGrams: totalWeightGrams,
    totalValueUsd,
    categoryBreakdown,
    heaviestItems,
  };
}
