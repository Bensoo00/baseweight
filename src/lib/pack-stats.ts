import type { TripItem } from "@/db/schema";

export type Packable = {
  category: string;
  weightGrams: number;
  priceUsd: number;
  quantity: number;
  worn: boolean;
  consumable: boolean;
  maybe?: boolean;
  name: string;
  brand?: string;
  notes?: string;
  id?: number;
};

export type PackStats = {
  itemCount: number;
  committedCount: number;
  maybeCount: number;
  totalWeightGrams: number;
  /** Classic UL base: not worn, not consumable, not maybe */
  baseWeightGrams: number;
  wornWeightGrams: number;
  consumableWeightGrams: number;
  maybeWeightGrams: number;
  /** Everything in the pack (excludes worn + maybe) — LP's "total − worn" */
  packWeightGrams: number;
  /** Skin-out: pack + worn (excludes maybe) */
  skinOutWeightGrams: number;
  packedWeightGrams: number;
  totalValueUsd: number;
  categoryBreakdown: { category: string; grams: number; count: number }[];
  heaviestItems: Packable[];
  costPerOzSavedHints: {
    name: string;
    weightGrams: number;
    priceUsd: number;
    dollarsPerOz: number;
  }[];
};

export function computePackStats(gear: Packable[]): PackStats {
  const committed = gear.filter((g) => !g.maybe);
  const maybeItems = gear.filter((g) => g.maybe);

  const totalWeightGrams = committed.reduce(
    (sum, g) => sum + g.weightGrams * g.quantity,
    0,
  );
  const wornWeightGrams = committed
    .filter((g) => g.worn)
    .reduce((sum, g) => sum + g.weightGrams * g.quantity, 0);
  const consumableWeightGrams = committed
    .filter((g) => g.consumable && !g.worn)
    .reduce((sum, g) => sum + g.weightGrams * g.quantity, 0);
  const baseWeightGrams = committed
    .filter((g) => !g.worn && !g.consumable)
    .reduce((sum, g) => sum + g.weightGrams * g.quantity, 0);
  const maybeWeightGrams = maybeItems.reduce(
    (sum, g) => sum + g.weightGrams * g.quantity,
    0,
  );
  const packWeightGrams = totalWeightGrams - wornWeightGrams;
  const skinOutWeightGrams = totalWeightGrams;
  const totalValueUsd = gear.reduce(
    (sum, g) => sum + g.priceUsd * g.quantity,
    0,
  );

  const byCategory = new Map<string, { grams: number; count: number }>();
  for (const item of committed.filter((g) => !g.worn)) {
    const prev = byCategory.get(item.category) ?? { grams: 0, count: 0 };
    byCategory.set(item.category, {
      grams: prev.grams + item.weightGrams * item.quantity,
      count: prev.count + item.quantity,
    });
  }

  const categoryBreakdown = [...byCategory.entries()]
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.grams - a.grams);

  const heaviestItems = [...committed]
    .filter((g) => !g.worn && !g.consumable)
    .sort((a, b) => b.weightGrams * b.quantity - a.weightGrams * a.quantity)
    .slice(0, 5);

  const costPerOzSavedHints = heaviestItems
    .filter((g) => g.priceUsd > 0)
    .map((g) => {
      const weightGrams = g.weightGrams * g.quantity;
      const priceUsd = g.priceUsd * g.quantity;
      return {
        name: g.brand ? `${g.brand} ${g.name}` : g.name,
        weightGrams,
        priceUsd,
        dollarsPerOz: priceUsd / (weightGrams / 28.3495),
      };
    })
    .slice(0, 5);

  return {
    itemCount: gear.reduce((sum, g) => sum + g.quantity, 0),
    committedCount: committed.reduce((sum, g) => sum + g.quantity, 0),
    maybeCount: maybeItems.reduce((sum, g) => sum + g.quantity, 0),
    totalWeightGrams,
    baseWeightGrams,
    wornWeightGrams,
    consumableWeightGrams,
    maybeWeightGrams,
    packWeightGrams,
    skinOutWeightGrams,
    packedWeightGrams: packWeightGrams,
    totalValueUsd,
    categoryBreakdown,
    heaviestItems,
    costPerOzSavedHints,
  };
}

export function tripItemsToPackable(items: TripItem[]): Packable[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    brand: item.brand,
    category: item.category,
    weightGrams: item.weightGrams,
    priceUsd: item.priceUsd,
    quantity: item.quantity,
    worn: item.worn,
    consumable: item.consumable,
    maybe: Boolean((item as TripItem & { maybe?: boolean }).maybe),
    notes: item.notes,
  }));
}
