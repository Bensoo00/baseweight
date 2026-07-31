export function gramsToDisplay(grams: number, unit: "oz" | "g" = "oz") {
  if (unit === "g") return `${Math.round(grams)} g`;
  const oz = grams / 28.3495;
  if (oz >= 16) {
    const lbs = Math.floor(oz / 16);
    const rem = oz % 16;
    return `${lbs} lb ${rem.toFixed(1)} oz`;
  }
  return `${oz.toFixed(1)} oz`;
}

export function gramsToOz(grams: number) {
  return grams / 28.3495;
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const CATEGORIES = [
  "shelter",
  "sleep",
  "pack",
  "cook",
  "water",
  "clothing",
  "footwear",
  "navigation",
  "safety",
  "electronics",
  "hygiene",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  shelter: "Shelter",
  sleep: "Sleep system",
  pack: "Pack",
  cook: "Cook kit",
  water: "Water",
  clothing: "Clothing",
  footwear: "Footwear",
  navigation: "Navigation",
  safety: "Safety",
  electronics: "Electronics",
  hygiene: "Hygiene",
  other: "Other",
};
