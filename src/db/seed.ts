import { count, eq, isNull } from "drizzle-orm";
import { db, ensureSchema } from "./index";
import {
  catalogItems,
  communityComments,
  communityPosts,
  journalEntries,
  journalGearNotes,
  lockerItems,
  trails,
  tripItems,
  trips,
  users,
} from "./schema";
import { hashPassword } from "@/lib/auth";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { shareSlug } from "@/lib/ids";
import { computePackStats, tripItemsToPackable } from "@/lib/pack-stats";

const trailSeed = [
  {
    name: "John Muir Trail",
    region: "Sierra Nevada, CA",
    distanceMiles: 211,
    elevationGainFt: 47000,
    difficulty: "expert" as const,
    climate: "alpine" as const,
    seasonHint: "Jul–Sep",
    notes: "High elevation, cold nights, bear canisters required.",
    minRValue: 4.5,
    requiresBearCanister: true,
    requiresTraction: false,
  },
  {
    name: "Appalachian Trail (Smokies)",
    region: "Great Smoky Mountains",
    distanceMiles: 72,
    elevationGainFt: 18000,
    difficulty: "hard" as const,
    climate: "forest" as const,
    seasonHint: "Apr–Oct",
    notes: "Humid forest, frequent rain, shelter network available.",
    minRValue: 3.5,
    requiresBearCanister: false,
    requiresTraction: false,
  },
  {
    name: "Wonderland Trail",
    region: "Mount Rainier, WA",
    distanceMiles: 93,
    elevationGainFt: 22000,
    difficulty: "hard" as const,
    climate: "alpine" as const,
    seasonHint: "Jul–Sep",
    notes: "Volcanic alpine, snowfields early season, variable weather.",
    minRValue: 4.5,
    requiresBearCanister: true,
    requiresTraction: true,
  },
  {
    name: "Zion Narrows",
    region: "Zion NP, UT",
    distanceMiles: 16,
    elevationGainFt: 1500,
    difficulty: "moderate" as const,
    climate: "desert" as const,
    seasonHint: "Jun–Oct",
    notes: "Canyon water hiking, flash flood risk, warm days.",
    minRValue: 2,
    requiresBearCanister: false,
    requiresTraction: false,
  },
  {
    name: "Lost Coast Trail",
    region: "Northern California",
    distanceMiles: 25,
    elevationGainFt: 4000,
    difficulty: "moderate" as const,
    climate: "coastal" as const,
    seasonHint: "May–Oct",
    notes: "Tide tables critical, wind, salt spray, soft sand.",
    minRValue: 3,
    requiresBearCanister: false,
    requiresTraction: false,
  },
  {
    name: "Presidential Traverse",
    region: "White Mountains, NH",
    distanceMiles: 20,
    elevationGainFt: 8500,
    difficulty: "expert" as const,
    climate: "alpine" as const,
    seasonHint: "Jun–Sep",
    notes: "Exposed ridgeline, severe weather common above treeline.",
    minRValue: 5,
    requiresBearCanister: false,
    requiresTraction: true,
  },
];

