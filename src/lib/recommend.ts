import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { catalogItems, trails, type CatalogItem, type Trail } from "@/db/schema";

export type RecommendParams = {
  budget?: number;
  maxWeightGrams?: number;
  trailId?: number;
  category?: CatalogItem["category"];
  skillLevel?: CatalogItem["skillLevel"];
  prioritize?: "weight" | "value" | "comfort" | "durability";
};

export type ScoredRecommendation = CatalogItem & {
  score: number;
  reasons: string[];
  trailFit: number;
};

function skillRank(level: CatalogItem["skillLevel"]) {
  return { beginner: 1, intermediate: 2, advanced: 3 }[level];
}

function scoreItem(
  item: CatalogItem,
  trail: Trail | null,
  params: RecommendParams,
): ScoredRecommendation {
  const reasons: string[] = [];
  let score = 50;
  let trailFit = 50;

  if (trail) {
    const climates = item.bestFor.split(",").map((c) => c.trim());
    if (climates.includes(trail.climate) || climates.includes("mixed")) {
      score += 22;
      trailFit += 30;
      reasons.push(`Matched for ${trail.climate} conditions on ${trail.name}`);
    } else {
      score -= 12;
      trailFit -= 20;
      reasons.push(`Less ideal for ${trail.climate} climate`);
    }

    if (trail.difficulty === "expert" || trail.difficulty === "hard") {
      if (item.durability >= 8) {
        score += 10;
        reasons.push("High durability for demanding terrain");
      }
      if (item.category === "safety" || item.category === "electronics") {
        score += 6;
        reasons.push("Useful redundancy on committing routes");
      }
    }

    if (trail.climate === "alpine" && item.rValue && item.rValue >= 4) {
      score += 12;
      reasons.push(`R-value ${item.rValue} suits cold nights`);
    }
    if (trail.climate === "alpine" && item.temperatureRatingF && item.temperatureRatingF <= 25) {
      score += 10;
      reasons.push(`${item.temperatureRatingF}°F rating for alpine camps`);
    }
  }

  if (params.budget != null) {
    const ratio = item.priceUsd / params.budget;
    if (ratio <= 0.35) {
      score += 14;
      reasons.push("Fits comfortably under budget");
    } else if (ratio <= 0.7) {
      score += 6;
      reasons.push("Within budget range");
    } else if (ratio <= 1) {
      score += 1;
      reasons.push("Near top of budget");
    } else {
      score -= 25;
      reasons.push("Over budget");
    }
  }

  if (params.maxWeightGrams != null) {
    if (item.weightGrams <= params.maxWeightGrams * 0.5) {
      score += 16;
      reasons.push("Well under weight limit");
    } else if (item.weightGrams <= params.maxWeightGrams) {
      score += 8;
      reasons.push("Within weight limit");
    } else {
      score -= 30;
      reasons.push("Exceeds weight limit");
    }
  }

  if (params.skillLevel) {
    const diff = Math.abs(skillRank(item.skillLevel) - skillRank(params.skillLevel));
    if (diff === 0) {
      score += 8;
      reasons.push(`Sized for ${params.skillLevel} users`);
    } else if (diff === 1) {
      score += 2;
    } else {
      score -= 8;
      reasons.push("Skill mismatch");
    }
  }

  switch (params.prioritize) {
    case "weight":
      score += Math.max(0, 18 - item.weightGrams / 80);
      break;
    case "value":
      score += Math.max(0, 16 - item.priceUsd / 40) + item.durability;
      break;
    case "comfort":
      score += item.comfort * 2;
      break;
    case "durability":
      score += item.durability * 2;
      break;
    default:
      score += (item.comfort + item.durability) / 2;
  }

  score += item.comfort * 0.4 + item.durability * 0.4;
  trailFit = Math.max(0, Math.min(100, trailFit + item.comfort));

  return {
    ...item,
    score: Math.round(score * 10) / 10,
    reasons: reasons.slice(0, 3),
    trailFit: Math.round(trailFit),
  };
}

export async function recommendGear(params: RecommendParams) {
  const filters = [];

  if (params.budget != null) {
    filters.push(lte(catalogItems.priceUsd, params.budget));
  }
  if (params.maxWeightGrams != null) {
    filters.push(lte(catalogItems.weightGrams, params.maxWeightGrams));
  }
  if (params.category) {
    filters.push(eq(catalogItems.category, params.category));
  }
  // Skill is soft-scored later; keep SQL filters hard only for budget/weight/category.

  let trail: Trail | null = null;
  if (params.trailId) {
    const rows = await db.select().from(trails).where(eq(trails.id, params.trailId)).limit(1);
    trail = rows[0] ?? null;
  }

  const items = await db
    .select()
    .from(catalogItems)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(catalogItems.weightGrams));

  // Soft-filter by climate when trail is known but still allow near-misses
  const scored = items
    .map((item) => scoreItem(item, trail, params))
    .sort((a, b) => b.score - a.score);

  return {
    trail,
    recommendations: scored.slice(0, 12),
    totalCandidates: items.length,
  };
}

export async function listTrails() {
  return db.select().from(trails).orderBy(asc(trails.name));
}
