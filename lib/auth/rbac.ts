import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";

export class AuthError extends Error {}

/**
 * Re-reads the caller's role/status from Postgres rather than trusting the
 * JWT claim, so a demoted/removed admin loses access immediately rather
 * than after their token expires.
 */
async function currentUser(): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("Not signed in");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || user.status !== "active") {
    throw new AuthError("Account is not active");
  }

  return user;
}

export async function requireUser(): Promise<User> {
  return currentUser();
}

export async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (user.role !== "admin") throw new AuthError("Admin access required");
  return user;
}
