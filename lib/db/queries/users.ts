import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { authTokens, users, type User } from "@/lib/db/schema";
import { generateToken, hashToken, TOKEN_TTL_MS } from "@/lib/auth/tokens";
import type { ThemeAccent, ThemeMode } from "@/lib/theme/presets";

export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(users.name);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return user;
}

/**
 * Creates an invited member and their invite token in one transaction.
 */
export async function createInvitedUser(params: {
  name: string;
  email: string;
  title?: string;
}): Promise<{ userId: string; token: string }> {
  const token = generateToken();

  const userId = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: params.name,
        email: params.email.toLowerCase().trim(),
        title: params.title?.trim() || null,
        role: "member",
        status: "invited",
      })
      .returning({ id: users.id });

    await tx.insert(authTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      purpose: "invite",
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS.invite),
    });

    return user.id;
  });

  return { userId, token };
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  await db.insert(authTokens).values({
    userId,
    tokenHash: hashToken(token),
    purpose: "password_reset",
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS.password_reset),
  });
  return token;
}

export async function createEmailChangeToken(
  userId: string,
  newEmail: string,
): Promise<string> {
  const token = generateToken();
  await db.insert(authTokens).values({
    userId,
    tokenHash: hashToken(token),
    purpose: "email_change",
    newEmail: newEmail.toLowerCase().trim(),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS.email_change),
  });
  return token;
}

export async function consumeAuthToken(
  token: string,
  purpose: "invite" | "password_reset" | "email_change",
) {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, tokenHash),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return null;

  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.id, row.id));

  return row;
}

export async function activateUser(userId: string, passwordHash: string) {
  await db
    .update(users)
    .set({ passwordHash, status: "active", updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updatePassword(userId: string, passwordHash: string) {
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateEmail(userId: string, email: string) {
  await db
    .update(users)
    .set({ email: email.toLowerCase().trim(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function markUserLeft(userId: string) {
  await db
    .update(users)
    .set({ status: "left", updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserTheme(
  userId: string,
  mode: ThemeMode,
  accent: ThemeAccent,
) {
  await db
    .update(users)
    .set({ themeMode: mode, themeAccent: accent })
    .where(eq(users.id, userId));
}

export async function updateTitle(userId: string, title: string) {
  await db
    .update(users)
    .set({ title: title.trim() || null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
