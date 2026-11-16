import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  aliEvents,
  aliParticipants,
  ingredientVotes,
  ingredients,
  ledgerEntries,
  receiptItems,
  receipts,
  userIngredientDefaults,
  users,
} from "@/lib/db/schema";
import { getKarmaByUser, type PersonKarma } from "@/lib/db/queries/karma";
import { getMemberBalances } from "@/lib/db/queries/ledger";

export type FavouriteIngredient = { ingredientId: string; name: string; total: number };

/** What one person asks for most, summed over every ALI they voted in. */
export async function getFavouriteIngredientsForUser(
  userId: string,
  limit = 8,
): Promise<FavouriteIngredient[]> {
  const total = sql<number>`sum(${ingredientVotes.quantity})`.mapWith(Number);
  return db
    .select({ ingredientId: ingredients.id, name: ingredients.name, total })
    .from(ingredientVotes)
    .innerJoin(ingredients, eq(ingredientVotes.ingredientId, ingredients.id))
    .where(eq(ingredientVotes.userId, userId))
    .groupBy(ingredients.id, ingredients.name)
    .orderBy(desc(total), ingredients.name)
    .limit(limit);
}

export type GroupFavourite = { ingredientId: string; name: string; total: number; fans: number };

/** What the whole group is asking for right now (all ALI types). */
export async function getGroupFavourites(days = 90, limit = 8): Promise<GroupFavourite[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const total = sql<number>`sum(${ingredientVotes.quantity})`.mapWith(Number);
  return db
    .select({
      ingredientId: ingredients.id,
      name: ingredients.name,
      total,
      fans: sql<number>`count(distinct ${ingredientVotes.userId})`.mapWith(Number),
    })
    .from(ingredientVotes)
    .innerJoin(ingredients, eq(ingredientVotes.ingredientId, ingredients.id))
    .innerJoin(aliEvents, eq(ingredientVotes.aliEventId, aliEvents.id))
    .where(gte(aliEvents.createdAt, since))
    .groupBy(ingredients.id, ingredients.name)
    .orderBy(desc(total), ingredients.name)
    .limit(limit);
}

export type MemberSummary = {
  userId: string;
  name: string;
  role: "admin" | "member";
  karmaCents: number;
  karmaRank: number;
  balanceCents: number;
  mealsJoined: number;
  shoppingTrips: number;
  topIngredient: string | null;
};

