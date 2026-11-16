"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth/rbac";
import {
  ledgerEntrySchema,
  adjustmentSchema,
  addMemberSchema,
  profileSchema,
} from "@/lib/validation/finance";
import { parseEuroInput } from "@/lib/money";
import { insertLedgerEntry, getComputedBalanceForUser } from "@/lib/db/queries/ledger";
import { insertAdjustment } from "@/lib/db/queries/adjustments";
import { createInvitedUser, markUserLeft, updateTitle, getUserByEmail } from "@/lib/db/queries/users";
import { inviteEmailTemplate } from "@/lib/email/templates";
import { appUrl, emailFrom, sendEmail } from "@/lib/email/resend";
import type { ActionState } from "@/lib/auth/actions";

export async function ledgerEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const onBehalfOfUserId = formData.get("onBehalfOfUserId");
  const aliEventId = formData.get("aliEventId");
  const parsed = ledgerEntrySchema.safeParse({
    entryType: formData.get("entryType"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    entryDate: formData.get("entryDate"),
    onBehalfOfUserId:
      typeof onBehalfOfUserId === "string" && onBehalfOfUserId.length > 0
        ? onBehalfOfUserId
        : undefined,
    aliEventId:
      typeof aliEventId === "string" && aliEventId.length > 0 ? aliEventId : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let targetUserId = user.id;
  if (parsed.data.onBehalfOfUserId && parsed.data.onBehalfOfUserId !== user.id) {
    await requireAdmin();
    targetUserId = parsed.data.onBehalfOfUserId;
  }

  const amountCents = parseEuroInput(parsed.data.amount);
  if (amountCents === null || amountCents <= 0) {
    return { error: "Enter a positive amount" };
  }

  await insertLedgerEntry({
    userId: targetUserId,
    entryType: parsed.data.entryType,
    amountCents,
    description: parsed.data.description,
    entryDate: parsed.data.entryDate,
    aliEventId: parsed.data.aliEventId,
    createdBy: user.id,
  });

  redirect(parsed.data.aliEventId ? `/ali/${parsed.data.aliEventId}` : "/finance");
}

export async function adjustmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = adjustmentSchema.safeParse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const amountCents = parseEuroInput(parsed.data.amount);
  if (amountCents === null) return { error: "Enter a valid amount" };

  await insertAdjustment({
    userId: parsed.data.userId,
    amountCents,
    reason: parsed.data.reason,
    createdBy: admin.id,
  });

  return { success: "Adjustment recorded." };
}

export async function settleToZeroAction(userId: string) {
  const admin = await requireAdmin();
  const computedBalance = await getComputedBalanceForUser(userId);
  if (computedBalance === 0) return;

  await insertAdjustment({
    userId,
    amountCents: -computedBalance,
    reason: "Final balancing on leaving the group",
    createdBy: admin.id,
  });
}

export async function addMemberAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = addMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    title: formData.get("title") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (await getUserByEmail(parsed.data.email)) {
    return { error: "Someone with that email is already a member." };
  }

  const { token } = await createInvitedUser(parsed.data);
  const { subject, html, text } = inviteEmailTemplate({
    name: parsed.data.name,
    acceptUrl: `${appUrl()}/accept-invite/${token}`,
  });

  try {
    await sendEmail({ from: emailFrom(), to: parsed.data.email, subject, html, text });
  } catch {
    return {
      error: `${parsed.data.name} was added, but the invite email failed to send. Check the email configuration and try inviting again.`,
    };
  }

  return { success: `Invite sent to ${parsed.data.email}.` };
}

export async function markLeftAction(userId: string) {
  await requireAdmin();
  await markUserLeft(userId);
}

export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ title: formData.get("title") ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await updateTitle(user.id, parsed.data.title);
  return { success: "Profile updated." };
}