const catalogSeed = [
  {
    name: "X-Mid 1",
    brand: "Durston",
    category: "shelter" as const,
    weightGrams: 765,
    priceUsd: 259,
    waterproofRating: "silnylon",
    durability: 8,
    comfort: 8,
    skillLevel: "intermediate" as const,
    bestFor: "alpine,forest,mixed",
    description: "Trekking-pole pyramid with excellent storm worthiness and living space.",
    imageHint: "tent",
  },
  {
    name: "Copper Spur HV UL2",
    brand: "Big Agnes",
    category: "shelter" as const,
    weightGrams: 1247,
    priceUsd: 550,
    waterproofRating: "silnylon",
    durability: 7,
    comfort: 9,
    skillLevel: "beginner" as const,
    bestFor: "forest,mixed,coastal",
    description: "Freestanding two-person tent with generous vestibules and easy pitch.",
    imageHint: "tent",
  },
  {
    name: "Notch Li",
    brand: "Six Moon Designs",
    category: "shelter" as const,
    weightGrams: 482,
    priceUsd: 515,
    waterproofRating: "Dyneema",
    durability: 6,
    comfort: 7,
    skillLevel: "advanced" as const,
    bestFor: "alpine,mixed",
    description: "Ultralight dual-trekking-pole shelter for weight-obsessed hikers.",
    imageHint: "tent",
  },
  {
    name: "NeoAir XLite NXT",
    brand: "Therm-a-Rest",
    category: "sleep" as const,
    weightGrams: 371,
    priceUsd: 210,
    rValue: 4.5,
    durability: 7,
    comfort: 8,
    skillLevel: "beginner" as const,
    bestFor: "alpine,forest,mixed,desert",
    description: "Industry-standard insulated pad with strong warmth-to-weight ratio.",
    imageHint: "sleeping-pad",
  },
  {
    name: "Tensor Extreme Conditions",
    brand: "NEMO",
    category: "sleep" as const,
    weightGrams: 525,
    priceUsd: 250,
    rValue: 8.5,
    durability: 8,
    comfort: 9,
    skillLevel: "intermediate" as const,
    bestFor: "alpine",
    description: "Winter-capable pad for cold alpine nights and shoulder seasons.",
    imageHint: "sleeping-pad",
  },
  {
    name: "Western Mountaineering UltraLite",
    brand: "Western Mountaineering",
    category: "sleep" as const,
    weightGrams: 822,
    priceUsd: 505,
    temperatureRatingF: 20,
    durability: 9,
    comfort: 9,
    skillLevel: "intermediate" as const,
    bestFor: "alpine,forest",
    description: "Premium down bag with excellent loft retention and longevity.",
    imageHint: "sleeping-bag",
  },
  {
    name: "Katabatic Flex 22",
    brand: "Katabatic",
    category: "sleep" as const,
    weightGrams: 595,
    priceUsd: 390,
    temperatureRatingF: 22,
    durability: 8,
    comfort: 8,
    skillLevel: "advanced" as const,
    bestFor: "alpine,mixed",
    description: "Quilt system that saves weight without sacrificing shoulder-season warmth.",
    imageHint: "quilt",
  },
  {
    name: "Exos 48",
    brand: "Osprey",
    category: "pack" as const,
    weightGrams: 1190,
    priceUsd: 240,
    capacityLiters: 48,
    durability: 8,
    comfort: 9,
    skillLevel: "beginner" as const,
    bestFor: "forest,mixed,coastal",
    description: "Ventilated frame pack that carries comfortably on longer approaches.",
    imageHint: "pack",
  },
  {
    name: "Superior 45",
    brand: "Gossamer Gear",
    category: "pack" as const,
    weightGrams: 765,
    priceUsd: 255,
    capacityLiters: 45,
    durability: 7,
    comfort: 7,
    skillLevel: "intermediate" as const,
    bestFor: "alpine,mixed,desert",
    description: "Frameless-friendly ultralight pack for refined base weights.",
    imageHint: "pack",
  },
  {
    name: "Windrider 55",
    brand: "Hyperlite Mountain Gear",
    category: "pack" as const,
    weightGrams: 907,
    priceUsd: 359,
    capacityLiters: 55,
    durability: 9,
    comfort: 7,
    skillLevel: "intermediate" as const,
    bestFor: "alpine,coastal,mixed",
    description: "Dyneema pack built for abrasion, weather, and long trail abuse.",
    imageHint: "pack",
  },
  {
    name: "Toaks 750ml Pot",
    brand: "Toaks",
    category: "cook" as const,
    weightGrams: 112,
    priceUsd: 28,
    durability: 8,
    comfort: 6,
    skillLevel: "beginner" as const,
    bestFor: "alpine,forest,desert,coastal,mixed",
    description: "Titanium staple for simple boil-and-eat kitchen kits.",
    imageHint: "cook",
  },
  {
    name: "PocketRocket 2",
    brand: "MSR",
    category: "cook" as const,
    weightGrams: 73,
    priceUsd: 50,
    durability: 9,
    comfort: 7,
    skillLevel: "beginner" as const,
    bestFor: "alpine,forest,desert,mixed",
    description: "Compact canister stove with reliable simmer and packability.",
    imageHint: "stove",
  },
  {
    name: "BeFree 1.0L",
    brand: "Katadyn",
    category: "water" as const,
    weightGrams: 63,
    priceUsd: 45,
    capacityLiters: 1,
    durability: 6,
    comfort: 8,
    skillLevel: "beginner" as const,
    bestFor: "forest,alpine,mixed",
    description: "Fast-flow soft flask filter ideal for frequent water sources.",
    imageHint: "filter",
  },
  {
    name: "Sawyer Squeeze",
    brand: "Sawyer",
    category: "water" as const,
    weightGrams: 85,
    priceUsd: 39,
    durability: 8,
    comfort: 7,
    skillLevel: "beginner" as const,
    bestFor: "desert,forest,mixed,coastal",
    description: "Proven hollow-fiber filter with flexible bottle compatibility.",
    imageHint: "filter",
  },
  {
    name: "Alpha Fleece Hoody",
    brand: "Senchi Designs",
    category: "clothing" as const,
    weightGrams: 148,
    priceUsd: 95,
    durability: 7,
    comfort: 9,
    skillLevel: "intermediate" as const,
    bestFor: "alpine,forest,mixed",
    description: "High-loft active insulation that shines on cool climbs.",
    imageHint: "fleece",
  },
  {
    name: "Torrentshell 3L",
    brand: "Patagonia",
    category: "clothing" as const,
    weightGrams: 343,
    priceUsd: 179,
    waterproofRating: "3L H2No",
    durability: 8,
    comfort: 8,
    skillLevel: "beginner" as const,
    bestFor: "forest,coastal,mixed",
    description: "Durable rain shell for wet forest and coastal systems.",
    imageHint: "rain-shell",
  },
  {
    name: "Ghost Whisperer 2",
    brand: "Mountain Hardwear",
    category: "clothing" as const,
    weightGrams: 207,
    priceUsd: 300,
    durability: 6,
    comfort: 9,
    skillLevel: "intermediate" as const,
    bestFor: "alpine,mixed",
    description: "Ultralight down puffy for camp and summit pushes.",
    imageHint: "puffy",
  },
  {
    name: "Speedgoat 6",
    brand: "Hoka",
    category: "footwear" as const,
    weightGrams: 624,
    priceUsd: 155,
    durability: 7,
    comfort: 9,
    skillLevel: "beginner" as const,
    bestFor: "forest,mixed,alpine",
    description: "Max-cushion trail shoe for long rocky approaches.",
    imageHint: "shoes",
  },
  {
    name: "Lone Peak 8",
    brand: "Altra",
    category: "footwear" as const,
    weightGrams: 596,
    priceUsd: 150,
    durability: 7,
    comfort: 8,
    skillLevel: "beginner" as const,
    bestFor: "desert,forest,mixed",
    description: "Zero-drop trail shoe with roomy toe box for big mile days.",
    imageHint: "shoes",
  },
  {
    name: "inReach Mini 2",
    brand: "Garmin",
    category: "electronics" as const,
    weightGrams: 100,
    priceUsd: 400,
    durability: 9,
    comfort: 8,
    skillLevel: "beginner" as const,
    bestFor: "alpine,desert,coastal,mixed,forest",
    description: "Satellite messenger for off-grid check-ins and SOS.",
    imageHint: "gps",
  },
  {
    name: "Microspikes",
    brand: "Kahtoola",
    category: "safety" as const,
    weightGrams: 340,
    priceUsd: 75,
    durability: 9,
    comfort: 7,
    skillLevel: "beginner" as const,
    bestFor: "alpine",
    description: "Essential traction for early-season snow and icy cols.",
    imageHint: "traction",
  },
  {
    name: "Carbon Cork Z-Poles",
    brand: "Black Diamond",
    category: "navigation" as const,
    weightGrams: 450,
    priceUsd: 200,
    durability: 8,
    comfort: 9,
    skillLevel: "beginner" as const,
    bestFor: "alpine,forest,mixed",
    description: "Foldable trekking poles that double as shelter supports.",
    imageHint: "poles",
  },
];

