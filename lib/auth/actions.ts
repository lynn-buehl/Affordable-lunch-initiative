"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth/config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  acceptInviteSchema,
  changeEmailSchema,
  changePasswordSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import {
  activateUser,
  consumeAuthToken,
  createEmailChangeToken,
  createPasswordResetToken,
  getUserByEmail,
  updatePassword,
} from "@/lib/db/queries/users";
import { requireUser } from "@/lib/auth/rbac";
import { clearRateLimit, clientIp, consumeRateLimit } from "@/lib/auth/rate-limit";
import {
  emailChangeConfirmationTemplate,
  passwordResetEmailTemplate,
} from "@/lib/email/templates";
import { appUrl, emailFrom, sendEmail } from "@/lib/email/resend";

export type ActionState = { error?: string; success?: string } | undefined;

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password" };

  // Slow down password guessing: per account and per caller address.
  const emailKey = `login:${parsed.data.email.toLowerCase().trim()}`;
  const [emailOk, ipOk] = await Promise.all([
    consumeRateLimit(emailKey, 8, 15 * 60),
    consumeRateLimit(`login-ip:${await clientIp()}`, 40, 15 * 60),
  ]);
  if (!emailOk || !ipOk) {
    return { error: "Too many sign-in attempts. Wait 15 minutes and try again." };
  }

  // A correct password shouldn't leave earlier typos counting against the
  // account, so check it first and clear the counter on success.
  const candidate = await getUserByEmail(parsed.data.email);
  if (
    candidate?.passwordHash &&
    candidate.status === "active" &&
    (await verifyPassword(candidate.passwordHash, parsed.data.password))
  ) {
    await clearRateLimit(emailKey);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
}

export async function acceptInviteAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tokenRow = await consumeAuthToken(parsed.data.token, "invite");
  if (!tokenRow) return { error: "This invite link is invalid or expired." };

  const passwordHash = await hashPassword(parsed.data.password);
  await activateUser(tokenRow.userId, passwordHash);

  redirect("/login?activated=1");
}

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });
  // Always report success regardless of whether the account exists, so
  // this form can't be used to enumerate registered email addresses.
  const genericSuccess = {
    success: "If that email is registered, a reset link has been sent.",
  };
  if (!parsed.success) return genericSuccess;

  // Stops this form being used to flood someone's inbox with reset emails.
  const allowed = await consumeRateLimit(
    `reset:${parsed.data.email.toLowerCase().trim()}`,
    3,
    60 * 60,
  );
  if (!allowed) return genericSuccess;

  const user = await getUserByEmail(parsed.data.email);
  if (!user || user.status !== "active") return genericSuccess;

  const token = await createPasswordResetToken(user.id);
  const { subject, html, text } = passwordResetEmailTemplate({
    name: user.name,
    resetUrl: `${appUrl()}/reset-password/${token}`,
  });
  try {
    await sendEmail({ from: emailFrom(), to: user.email, subject, html, text });
  } catch (error) {
    // Don't leak send failures to the client here: only real accounts ever
    // reach this point (unknown emails return genericSuccess above), so a
    // different response would itself be an enumeration signal.
    console.error("Failed to send password reset email:", error);
  }

  return genericSuccess;
}

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tokenRow = await consumeAuthToken(parsed.data.token, "password_reset");
  if (!tokenRow) return { error: "This reset link is invalid or expired." };

  const passwordHash = await hashPassword(parsed.data.password);
  await updatePassword(tokenRow.userId, passwordHash);

  redirect("/login?reset=1");
}

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!user.passwordHash) return { error: "Account has no password set." };
  const valid = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await updatePassword(user.id, passwordHash);

  return { success: "Password updated." };
}

export async function changeEmailAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changeEmailSchema.safeParse({
    newEmail: formData.get("newEmail"),
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!user.passwordHash) return { error: "Account has no password set." };
  const valid = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!valid) return { error: "Current password is incorrect." };

  const existing = await getUserByEmail(parsed.data.newEmail);
  if (existing && existing.id !== user.id) {
    return { error: "That email is already in use." };
  }

  const token = await createEmailChangeToken(user.id, parsed.data.newEmail);
  const { subject, html, text } = emailChangeConfirmationTemplate({
    name: user.name,
    newEmail: parsed.data.newEmail,
    confirmUrl: `${appUrl()}/confirm-email/${token}`,
  });
  try {
    await sendEmail({ from: emailFrom(), to: parsed.data.newEmail, subject, html, text });
  } catch {
    return { error: "Could not send the confirmation email. Try again shortly." };
  }

  return {
    success: `Confirmation link sent to ${parsed.data.newEmail}. Click it to finish changing your email.`,
  };
}
