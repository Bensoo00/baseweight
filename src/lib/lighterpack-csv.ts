import type { TripItem } from "@/db/schema";
import { CATEGORIES, type Category } from "@/lib/units";

export type ParsedPackItem = {
  name: string;
  brand: string;
  category: Category;
  weightGrams: number;
  priceUsd: number;
  quantity: number;
  worn: boolean;
  consumable: boolean;
  notes: string;
};

/** Minimal CSV parser that respects quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell.trim());
    cell = "";
  };
  const pushRow = () => {
    // Skip fully empty rows
    if (row.some((c) => c.length > 0)) rows.push(row);
    row = [];
  };

  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushCell();
      continue;
    }
    if (ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    if (ch === "\r") continue;
    cell += ch;
  }
  pushCell();
  if (row.length) pushRow();
  return rows;
}

function normHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function truthy(value: string | undefined) {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "worn" || v === "x";
}

function toGrams(weight: number, unitRaw: string) {
  const unit = unitRaw.trim().toLowerCase();
  if (!Number.isFinite(weight) || weight < 0) return 0;
  if (unit === "g" || unit === "gram" || unit === "grams") return Math.round(weight);
  if (unit === "kg" || unit === "kilogram" || unit === "kilograms") {
    return Math.round(weight * 1000);
  }
  if (unit === "lb" || unit === "lbs" || unit === "pound" || unit === "pounds") {
    return Math.round(weight * 453.592);
  }
  // default oz (LighterPack default)
  return Math.round(weight * 28.3495);
}

function mapCategory(raw: string): Category {
  const v = raw.trim().toLowerCase();
  if (!v) return "other";
  for (const cat of CATEGORIES) {
    if (v === cat) return cat;
  }
  // LighterPack labels are freeform — match plurals / Big 3 buckets
  if (/shelter|tent|tarp|bivy|mid/.test(v)) return "shelter";
  if (/sleep|quilt|bag|pad|pillow/.test(v)) return "sleep";
  if (
    /\bpacks?\b|backpack|rucksack|big\s*3|big\s*three|carry|hauling/.test(v)
  ) {
    return "pack";
  }
  if (/cook|kitchen|stove|pot|mug/.test(v)) return "cook";
  if (/water|hydrat|filter|bottle/.test(v)) return "water";
  if (/cloth|apparel|layer|rain|jacket|pants|shirt|socks|gloves|hat/.test(v)) {
    return "clothing";
  }
  if (/foot|shoe|boot|feet/.test(v)) return "footwear";
  if (/nav|map|compass|gps|pole|hiking/.test(v)) return "navigation";
  if (/safe|first.?aid|medic|repair|traction|spike/.test(v)) return "safety";
  if (/electron|battery|power|phone|headlamp|light|watch/.test(v)) {
    return "electronics";
  }
  if (/hygiene|sanit|toilet|soap|tp|wash/.test(v)) return "hygiene";
  if (/food|consumable|fuel|snack/.test(v)) return "other";
  return "other";
}

/**
 * Parse a LighterPack (or compatible) CSV into pack items.
 * Official columns: Item Name, Category, desc, qty, weight, unit, url, price, worn, consumable
 */
export function parseLighterpackCsv(text: string): {
  items: ParsedPackItem[];
  warnings: string[];
} {
  const rows = parseCsv(text);
  const warnings: string[] = [];
  if (rows.length === 0) {
    return { items: [], warnings: ["CSV is empty."] };
  }

  const header = rows[0].map(normHeader);
  const looksLikeHeader =
    header.includes("itemname") ||
    header.includes("name") ||
    header.includes("category") ||
    header.includes("qty") ||
    header.includes("quantity") ||
    header.includes("weight");

  const col = (aliases: string[]) => {
    for (const alias of aliases) {
      const idx = header.indexOf(alias);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  // Fallback positional map for headerless LighterPack-style files
  const idx = {
    name: looksLikeHeader
      ? col(["itemname", "name", "item"])
      : 0,
    category: looksLikeHeader ? col(["category", "cat"]) : 1,
    desc: looksLikeHeader ? col(["desc", "description", "notes", "note"]) : 2,
    qty: looksLikeHeader ? col(["qty", "quantity", "count"]) : 3,
    weight: looksLikeHeader ? col(["weight", "wt"]) : 4,
    unit: looksLikeHeader ? col(["unit", "units"]) : 5,
    url: looksLikeHeader ? col(["url", "link"]) : 6,
    price: looksLikeHeader ? col(["price", "cost"]) : 7,
    worn: looksLikeHeader ? col(["worn"]) : 8,
    consumable: looksLikeHeader
      ? col(["consumable", "consume", "food"])
      : 9,
  };

  if (idx.name < 0 || idx.weight < 0) {
    return {
      items: [],
      warnings: [
        "Could not find Item Name / weight columns. Export CSV from LighterPack and try again.",
      ],
    };
  }

  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  const items: ParsedPackItem[] = [];

  dataRows.forEach((cells, i) => {
    const name = (cells[idx.name] ?? "").trim();
    if (!name) {
      warnings.push(`Row ${i + 2}: skipped (no name).`);
      return;
    }
    const qtyRaw = idx.qty >= 0 ? Number(cells[idx.qty]) : 1;
    const quantity =
      Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.min(99, Math.round(qtyRaw)) : 1;
    const weightRaw = Number(cells[idx.weight]);
    const unit = idx.unit >= 0 ? cells[idx.unit] ?? "oz" : "oz";
    const weightGrams = toGrams(weightRaw, unit || "oz");
    if (!weightGrams) {
      warnings.push(`Row ${i + 2} (${name}): weight missing or zero.`);
    }
    const priceRaw = idx.price >= 0 ? Number(cells[idx.price]) : 0;
    const priceUsd =
      Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : 0;
    const desc = idx.desc >= 0 ? (cells[idx.desc] ?? "").trim() : "";
    const url = idx.url >= 0 ? (cells[idx.url] ?? "").trim() : "";
    const category =
      idx.category >= 0 ? mapCategory(cells[idx.category] ?? "") : "other";
    const consumableFromCat = /food|fuel|consumable/.test(
      (cells[idx.category] ?? "").toLowerCase(),
    );

    items.push({
      name: name.slice(0, 120),
      brand: "",
      category,
      weightGrams: Math.max(1, weightGrams || 1),
      priceUsd,
      quantity,
      worn: idx.worn >= 0 ? truthy(cells[idx.worn]) : false,
      consumable:
        idx.consumable >= 0
          ? truthy(cells[idx.consumable]) || consumableFromCat
          : consumableFromCat,
      notes: [desc, url].filter(Boolean).join(" · ").slice(0, 500),
    });
  });

  return { items, warnings };
}

function csvEscape(value: string | number | boolean): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Export pack items in a LighterPack-compatible CSV shape. */
export function toLighterpackCsv(items: TripItem[]): string {
  const header = [
    "Item Name",
    "Category",
    "desc",
    "qty",
    "weight",
    "unit",
    "price",
    "worn",
    "consumable",
    "url",
  ];
  const rows = items.map((item) => [
    csvEscape(item.name),
    csvEscape(item.category),
    csvEscape([item.brand, item.notes].filter(Boolean).join(" · ")),
    csvEscape(item.quantity),
    csvEscape(item.weightGrams),
    "gram",
    csvEscape(item.priceUsd),
    csvEscape(item.worn ? "worn" : ""),
    csvEscape(item.consumable ? "consumable" : ""),
    "",
  ]);
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
