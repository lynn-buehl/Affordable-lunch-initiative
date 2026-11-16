/**
 * One-off bootstrap for the first admin account. Phase 1 has no public
 * signup, so this is how you create the account that can then invite
 * everyone else through the app itself.
 *
 * Usage: npm run seed -- "Admin Name" admin@example.com "a-strong-password"
 */
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

async function main() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Usage: npm run seed -- "Admin Name" admin@example.com "password"');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "admin",
    status: "active",
  });

  console.log(`Created admin ${email}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