const starterLocker = [
  {
    name: "Exos 48",
    brand: "Osprey",
    category: "pack" as const,
    weightGrams: 1190,
    priceUsd: 240,
    quantity: 1,
    wornDefault: false,
    consumableDefault: false,
    notes: "Primary pack",
  },
  {
    name: "X-Mid 1",
    brand: "Durston",
    category: "shelter" as const,
    weightGrams: 765,
    priceUsd: 259,
    quantity: 1,
    wornDefault: false,
    consumableDefault: false,
    notes: "",
  },
  {
    name: "NeoAir XLite NXT",
    brand: "Therm-a-Rest",
    category: "sleep" as const,
    weightGrams: 371,
    priceUsd: 210,
    quantity: 1,
    wornDefault: false,
    consumableDefault: false,
    notes: "",
  },
  {
    name: "Katabatic Flex 22",
    brand: "Katabatic",
    category: "sleep" as const,
    weightGrams: 595,
    priceUsd: 390,
    quantity: 1,
    wornDefault: false,
    consumableDefault: false,
    notes: "Quilt",
  },
  {
    name: "Alpha Fleece Hoody",
    brand: "Senchi Designs",
    category: "clothing" as const,
    weightGrams: 148,
    priceUsd: 95,
    quantity: 1,
    wornDefault: true,
    consumableDefault: false,
    notes: "Worn while hiking",
  },
  {
    name: "Torrentshell 3L",
    brand: "Patagonia",
    category: "clothing" as const,
    weightGrams: 343,
    priceUsd: 179,
    quantity: 1,
    wornDefault: false,
    consumableDefault: false,
    notes: "Rain shell",
  },
  {
    name: "BeFree 1.0L",
    brand: "Katadyn",
    category: "water" as const,
    weightGrams: 63,
    priceUsd: 45,
    quantity: 1,
    wornDefault: false,
    consumableDefault: false,
    notes: "",
  },
  {
    name: "PocketRocket 2",
    brand: "MSR",
    category: "cook" as const,
    weightGrams: 73,
    priceUsd: 50,
    quantity: 1,
    wornDefault: false,
    consumableDefault: false,
    notes: "",
  },
  {
    name: "Fuel canister",
    brand: "Generic",
    category: "cook" as const,
    weightGrams: 200,
    priceUsd: 8,
    quantity: 1,
    wornDefault: false,
    consumableDefault: true,
    notes: "100g iso-butane",
  },
  {
    name: "BV500 BearVault",
    brand: "BearVault",
    category: "other" as const,
    weightGrams: 1160,
    priceUsd: 90,
    quantity: 1,
    wornDefault: false,
    consumableDefault: false,
    notes: "Bear canister",
  },
];

