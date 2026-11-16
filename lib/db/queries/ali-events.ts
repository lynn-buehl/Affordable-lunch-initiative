import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  aliEvents,
  aliParticipants,
  ingredientVotes,
  ingredients,
  shoppingChecks,
  userIngredientDefaults,
  users,
  type AliEvent,
} from "@/lib/db/schema";

export type AliEventWithOrganizer = AliEvent & {
  organizerName: string;
  participantCount: number;
};

export async function listAliEvents(): Promise<AliEventWithOrganizer[]> {
  const rows = await db
    .select({
      event: aliEvents,
      organizerName: users.name,
      participantCount: sql<number>`coalesce((select count(*) from ${aliParticipants} where ${aliParticipants.aliEventId} = ${aliEvents.id} and ${aliParticipants.optedIn} = true), 0)`,
    })
    .from(aliEvents)
    .innerJoin(users, eq(aliEvents.organizerId, users.id))
    .orderBy(desc(aliEvents.createdAt));

  return rows.map((r) => ({ ...r.event, organizerName: r.organizerName, participantCount: r.participantCount }));
}

export async function getAliEvent(id: string): Promise<AliEventWithOrganizer | undefined> {
  const [row] = await db
    .select({
      event: aliEvents,
      organizerName: users.name,
      participantCount: sql<number>`coalesce((select count(*) from ${aliParticipants} where ${aliParticipants.aliEventId} = ${aliEvents.id} and ${aliParticipants.optedIn} = true), 0)`,
    })
    .from(aliEvents)
    .innerJoin(users, eq(aliEvents.organizerId, users.id))
    .where(eq(aliEvents.id, id))
    .limit(1);

  if (!row) return undefined;
  return { ...row.event, organizerName: row.organizerName, participantCount: row.participantCount };
}

export async function createAliEvent(params: {
  name: string;
  type: string;
  organizerId: string;
}): Promise<string> {
  const [event] = await db
    .insert(aliEvents)
    .values({ name: params.name, type: params.type, organizerId: params.organizerId })
    .returning({ id: aliEvents.id });

  // Organizer is opted in by default.
  await setParticipation(event.id, params.organizerId, true);

  return event.id;
}

export type Participant = { userId: string; name: string; optedIn: boolean };

export async function getParticipants(eventId: string): Promise<Participant[]> {
  const rows = await db
    .select({
      userId: aliParticipants.userId,
      name: users.name,
      optedIn: aliParticipants.optedIn,
    })
    .from(aliParticipants)
    .innerJoin(users, eq(aliParticipants.userId, users.id))
    .where(eq(aliParticipants.aliEventId, eventId))
    .orderBy(users.name);

  return rows;
}

export async function getParticipation(
  eventId: string,
  userId: string,
): Promise<boolean | null> {
  const [row] = await db
    .select({ optedIn: aliParticipants.optedIn })
    .from(aliParticipants)
    .where(and(eq(aliParticipants.aliEventId, eventId), eq(aliParticipants.userId, userId)))
    .limit(1);
  return row?.optedIn ?? null;
}

/**
 * Opts a user in/out of an event. On a user's first opt-in, pre-fills their
 * vote from their standing default ingredients (lib/db/queries/ingredients.ts)
 * rather than leaving them to re-pick every time.
 */
export async function setParticipation(eventId: string, userId: string, optedIn: boolean) {
  const wasParticipant = await db
    .select({ userId: aliParticipants.userId })
    .from(aliParticipants)
    .where(and(eq(aliParticipants.aliEventId, eventId), eq(aliParticipants.userId, userId)))
    .limit(1);

  await db
    .insert(aliParticipants)
    .values({ aliEventId: eventId, userId, optedIn })
    .onConflictDoUpdate({
      target: [aliParticipants.aliEventId, aliParticipants.userId],
      set: { optedIn, respondedAt: new Date() },
    });

  if (optedIn && wasParticipant.length === 0) {
    const defaults = await db
      .select({ ingredientId: userIngredientDefaults.ingredientId })
      .from(userIngredientDefaults)
      .where(eq(userIngredientDefaults.userId, userId));

    if (defaults.length > 0) {
      await db
        .insert(ingredientVotes)
        .values(
          defaults.map((d) => ({
            aliEventId: eventId,
            userId,
            ingredientId: d.ingredientId,
            quantity: 1,
          })),
        )
        .onConflictDoNothing();
    }
  }
}

