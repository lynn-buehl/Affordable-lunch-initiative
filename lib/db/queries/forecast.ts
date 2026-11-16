import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  aliEvents,
  aliParticipants,
  aliReviewNotes,
  ingredientReviews,
  ingredientVotes,
  ingredients,
  userIngredientDefaults,
  users,
} from "@/lib/db/schema";
import {
  PREFERENCE_HISTORY,
  REVIEW_HISTORY,
  personalForecast,
  prefillFromForecast,
  reviewFactor,
  type Verdict,
} from "@/lib/ali/forecast";

/** The vote a person is pre-filled with when they opt into `eventId`. */
export async function getPrefillForUser(
  userId: string,
  eventId: string,
): Promise<Map<string, number>> {
  const [standingRows, pastEvents] = await Promise.all([
    db
      .select({ ingredientId: userIngredientDefaults.ingredientId })
      .from(userIngredientDefaults)
      .where(eq(userIngredientDefaults.userId, userId)),
    // The most recent ALIs this person actually took part in.
    db
      .select({ id: aliEvents.id })
      .from(aliParticipants)
      .innerJoin(aliEvents, eq(aliParticipants.aliEventId, aliEvents.id))
      .where(
        and(
          eq(aliParticipants.userId, userId),
          eq(aliParticipants.optedIn, true),
          ne(aliEvents.id, eventId),
          inArray(aliEvents.status, ["shopping", "completed"]),
        ),
      )
      .orderBy(desc(aliEvents.createdAt))
      .limit(PREFERENCE_HISTORY),
  ]);

  const standingOrder = new Set(standingRows.map((r) => r.ingredientId));
  const eventIds = pastEvents.map((e) => e.id);
  const voteRows =
    eventIds.length > 0
      ? await db
          .select({
            aliEventId: ingredientVotes.aliEventId,
            ingredientId: ingredientVotes.ingredientId,
            quantity: ingredientVotes.quantity,
          })
          .from(ingredientVotes)
          .where(
            and(eq(ingredientVotes.userId, userId), inArray(ingredientVotes.aliEventId, eventIds)),
          )
      : [];

  const votesByEvent = new Map<string, Map<string, number>>(eventIds.map((id) => [id, new Map()]));
  for (const row of voteRows) votesByEvent.get(row.aliEventId)!.set(row.ingredientId, row.quantity);

  const expected = personalForecast(
    eventIds.map((id) => votesByEvent.get(id)!),
    standingOrder,
  );
  const prefill = prefillFromForecast(expected, standingOrder);

  // Never pre-fill something that has since been taken off the ingredient
  // list: the person couldn't see it on the vote screen to remove it.
  const active = new Set(
    (
      await db.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.isActive, true))
    ).map((i) => i.id),
  );
  return new Map([...prefill].filter(([ingredientId]) => active.has(ingredientId)));
}

/**
 * Review multiplier per ingredient for an ALI, from reviews of the ALIs
 * before it. Ingredients without reviews are simply absent (factor 1).
 */
export async function getReviewFactors(eventId: string): Promise<Map<string, number>> {
  const reviewedEvents = await db
    .select({ id: aliEvents.id })
    .from(aliEvents)
    .where(
      and(
        eq(aliEvents.status, "completed"),
        ne(aliEvents.id, eventId),
        sql`exists (select 1 from ${ingredientReviews} where ${ingredientReviews.aliEventId} = ${aliEvents.id})`,
        sql`${aliEvents.createdAt} < coalesce((select e.created_at from ali_events e where e.id = ${eventId}), now())`,
      ),
    )
    .orderBy(desc(aliEvents.createdAt))
    .limit(REVIEW_HISTORY);

  const eventIds = reviewedEvents.map((e) => e.id);
  if (eventIds.length === 0) return new Map();

  const rows = await db
    .select({
      aliEventId: ingredientReviews.aliEventId,
      ingredientId: ingredientReviews.ingredientId,
      verdict: ingredientReviews.verdict,
    })
    .from(ingredientReviews)
    .where(inArray(ingredientReviews.aliEventId, eventIds));

  // ingredient -> verdicts per ALI, in most-recent-first order.
  const byIngredient = new Map<string, Verdict[][]>();
  for (const row of rows) {
    const perAli = byIngredient.get(row.ingredientId) ?? eventIds.map(() => []);
    perAli[eventIds.indexOf(row.aliEventId)].push(row.verdict);
    byIngredient.set(row.ingredientId, perAli);
  }

  const factors = new Map<string, number>();
  for (const [ingredientId, perAli] of byIngredient) {
    const factor = reviewFactor(perAli);
    if (factor !== 1) factors.set(ingredientId, factor);
  }
  return factors;
}

