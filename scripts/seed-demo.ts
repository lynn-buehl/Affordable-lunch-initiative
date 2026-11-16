/**
 * Fills an EMPTY database with made-up members, ALIs, votes and spending, so
 * you can see what the app looks like with real-ish data (profiles, karma,
 * favourite ingredients) without waiting weeks. Refuses to run if any user
 * already exists, so it can never mix fake data into the real group's books.
 *
 * Usage: DATABASE_URL=postgresql://.../ali_demo npm run seed:demo
 * Then log in as admin@example.com / password123.
 */
import { db } from "@/lib/db";
import {
  aliEvents,
  aliParticipants,
  ingredientVotes,
  ingredients,
  ledgerEntries,
  userIngredientDefaults,
  users,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

const PEOPLE = [
  ["Ada Admin", "PhD Student"],
  ["Ben Bauer", "Postdoc"],
  ["Clara Chen", "MSc Student"],
  ["David Dietrich", "PhD Student"],
  ["Emma Engel", "Research Engineer"],
  ["Finn Fischer", "MSc Student"],
  ["Greta Graf", "PhD Student"],
] as const;

const INGREDIENTS: [string, number][] = [
  ["Schmand", 1],
  ["Chicken", 1],
  ["Wraps", 8],
  ["Döner chunks", 1],
  ["Onion", 3],
  ["Avocado", 2],
  ["Hummus", 1],
  ["Feta", 1],
  ["Kidney beans", 1],
  ["Corn", 1],
];

// Deterministic pseudo-random, so every demo database looks the same.
let seed = 42;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

async function main() {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    console.error("This database already has users. seed:demo only runs on an empty database.");
    process.exit(1);
  }

  const passwordHash = await hashPassword("password123");
  const people = await db
    .insert(users)
    .values(
      PEOPLE.map(([name, title], index) => ({
        name,
        title,
        email: index === 0 ? "admin@example.com" : `${name.split(" ")[0].toLowerCase()}@example.com`,
        passwordHash,
        role: index === 0 ? ("admin" as const) : ("member" as const),
        status: "active" as const,
      })),
    )
    .returning({ id: users.id, name: users.name });

  const items = await db
    .insert(ingredients)
    .values(INGREDIENTS.map(([name, packageSize]) => ({ name, packageSize })))
    .returning({ id: ingredients.id });

  // Each person gets a taste: a few ingredients they nearly always pick.
  const taste = people.map(() => items.filter(() => random() < 0.45).map((i) => i.id));
  await db.insert(userIngredientDefaults).values(
    people.flatMap((person, p) =>
      taste[p].slice(0, 3).map((ingredientId) => ({ userId: person.id, ingredientId })),
    ),
  );

  const WEEKS = 8;
  for (let week = WEEKS; week >= 0; week--) {
    const when = new Date(Date.now() - week * 7 * 24 * 60 * 60 * 1000);
    const organizer = people[(WEEKS - week) % people.length];
    const isCurrent = week === 0;

    const [event] = await db
      .insert(aliEvents)
      .values({
        name: isCurrent ? "Fancy ALI this Friday" : `Fancy ALI #${WEEKS - week + 1}`,
        type: "Fancy ALI",
        organizerId: organizer.id,
        status: isCurrent ? "voting" : "completed",
        shoppingStartedAt: isCurrent ? null : when,
        shoppingStartedBy: isCurrent ? null : organizer.id,
        createdAt: when,
      })
      .returning({ id: aliEvents.id });

    const eaters = people.filter((person) => person.id === organizer.id || random() < 0.7);
    await db
      .insert(aliParticipants)
      .values(eaters.map((person) => ({ aliEventId: event.id, userId: person.id, optedIn: true })));

    const votes = eaters.flatMap((person) => {
      const p = people.indexOf(person);
      return items
        .filter((item) => (taste[p].includes(item.id) ? random() < 0.9 : random() < 0.15))
        .map((item) => ({
          aliEventId: event.id,
          userId: person.id,
          ingredientId: item.id,
          quantity: 1 + Math.floor(random() * 2),
          createdAt: when,
        }));
    });
    if (votes.length > 0) await db.insert(ingredientVotes).values(votes);

    if (!isCurrent) {
      await db.insert(ledgerEntries).values({
        userId: organizer.id,
        entryType: "expense",
        amountCents: 2500 + Math.floor(random() * 3500),
        description: `Fancy ALI #${WEEKS - week + 1}`,
        entryDate: when.toISOString().slice(0, 10),
        aliEventId: event.id,
        createdBy: organizer.id,
      });
    }
  }

  console.log(`Seeded ${people.length} demo members. Log in as admin@example.com / password123`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
