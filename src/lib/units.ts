export type WeightUnit = "oz" | "g";

export function gramsToDisplay(grams: number, unit: WeightUnit = "oz") {
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

/** Default header colors for category tiles (user-overridable). */
export const DEFAULT_CATEGORY_COLORS: Record<Category, string> = {
  shelter: "#2f6b4a",
  sleep: "#3d5f8f",
  pack: "#5c4d7a",
  cook: "#b86a2e",
  water: "#1f7a8c",
  clothing: "#7a4d62",
  footwear: "#6b5a3a",
  navigation: "#2f6280",
  safety: "#a3453d",
  electronics: "#3d4f72",
  hygiene: "#4a7a68",
  other: "#4f5c54",
};

export const CATEGORY_COLOR_SWATCHES = [
  "#2f6b4a",
  "#3d5f8f",
  "#5c4d7a",
  "#b86a2e",
  "#1f7a8c",
  "#7a4d62",
  "#6b5a3a",
  "#2f6280",
  "#a3453d",
  "#3d4f72",
  "#4a7a68",
  "#4f5c54",
  "#8a6a2a",
  "#2a6b6b",
  "#6a3d5a",
  "#1f4d3a",
] as const;

export function contrastOnColor(hex: string): "#0c1812" | "#f4f7f2" {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#f4f7f2";
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#0c1812" : "#f4f7f2";
}