export async function getReviewsByUser(
  eventId: string,
  userId: string,
): Promise<{ verdicts: Record<string, Verdict>; note: string }> {
  const [verdictRows, noteRows] = await Promise.all([
    db
      .select({ ingredientId: ingredientReviews.ingredientId, verdict: ingredientReviews.verdict })
      .from(ingredientReviews)
      .where(and(eq(ingredientReviews.aliEventId, eventId), eq(ingredientReviews.userId, userId))),
    db
      .select({ note: aliReviewNotes.note })
      .from(aliReviewNotes)
      .where(and(eq(aliReviewNotes.aliEventId, eventId), eq(aliReviewNotes.userId, userId))),
  ]);
  return {
    verdicts: Object.fromEntries(verdictRows.map((r) => [r.ingredientId, r.verdict])),
    note: noteRows[0]?.note ?? "",
  };
}

/** null removes the verdict. */
export async function setIngredientReview(
  eventId: string,
  userId: string,
  ingredientId: string,
  verdict: Verdict | null,
) {
  if (verdict === null) {
    await db
      .delete(ingredientReviews)
      .where(
        and(
          eq(ingredientReviews.aliEventId, eventId),
          eq(ingredientReviews.userId, userId),
          eq(ingredientReviews.ingredientId, ingredientId),
        ),
      );
    return;
  }
  await db
    .insert(ingredientReviews)
    .values({ aliEventId: eventId, userId, ingredientId, verdict })
    .onConflictDoUpdate({
      target: [ingredientReviews.aliEventId, ingredientReviews.userId, ingredientReviews.ingredientId],
      set: { verdict, createdAt: new Date() },
    });
}

export async function setReviewNote(eventId: string, userId: string, note: string) {
  const trimmed = note.trim();
  if (trimmed.length === 0) {
    await db
      .delete(aliReviewNotes)
      .where(and(eq(aliReviewNotes.aliEventId, eventId), eq(aliReviewNotes.userId, userId)));
    return;
  }
  await db
    .insert(aliReviewNotes)
    .values({ aliEventId: eventId, userId, note: trimmed })
    .onConflictDoUpdate({
      target: [aliReviewNotes.aliEventId, aliReviewNotes.userId],
      set: { note: trimmed, createdAt: new Date() },
    });
}

export type ReviewSummary = {
  eventId: string;
  eventName: string;
  tallies: { ingredientId: string; tooLittle: number; justRight: number; tooMuch: number }[];
  notes: { userName: string; note: string }[];
};

/** Everyone's reviews of one ALI, tallied. */
export async function getReviewSummary(eventId: string): Promise<ReviewSummary | undefined> {
  const [event] = await db
    .select({ id: aliEvents.id, name: aliEvents.name })
    .from(aliEvents)
    .where(eq(aliEvents.id, eventId))
    .limit(1);
  if (!event) return undefined;

  const count = (verdict: Verdict) =>
    sql<number>`count(*) filter (where ${ingredientReviews.verdict} = ${verdict})`.mapWith(Number);
  const [tallies, notes] = await Promise.all([
    db
      .select({
        ingredientId: ingredientReviews.ingredientId,
        tooLittle: count("too_little"),
        justRight: count("just_right"),
        tooMuch: count("too_much"),
      })
      .from(ingredientReviews)
      .where(eq(ingredientReviews.aliEventId, eventId))
      .groupBy(ingredientReviews.ingredientId),
    db
      .select({ userName: users.name, note: aliReviewNotes.note })
      .from(aliReviewNotes)
      .innerJoin(users, eq(aliReviewNotes.userId, users.id))
      .where(eq(aliReviewNotes.aliEventId, eventId))
      .orderBy(aliReviewNotes.createdAt),
  ]);
  return { eventId: event.id, eventName: event.name, tallies, notes };
}

/** The latest completed ALI before `eventId` that has any review or note. */
export async function getPreviousReviewedEventId(eventId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ id: aliEvents.id })
    .from(aliEvents)
    .where(
      and(
        eq(aliEvents.status, "completed"),
        ne(aliEvents.id, eventId),
        sql`${aliEvents.createdAt} < coalesce((select e.created_at from ali_events e where e.id = ${eventId}), now())`,
        sql`(exists (select 1 from ${ingredientReviews} where ${ingredientReviews.aliEventId} = ${aliEvents.id})
          or exists (select 1 from ${aliReviewNotes} where ${aliReviewNotes.aliEventId} = ${aliEvents.id}))`,
      ),
    )
    .orderBy(desc(aliEvents.createdAt))
    .limit(1);
  return row?.id;
}
