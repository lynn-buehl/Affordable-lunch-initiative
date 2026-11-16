import { and, eq, gte, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  aliEvents,
  aliParticipants,
  ingredientVotes,
  ingredients,
  ledgerEntries,
  users,
} from "@/lib/db/schema";

/**
 * Karma formula (confirmed with the group, see plan): each week,
 * price_per_meal = total group expense cost that week / total meals
 * consumed that week. Spending money (an expense or a contribution) is
 * +karma equal to the amount. Consuming a meal (an opted-in ALI
 * participation) is -karma equal to that week's price_per_meal. Manual
 * balance adjustments never factor in.
 *
 * Fully computed at read time from ledger_entries + ali_participants —
 * see the note in lib/db/schema.ts for why there's no karma_entries table.
 *
 * "Week" = the Monday-starting week (ISO-ish) of the ledger entry's date,
 * or of the ALI event's created_at for meals (events don't have a separate
 * "meal date" field yet — documented assumption).
 */

function weekKey(d: Date): string {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const isoDay = utc.getUTCDay() || 7; // Monday=1..Sunday=7
  utc.setUTCDate(utc.getUTCDate() - isoDay + 1);
  return utc.toISOString().slice(0, 10);
}

export type WeeklyKarma = {
  week: string;
  spentCents: number;
  mealsConsumed: number;
  karmaCents: number;
};

export type PersonKarma = {
  userId: string;
  name: string;
  totalKarmaCents: number;
  weeks: WeeklyKarma[];
};

export async function getKarmaByUser(): Promise<PersonKarma[]> {
  const [ledgerRows, participantRows, activeUsers] = await Promise.all([
    db
      .select({
        userId: ledgerEntries.userId,
        entryType: ledgerEntries.entryType,
        amountCents: ledgerEntries.amountCents,
        entryDate: ledgerEntries.entryDate,
      })
      .from(ledgerEntries),
    db
      .select({
        userId: aliParticipants.userId,
        eventCreatedAt: aliEvents.createdAt,
      })
      .from(aliParticipants)
      .innerJoin(aliEvents, eq(aliParticipants.aliEventId, aliEvents.id))
      .where(eq(aliParticipants.optedIn, true)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.status, "active")),
  ]);

  // Weekly totals across the whole group, to derive price_per_meal.
  const weeklyCost = new Map<string, number>();
  const weeklyMeals = new Map<string, number>();

  for (const row of ledgerRows) {
    if (row.entryType !== "expense") continue;
    const week = weekKey(new Date(row.entryDate));
    weeklyCost.set(week, (weeklyCost.get(week) ?? 0) + row.amountCents);
  }
  for (const row of participantRows) {
    const week = weekKey(row.eventCreatedAt);
    weeklyMeals.set(week, (weeklyMeals.get(week) ?? 0) + 1);
  }

  const pricePerMealByWeek = new Map<string, number>();
  for (const [week, cost] of weeklyCost) {
    const meals = weeklyMeals.get(week) ?? 0;
    pricePerMealByWeek.set(week, meals > 0 ? cost / meals : 0);
  }

  // Per-person weekly spend and meal count.
  const spentByUserWeek = new Map<string, Map<string, number>>();
  const mealsByUserWeek = new Map<string, Map<string, number>>();

  for (const row of ledgerRows) {
    const week = weekKey(new Date(row.entryDate));
    const perWeek = spentByUserWeek.get(row.userId) ?? new Map();
    perWeek.set(week, (perWeek.get(week) ?? 0) + row.amountCents);
    spentByUserWeek.set(row.userId, perWeek);
  }
  for (const row of participantRows) {
    const week = weekKey(row.eventCreatedAt);
    const perWeek = mealsByUserWeek.get(row.userId) ?? new Map();
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
    mealsByUserWeek.set(row.userId, perWeek);
  }

  return activeUsers
    .map((user) => {
      const spent = spentByUserWeek.get(user.id) ?? new Map();
      const meals = mealsByUserWeek.get(user.id) ?? new Map();
      const allWeeks = new Set([...spent.keys(), ...meals.keys()]);

      const weeks: WeeklyKarma[] = [...allWeeks]
        .sort()
        .map((week) => {
          const spentCents = spent.get(week) ?? 0;
          const mealsConsumed = meals.get(week) ?? 0;
          const pricePerMeal = pricePerMealByWeek.get(week) ?? 0;
          return {
            week,
            spentCents,
            mealsConsumed,
            karmaCents: spentCents - mealsConsumed * pricePerMeal,
          };
        });

      return {
        userId: user.id,
        name: user.name,
        totalKarmaCents: weeks.reduce((sum, w) => sum + w.karmaCents, 0),
        weeks,
      };
    })
    .sort((a, b) => b.totalKarmaCents - a.totalKarmaCents);
}

export type TrendingIngredient = { name: string; votes: number };

export async function getTrendingIngredients(
  days = 90,
): Promise<TrendingIngredient[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      name: ingredients.name,
      votes: sql<number>`count(*)`,
    })
    .from(ingredientVotes)
    .innerJoin(ingredients, eq(ingredientVotes.ingredientId, ingredients.id))
    .innerJoin(aliEvents, eq(ingredientVotes.aliEventId, aliEvents.id))
    .where(and(ilike(aliEvents.type, "Fancy%"), gte(aliEvents.createdAt, since)))
    .groupBy(ingredients.name)
    .orderBy(sql`count(*) desc`);

  return rows;
}
