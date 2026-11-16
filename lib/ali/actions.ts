"use server";

import { redirect } from "next/navigation";
import { requireUser, AuthError } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { aliEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createAliEvent,
  setParticipation,
  setVote,
  startShopping,
  completeEvent,
  cancelEvent,
  getParticipation,
  getAliEvent,
  setShoppingCheck,
} from "@/lib/db/queries/ali-events";
import {
  addIngredient,
  deactivateIngredient,
  setUserDefaultIngredient,
} from "@/lib/db/queries/ingredients";
import {
  createAliEventSchema,
  addIngredientSchema,
  addIngredientWithQuantitySchema,
} from "@/lib/validation/ali";
import { shoppingStartedEmailTemplate } from "@/lib/email/templates";
import { appUrl, emailFrom, sendEmail } from "@/lib/email/resend";
import { getAllUsers } from "@/lib/db/queries/users";
import type { ActionState } from "@/lib/auth/actions";

async function requireOrganizerOrAdmin(eventId: string) {
  const user = await requireUser();
  if (user.role === "admin") return user;

  const [event] = await db
    .select({ organizerId: aliEvents.organizerId })
    .from(aliEvents)
    .where(eq(aliEvents.id, eventId))
    .limit(1);

  if (!event || event.organizerId !== user.id) {
    throw new AuthError("Only the organizer or an admin can do this");
  }
  return user;
}

export async function createEventAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createAliEventSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const id = await createAliEvent({ ...parsed.data, organizerId: user.id });

  // Tell every active member right away, so they can opt in and pick their
  // ingredients while voting is still open. Email is a supporting
  // notification: a bad address or an unconfigured mail service must not
  // stop the ALI from being created.
  const { subject, html, text } = shoppingStartedEmailTemplate({
    organizerName: user.name,
    eventName: parsed.data.name,
    eventUrl: `${appUrl()}/ali/${id}`,
  });
  const members = (await getAllUsers()).filter(
    (member) => member.status === "active" && member.id !== user.id,
  );
  const results = await Promise.allSettled(
    members.map((member) =>
      sendEmail({ from: emailFrom(), to: member.email, subject, html, text }),
    ),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to send ALI invitation email:", result.reason);
    }
  }

  redirect(`/ali/${id}`);
}

/** Once shopping starts the list is locked: no more opting in/out or voting. */
async function requireVotingOpen(eventId: string) {
  const event = await getAliEvent(eventId);
  if (!event || event.status !== "voting") {
    throw new AuthError("Voting for this ALI is closed");
  }
}

export async function toggleParticipationAction(eventId: string, optedIn: boolean) {
  const user = await requireUser();
  await requireVotingOpen(eventId);
  await setParticipation(eventId, user.id, optedIn);
}

export async function setVoteAction(eventId: string, ingredientId: string, quantity: number) {
  const user = await requireUser();
  await requireVotingOpen(eventId);
  const participation = await getParticipation(eventId, user.id);
  if (participation !== true) {
    throw new AuthError("Opt in to this ALI before voting on ingredients");
  }
  await setVote(eventId, user.id, ingredientId, quantity);
}

export async function addIngredientToEventAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const event = await getAliEvent(eventId);
  if (!event || event.status !== "voting") {
    return { error: "Voting for this ALI is closed." };
  }
  const participation = await getParticipation(eventId, user.id);
  if (participation !== true) {
    return { error: "Opt in to this ALI before adding ingredients." };
  }

  const parsed = addIngredientWithQuantitySchema.safeParse({
    name: formData.get("name"),
    packageSize: formData.get("packageSize"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ingredientId = await addIngredient(parsed.data.name, parsed.data.packageSize);
  await setVote(eventId, user.id, ingredientId, parsed.data.quantity);

  return { success: `Added ${parsed.data.name}.` };
}

export async function startShoppingAction(eventId: string) {
  const user = await requireOrganizerOrAdmin(eventId);

  // Locks the list in. No email here: everyone was already asked to vote
  // when the ALI was created, and voting is closed from this point on.
  await startShopping(eventId, user.id);
}

export async function completeEventAction(eventId: string) {
  await requireOrganizerOrAdmin(eventId);
  await completeEvent(eventId);
}

export async function cancelEventAction(eventId: string) {
  await requireOrganizerOrAdmin(eventId);
  await cancelEvent(eventId);
}

export async function addIngredientAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = addIngredientSchema.safeParse({
    name: formData.get("name"),
    packageSize: formData.get("packageSize"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await addIngredient(parsed.data.name, parsed.data.packageSize);
  return { success: `Added ${parsed.data.name}.` };
}

export async function deactivateIngredientAction(ingredientId: string) {
  await requireUser();
  await deactivateIngredient(ingredientId);
}

export async function toggleDefaultIngredientAction(
  ingredientId: string,
  isDefault: boolean,
) {
  const user = await requireUser();
  await setUserDefaultIngredient(user.id, ingredientId, isDefault);
}

export async function toggleShoppingCheckAction(
  eventId: string,
  ingredientId: string,
  checked: boolean,
) {
  const user = await requireUser();
  const event = await getAliEvent(eventId);
  if (!event || event.status !== "shopping") {
    throw new AuthError("This shopping list is closed");
  }
  await setShoppingCheck(eventId, ingredientId, user.id, checked);
}
