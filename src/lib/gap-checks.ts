import type { CatalogItem, Trail } from "@/db/schema";
import type { Packable } from "@/lib/pack-stats";
import { CATEGORY_LABELS, type Category } from "@/lib/units";

export type GapSeverity = "pass" | "warn" | "fail";

export type GapCheck = {
  id: string;
  title: string;
  detail: string;
  severity: GapSeverity;
  category?: Category;
};

export type UpgradeSuggestion = {
  currentName: string;
  currentWeightGrams: number;
  currentPriceUsd: number;
  suggestionName: string;
  suggestionBrand: string;
  suggestionWeightGrams: number;
  suggestionPriceUsd: number;
  gramsSaved: number;
  category: Category;
  reason: string;
};

function itemText(item: Packable) {
  return `${item.brand ?? ""} ${item.name} ${item.notes ?? ""}`.toLowerCase();
}

/** Backpack detection — category alone is flaky (LP “Big 3”, custom labels, typos). */
function looksLikeBackpack(item: Packable) {
  if (item.category === "pack") return true;
  const text = itemText(item);
  if (
    /\b(backpack|daypack|rucksack|frameless|frame\s*pack|ul\s*pack)\b/.test(
      text,
    )
  ) {
    return true;
  }
  // Capacity + pack wording (e.g. "Exos 48", "Southwest 40L")
  if (/\b\d{2,3}\s?l(iters?)?\b/.test(text) && /\bpack\b/.test(text)) {
    return true;
  }
  // Common UL pack models / makers even when category drifted to Other
  if (
    /\b(exos|atmos|aether|gorillo|gossamer\s*gear|mariposa|kumo|murmur|nexus|southwest|circuit|windrider|hyperlite|hmg|zpacks|ula\b|durston\s*kakwa|osprey|gregory|deuter|mystery\s*ranch)\b/.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

function hasCategory(gear: Packable[], category: Category) {
  if (category === "pack") {
    return gear.some((g) => looksLikeBackpack(g));
  }
  return gear.some((g) => g.category === category);
}

function maxRValue(gear: Packable[], catalogByName: Map<string, CatalogItem>) {
  let max = 0;
  for (const item of gear) {
    if (item.category !== "sleep") continue;
    const key = `${item.brand} ${item.name}`.trim();
    const hit =
      catalogByName.get(key) ||
      catalogByName.get(item.name) ||
      [...catalogByName.values()].find(
        (c) =>
          c.name.toLowerCase() === item.name.toLowerCase() ||
          item.name.toLowerCase().includes(c.name.toLowerCase()),
      );
    if (hit?.rValue && hit.rValue > max) max = hit.rValue;
  }
  // Heuristic: if they have a sleep pad-like name with no catalog match, don't fail hard
  return max;
}

export function runGapChecks(options: {
  gear: Packable[];
  trail: Trail | null;
  nights: number;
  season: string;
  targetBaseWeightGrams: number;
  baseWeightGrams: number;
  catalog: CatalogItem[];
}): { checks: GapCheck[]; upgrades: UpgradeSuggestion[] } {
  const {
    trail,
    nights,
    season,
    targetBaseWeightGrams,
    baseWeightGrams,
    catalog,
  } = options;
  // "Maybe" items don't satisfy requirements — they're staging only
  const gear = options.gear.filter((g) => !g.maybe);
  const checks: GapCheck[] = [];
  const overnight = nights >= 1;

  const categoriesPresent = new Set(gear.map((g) => g.category));

  const required: { category: Category; when: boolean; detail: string }[] = [
    {
      category: "pack",
      when: true,
      detail: "Add your backpack (or set its category to Pack).",
    },
    {
      category: "shelter",
      when: overnight,
      detail: "Overnight trips need a tent, tarp, or hammock system.",
    },
    {
      category: "sleep",
      when: overnight,
      detail: "Bring a pad and bag/quilt for overnight camps.",
    },
    {
      category: "water",
      when: true,
      detail: "Filter, bottles, or treatment for trail water.",
    },
    {
      category: "cook",
      when: overnight && nights >= 2,
      detail: "Multi-night trips usually need a stove or cook system.",
    },
  ];

  for (const req of required) {
    if (!req.when) continue;
    const ok = hasCategory(gear, req.category);
    checks.push({
      id: `cat-${req.category}`,
      title: ok
        ? `${CATEGORY_LABELS[req.category]} covered`
        : `Missing ${CATEGORY_LABELS[req.category].toLowerCase()}`,
      detail: req.detail,
      severity: ok ? "pass" : "fail",
      category: req.category,
    });
  }

  if (baseWeightGrams <= targetBaseWeightGrams) {
    checks.push({
      id: "target-weight",
      title: "Under target base weight",
      detail: `Base weight is within your goal.`,
      severity: "pass",
    });
  } else {
    const over = baseWeightGrams - targetBaseWeightGrams;
    checks.push({
      id: "target-weight",
      title: "Over target base weight",
      detail: `${Math.round(over / 28.3495)} oz over your target — trim heaviest categories first.`,
      severity: over > 900 ? "fail" : "warn",
    });
  }

  if (trail) {
    if (trail.climate === "alpine" || trail.difficulty === "expert") {
      const hasInsulation = gear.some(
        (g) =>
          g.category === "clothing" &&
          /puffy|down|fleece|insulat|jacket|hoody/i.test(`${g.name} ${g.notes}`),
      );
      checks.push({
        id: "insulation",
        title: hasInsulation ? "Insulation present" : "Add warm insulation",
        detail: `${trail.name} can drop cold — pack a fleece or puffy.`,
        severity: hasInsulation ? "pass" : "warn",
        category: "clothing",
      });
    }

    if (trail.climate === "forest" || trail.climate === "coastal") {
      const hasRain = gear.some(
        (g) =>
          g.category === "clothing" &&
          /rain|shell|torrent|h2no|gore|waterproof/i.test(
            `${g.name} ${g.notes} ${g.brand}`,
          ),
      );
      checks.push({
        id: "rain",
        title: hasRain ? "Rain shell ready" : "Rain protection gap",
        detail: `Wet ${trail.climate} systems punish cotton and no-shell kits.`,
        severity: hasRain ? "pass" : "warn",
        category: "clothing",
      });
    }

    if (trail.climate === "desert") {
      const waterLiters = gear
        .filter((g) => g.category === "water")
        .reduce((sum, g) => sum + g.quantity, 0);
      checks.push({
        id: "desert-water",
        title: waterLiters >= 1 ? "Water system packed" : "Bolster water carry",
        detail: "Desert stretches need extra capacity and reliable treatment.",
        severity: waterLiters >= 1 ? "pass" : "fail",
        category: "water",
      });
    }

    if (trail.requiresBearCanister || /bear canister/i.test(trail.notes)) {
      const hasCan = gear.some((g) =>
        /bear|canister|ursack|bv500|bv450/i.test(`${g.name} ${g.notes}`),
      );
      checks.push({
        id: "bear",
        title: hasCan ? "Food storage covered" : "Bear canister likely required",
        detail: trail.notes,
        severity: hasCan ? "pass" : "fail",
      });
    }

    if (
      trail.requiresTraction ||
      ((trail.climate === "alpine" || trail.difficulty === "expert") &&
        (season === "spring" || season === "shoulder" || season === "winter"))
    ) {
      const hasTraction = gear.some(
        (g) =>
          g.category === "safety" ||
          /spike|crampon|traction|microspike/i.test(`${g.name} ${g.notes}`),
      );
      checks.push({
        id: "traction",
        title: hasTraction ? "Traction packed" : "Consider traction",
        detail: "Early-season snow and icy cols are common on alpine routes.",
        severity: hasTraction ? "pass" : "warn",
        category: "safety",
      });
    }

    if (trail.difficulty === "hard" || trail.difficulty === "expert") {
      const hasComms = gear.some(
        (g) =>
          g.category === "electronics" ||
          /inreach|spot|plb|garmin|messenger/i.test(`${g.name} ${g.notes}`),
      );
      checks.push({
        id: "comms",
        title: hasComms ? "Emergency comms packed" : "No satellite messenger",
        detail: "Committing routes benefit from SOS / check-in capability.",
        severity: hasComms ? "pass" : "warn",
        category: "electronics",
      });
    }

    if (trail.minRValue && overnight) {
      const catalogByName = new Map(
        catalog.map((c) => [`${c.brand} ${c.name}`, c]),
      );
      const r = maxRValue(gear, catalogByName);
      if (r > 0) {
        checks.push({
          id: "r-value",
          title:
            r >= trail.minRValue
              ? `Pad warmth OK (R-${r})`
              : `Pad may be cold (R-${r})`,
          detail: `${trail.name} suggests about R-${trail.minRValue}+ for this season.`,
          severity: r >= trail.minRValue ? "pass" : "warn",
          category: "sleep",
        });
      } else if (categoriesPresent.has("sleep")) {
        checks.push({
          id: "r-value",
          title: "Verify sleeping pad warmth",
          detail: `Target roughly R-${trail.minRValue}+ for nights on ${trail.name}.`,
          severity: "warn",
          category: "sleep",
        });
      }
    }
  }

  // No automatic "replace X with Y" suggestions — category+weight matching
  // produced nonsense (e.g. bear can → stove). Keep trail gap checks only.
  return {
    checks: checks.sort((a, b) => {
      const rank = { fail: 0, warn: 1, pass: 2 };
      return rank[a.severity] - rank[b.severity];
    }),
    upgrades: [],
  };
}