async function ensureDemoUser() {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);
  if (existing[0]) return existing[0];

  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: "Demo Hiker",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      createdAt: new Date().toISOString(),
    })
    .returning();
  return user;
}

async function claimOrphanRows(userId: number) {
  await db
    .update(lockerItems)
    .set({ userId })
    .where(isNull(lockerItems.userId));
  await db.update(trips).set({ userId }).where(isNull(trips.userId));
  await db
    .update(communityPosts)
    .set({ userId })
    .where(isNull(communityPosts.userId));
  await db
    .update(communityComments)
    .set({ userId })
    .where(isNull(communityComments.userId));
}

const globalForSeed = globalThis as unknown as {
  __baseweightSeedReady?: Promise<void>;
};

/** Runs seed at most once per server process — avoids multi-second DB work on every click. */
export async function seedIfEmpty() {
  if (!globalForSeed.__baseweightSeedReady) {
    globalForSeed.__baseweightSeedReady = runSeedIfEmpty().catch((error) => {
      globalForSeed.__baseweightSeedReady = undefined;
      throw error;
    });
  }
  await globalForSeed.__baseweightSeedReady;
}

async function runSeedIfEmpty() {
  await ensureSchema();
  const demo = await ensureDemoUser();
  await claimOrphanRows(demo.id);

  const [{ value: trailCount }] = await db.select({ value: count() }).from(trails);
  if (trailCount === 0) {
    await db.insert(trails).values(trailSeed);
  } else {
    const existing = await db.select().from(trails);
    for (const trail of existing) {
      const match = trailSeed.find((t) => t.name === trail.name);
      if (!match) continue;
      if (trail.minRValue == null) {
        await db
          .update(trails)
          .set({
            minRValue: match.minRValue,
            requiresBearCanister: match.requiresBearCanister,
            requiresTraction: match.requiresTraction,
          })
          .where(eq(trails.id, trail.id));
      }
    }
  }

  const [{ value: catalogCount }] = await db
    .select({ value: count() })
    .from(catalogItems);
  if (catalogCount === 0) {
    await db.insert(catalogItems).values(catalogSeed);
  }

  const existingLocker = await db
    .select()
    .from(lockerItems)
    .where(eq(lockerItems.userId, demo.id));
  if (existingLocker.length === 0) {
    await db.insert(lockerItems).values(
      starterLocker.map((item) => ({
        ...item,
        userId: demo.id,
        createdAt: new Date().toISOString(),
      })),
    );
  } else {
    const names = new Set(
      existingLocker.map((i) => `${i.brand}::${i.name}`.toLowerCase()),
    );
    const missing = starterLocker.filter(
      (item) => !names.has(`${item.brand}::${item.name}`.toLowerCase()),
    );
    if (missing.length) {
      await db.insert(lockerItems).values(
        missing.map((item) => ({
          ...item,
          userId: demo.id,
          createdAt: new Date().toISOString(),
        })),
      );
    }
  }

  const demoTrips = await db
    .select()
    .from(trips)
    .where(eq(trips.userId, demo.id));
  const locker = await db
    .select()
    .from(lockerItems)
    .where(eq(lockerItems.userId, demo.id));

  if (demoTrips.length === 0) {
    const allTrails = await db.select().from(trails);
    const jmt = allTrails.find((t) => t.name === "John Muir Trail");
    const now = new Date().toISOString();
    const [trip] = await db
      .insert(trips)
      .values({
        userId: demo.id,
        name: "JMT Section — sample trip",
        trailId: jmt?.id ?? null,
        nights: 4,
        season: "summer",
        targetBaseWeightGrams: 4536,
        shareSlug: shareSlug(),
        notes: "Sample trip built from your locker. Edit freely.",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (trip && locker.length) {
      await db.insert(tripItems).values(
        locker.map((item) => ({
          tripId: trip.id,
          lockerItemId: item.id,
          name: item.name,
          brand: item.brand,
          category: item.category,
          weightGrams: item.weightGrams,
          priceUsd: item.priceUsd,
          quantity: item.quantity,
          worn: item.wornDefault,
          consumable: item.consumableDefault,
          notes: item.notes,
        })),
      );
    }
  } else if (locker.length) {
    const sample = demoTrips.find((t) => t.name.includes("sample trip"));
    if (sample) {
      const packed = await db
        .select()
        .from(tripItems)
        .where(eq(tripItems.tripId, sample.id));
      const packedKeys = new Set(
        packed.map((p) => `${p.brand}::${p.name}`.toLowerCase()),
      );
      const missing = locker.filter(
        (item) => !packedKeys.has(`${item.brand}::${item.name}`.toLowerCase()),
      );
      if (missing.length) {
        await db.insert(tripItems).values(
          missing.map((item) => ({
            tripId: sample.id,
            lockerItemId: item.id,
            name: item.name,
            brand: item.brand,
            category: item.category,
            weightGrams: item.weightGrams,
            priceUsd: item.priceUsd,
            quantity: item.quantity,
            worn: item.wornDefault,
            consumable: item.consumableDefault,
            notes: item.notes,
          })),
        );
      }
    }
  }

  const [{ value: postCount }] = await db
    .select({ value: count() })
    .from(communityPosts);
  if (postCount === 0) {
    const sample =
      (
        await db.select().from(trips).where(eq(trips.userId, demo.id))
      ).find((t) => t.name.includes("sample trip")) ??
      (await db.select().from(trips).where(eq(trips.userId, demo.id)))[0];
    if (sample) {
      const items = await db
        .select()
        .from(tripItems)
        .where(eq(tripItems.tripId, sample.id));
      const stats = computePackStats(tripItemsToPackable(items));
      const trail = sample.trailId
        ? (
            await db
              .select()
              .from(trails)
              .where(eq(trails.id, sample.trailId))
              .limit(1)
          )[0]
        : null;
      const [post] = await db
        .insert(communityPosts)
        .values({
          userId: demo.id,
          tripId: sample.id,
          shareSlug: sample.shareSlug,
          title: "JMT section shakedown — first draft",
          body: "Looking for cuts before I mail the bear can. Base feels heavy around the canister + pack. Roast me kindly.",
          authorName: "Demo Hiker",
          trailName: trail?.name ?? "John Muir Trail",
          nights: sample.nights,
          season: sample.season,
          baseWeightGrams: stats.baseWeightGrams,
          packWeightGrams: stats.packWeightGrams,
          itemCount: stats.committedCount,
          clonesCount: 0,
          createdAt: new Date().toISOString(),
        })
        .returning();
      if (post) {
        await db.insert(communityComments).values([
          {
            postId: post.id,
            userId: demo.id,
            authorName: "ozcounter",
            body: "Swap the Exos if you can — a frameless 40L would save real ounces if your food carries stay short.",
            createdAt: new Date().toISOString(),
          },
          {
            postId: post.id,
            userId: demo.id,
            authorName: "trailmath",
            body: "Love seeing pack weight (total − worn) called out. Bar breakdown > pie chart forever.",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    }
  }

  const [{ value: journalCount }] = await db
    .select({ value: count() })
    .from(journalEntries)
    .where(eq(journalEntries.userId, demo.id));
  if (journalCount === 0) {
    const sample =
      (
        await db.select().from(trips).where(eq(trips.userId, demo.id))
      ).find((t) => t.name.includes("sample")) ??
      (await db.select().from(trips).where(eq(trips.userId, demo.id)))[0];
    const [entry] = await db
      .insert(journalEntries)
      .values({
        userId: demo.id,
        tripId: sample?.id ?? null,
        title: "First JMT section — lessons",
        trailName: "John Muir Trail",
        rating: "ok",
        summary:
          "Four nights, hot afternoons, cold canyon camps. Base felt honest until the bear can.",
        whatWorked:
          "Quilt loft was dialed. BeFree kept up at every creek. Fleece never came off on climbs.",
        whatDidnt:
          "Exos felt overbuilt for this food carry. Canister + frame pack stacked heavy.",
        happenedAt: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      })
      .returning();
    if (entry) {
      await db.insert(journalGearNotes).values([
        {
          entryId: entry.id,
          itemName: "Exos 48",
          brand: "Osprey",
          category: "pack",
          verdict: "mixed",
          note: "Comfortable but heavier than needed.",
        },
        {
          entryId: entry.id,
          itemName: "Katabatic Flex 22",
          brand: "Katabatic",
          category: "sleep",
          verdict: "worked",
          note: "No cold spots at ~35°F.",
        },
        {
          entryId: entry.id,
          itemName: "BV500 BearVault",
          brand: "BearVault",
          category: "other",
          verdict: "failed",
          note: "Required, but killed the base-weight goal.",
        },
      ]);
    }
  }
}