/** Ingredient id -> quantity this user wants for this event. */
export async function getVotesForUser(
  eventId: string,
  userId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ ingredientId: ingredientVotes.ingredientId, quantity: ingredientVotes.quantity })
    .from(ingredientVotes)
    .where(and(eq(ingredientVotes.aliEventId, eventId), eq(ingredientVotes.userId, userId)));
  return new Map(rows.map((r) => [r.ingredientId, r.quantity]));
}

/** quantity <= 0 removes the vote entirely. */
export async function setVote(
  eventId: string,
  userId: string,
  ingredientId: string,
  quantity: number,
) {
  if (quantity > 0) {
    await db
      .insert(ingredientVotes)
      .values({ aliEventId: eventId, userId, ingredientId, quantity })
      .onConflictDoUpdate({
        target: [ingredientVotes.aliEventId, ingredientVotes.userId, ingredientVotes.ingredientId],
        set: { quantity },
      });
  } else {
    await db
      .delete(ingredientVotes)
      .where(
        and(
          eq(ingredientVotes.aliEventId, eventId),
          eq(ingredientVotes.userId, userId),
          eq(ingredientVotes.ingredientId, ingredientId),
        ),
      );
  }
}

export async function startShopping(eventId: string, startedByUserId: string) {
  await db
    .update(aliEvents)
    .set({ status: "shopping", shoppingStartedAt: new Date(), shoppingStartedBy: startedByUserId })
    .where(eq(aliEvents.id, eventId));
}

export async function completeEvent(eventId: string) {
  await db.update(aliEvents).set({ status: "completed" }).where(eq(aliEvents.id, eventId));
}

export async function cancelEvent(eventId: string) {
  await db.update(aliEvents).set({ status: "cancelled" }).where(eq(aliEvents.id, eventId));
}

export type ShoppingListItem = {
  ingredientId: string;
  name: string;
  quantity: number;
  packageSize: number;
  packagesToBuy: number;
  checked: boolean;
};

/** Requested quantities among opted-in participants, rounded up to packages to buy. */
export async function getShoppingList(eventId: string): Promise<ShoppingListItem[]> {
  const rows = await db
    .select({
      ingredientId: ingredients.id,
      name: ingredients.name,
      packageSize: ingredients.packageSize,
      quantity: sql<number>`sum(${ingredientVotes.quantity})`.mapWith(Number),
      checked: sql<boolean>`exists (select 1 from ${shoppingChecks} where ${shoppingChecks.aliEventId} = ${ingredientVotes.aliEventId} and ${shoppingChecks.ingredientId} = ${ingredients.id})`,
    })
    .from(ingredientVotes)
    .innerJoin(ingredients, eq(ingredientVotes.ingredientId, ingredients.id))
    .innerJoin(
      aliParticipants,
      and(
        eq(ingredientVotes.aliEventId, aliParticipants.aliEventId),
        eq(ingredientVotes.userId, aliParticipants.userId),
      ),
    )
    .where(and(eq(ingredientVotes.aliEventId, eventId), eq(aliParticipants.optedIn, true)))
    .groupBy(ingredients.id, ingredients.name, ingredients.packageSize, ingredientVotes.aliEventId)
    .orderBy(ingredients.name);

  return rows.map((r) => ({
    ...r,
    packagesToBuy: Math.ceil(r.quantity / r.packageSize),
  }));
}

export async function getEmailsOfOptedInParticipants(eventId: string): Promise<
  { name: string; email: string }[]
> {
  const rows = await db
    .select({ name: users.name, email: users.email })
    .from(aliParticipants)
    .innerJoin(users, eq(aliParticipants.userId, users.id))
    .where(and(eq(aliParticipants.aliEventId, eventId), eq(aliParticipants.optedIn, true)));
  return rows;
}

export async function setShoppingCheck(
  eventId: string,
  ingredientId: string,
  userId: string,
  checked: boolean,
) {
  if (checked) {
    await db
      .insert(shoppingChecks)
      .values({ aliEventId: eventId, ingredientId, checkedBy: userId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(shoppingChecks)
      .where(
        and(eq(shoppingChecks.aliEventId, eventId), eq(shoppingChecks.ingredientId, ingredientId)),
      );
  }
}

/** The ALI the group is currently working on, if any: shopping beats voting. */
export async function getCurrentAliEvent(): Promise<AliEventWithOrganizer | undefined> {
  const events = await listAliEvents();
  return (
    events.find((e) => e.status === "shopping") ?? events.find((e) => e.status === "voting")
  );
}