async function getActivityCounts() {
  const [meals, trips, tops] = await Promise.all([
    db
      .select({
        userId: aliParticipants.userId,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(aliParticipants)
      .innerJoin(aliEvents, eq(aliParticipants.aliEventId, aliEvents.id))
      .where(and(eq(aliParticipants.optedIn, true), sql`${aliEvents.status} <> 'cancelled'`))
      .groupBy(aliParticipants.userId),
    db
      .select({
        userId: aliEvents.shoppingStartedBy,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(aliEvents)
      .where(sql`${aliEvents.shoppingStartedBy} is not null and ${aliEvents.status} <> 'cancelled'`)
      .groupBy(aliEvents.shoppingStartedBy),
    db
      .select({
        userId: ingredientVotes.userId,
        name: ingredients.name,
        total: sql<number>`sum(${ingredientVotes.quantity})`.mapWith(Number),
      })
      .from(ingredientVotes)
      .innerJoin(ingredients, eq(ingredientVotes.ingredientId, ingredients.id))
      .groupBy(ingredientVotes.userId, ingredients.name),
  ]);

  const topByUser = new Map<string, { name: string; total: number }>();
  for (const row of tops) {
    const current = topByUser.get(row.userId);
    if (!current || row.total > current.total) topByUser.set(row.userId, row);
  }

  return {
    meals: new Map(meals.map((m) => [m.userId, m.n])),
    trips: new Map(trips.map((t) => [t.userId as string, t.n])),
    top: topByUser,
  };
}

/** Every active member with the headline numbers shown on their card. */
export async function getMemberSummaries(): Promise<MemberSummary[]> {
  const [karma, balances, activity, roles] = await Promise.all([
    getKarmaByUser(),
    getMemberBalances(),
    getActivityCounts(),
    db.select({ id: users.id, role: users.role }).from(users),
  ]);
  const balanceByUser = new Map(balances.map((b) => [b.userId, b.finalBalance]));
  const roleByUser = new Map(roles.map((r) => [r.id, r.role]));

  // getKarmaByUser is already sorted best-first, so the index is the rank.
  return karma.map((person, index) => ({
    userId: person.userId,
    name: person.name,
    role: roleByUser.get(person.userId) ?? "member",
    karmaCents: Math.round(person.totalKarmaCents),
    karmaRank: index + 1,
    balanceCents: balanceByUser.get(person.userId) ?? 0,
    mealsJoined: activity.meals.get(person.userId) ?? 0,
    shoppingTrips: activity.trips.get(person.userId) ?? 0,
    topIngredient: activity.top.get(person.userId)?.name ?? null,
  }));
}

export type ProfileActivity = {
  id: string;
  kind: "expense" | "contribution" | "meal";
  label: string;
  date: Date;
  amountCents: number | null;
  href: string | null;
};

export type MemberProfile = {
  summary: MemberSummary;
  memberCount: number;
  memberSince: Date;
  title: string | null;
  karma: PersonKarma;
  totalSpentCents: number;
  favourites: FavouriteIngredient[];
  defaults: string[];
  bought: { name: string; quantity: number }[];
  activity: ProfileActivity[];
};

export async function getMemberProfile(userId: string): Promise<MemberProfile | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.status !== "active") return undefined;

  const [summaries, karmaAll, favourites, defaults, spendRows, mealRows, bought] =
    await Promise.all([
      getMemberSummaries(),
      getKarmaByUser(),
      getFavouriteIngredientsForUser(userId),
      db
        .select({ name: ingredients.name })
        .from(userIngredientDefaults)
        .innerJoin(ingredients, eq(userIngredientDefaults.ingredientId, ingredients.id))
        .where(eq(userIngredientDefaults.userId, userId))
        .orderBy(ingredients.name),
      db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.userId, userId))
        .orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.createdAt)),
      db
        .select({ id: aliEvents.id, name: aliEvents.name, createdAt: aliEvents.createdAt })
        .from(aliParticipants)
        .innerJoin(aliEvents, eq(aliParticipants.aliEventId, aliEvents.id))
        .where(
          and(
            eq(aliParticipants.userId, userId),
            eq(aliParticipants.optedIn, true),
            sql`${aliEvents.status} <> 'cancelled'`,
          ),
        )
        .orderBy(desc(aliEvents.createdAt))
        .limit(10),
      // What this person actually carried home, from their scanned receipts.
      db
        .select({
          name: ingredients.name,
          quantity: sql<number>`sum(${receiptItems.quantity})`.mapWith(Number),
        })
        .from(receiptItems)
        .innerJoin(receipts, eq(receiptItems.receiptId, receipts.id))
        .innerJoin(ingredients, eq(receiptItems.ingredientId, ingredients.id))
        .where(eq(receipts.uploadedBy, userId))
        .groupBy(ingredients.name)
        .orderBy(desc(sql`sum(${receiptItems.quantity})`))
        .limit(8),
    ]);

  const summary = summaries.find((s) => s.userId === userId);
  const karma = karmaAll.find((k) => k.userId === userId);
  if (!summary || !karma) return undefined;

  const activity: ProfileActivity[] = [
    ...spendRows.slice(0, 10).map((row) => ({
      id: row.id,
      kind: row.entryType,
      label: row.description,
      date: new Date(row.entryDate),
      amountCents: row.amountCents,
      href: row.aliEventId ? `/ali/${row.aliEventId}` : null,
    })),
    ...mealRows.map((row) => ({
      id: `meal-${row.id}`,
      kind: "meal" as const,
      label: row.name,
      date: row.createdAt,
      amountCents: null,
      href: `/ali/${row.id}`,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 12);

  return {
    summary,
    memberCount: summaries.length,
    memberSince: user.createdAt,
    title: user.title,
    karma,
    totalSpentCents: spendRows
      .filter((r) => r.entryType === "expense")
      .reduce((sum, r) => sum + r.amountCents, 0),
    favourites,
    defaults: defaults.map((d) => d.name),
    bought,
    activity,
  };
}
