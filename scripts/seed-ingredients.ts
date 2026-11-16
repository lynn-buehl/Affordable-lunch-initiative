/**
 * Adds the group's usual shopping items to the ingredient list, taken from
 * a real ALI shop. Safe to run again: anything already on the list (same
 * name, ignoring case) is left alone, and nothing is ever removed.
 *
 * Package size = how many people's portions one pack covers. They are all
 * set to 1 here because that depends on how the group eats; adjust them on
 * the Ingredients page.
 *
 * Usage: npm run seed:ingredients
 */
import { db } from "@/lib/db";
import { ingredients } from "@/lib/db/schema";

const USUAL_ITEMS = [
  "Mais (Mini-Pack)",
  "Hülsenfrüchte (Mini-Pack)",
  "Wraps Weizen",
  "Wraps Mehrkorn",
  "Wraps Vollkorn",
  "Falafel vegetarisch (ohne Gemüse)",
  "Wonder Chunks",
  "Mini-Hähnchenfilets",
  "Hummus 200 g",
  "Käse in Salzlake",
  "Paprika rot (lose)",
  "Salatherzen",
  "Gurke (Bio)",
  "Tomate",
  "Clementinen 1 kg",
];

async function main() {
  const existing = new Set(
    (await db.select({ name: ingredients.name }).from(ingredients)).map((i) =>
      i.name.trim().toLowerCase(),
    ),
  );
  const missing = USUAL_ITEMS.filter((name) => !existing.has(name.toLowerCase()));
  if (missing.length > 0) {
    await db.insert(ingredients).values(missing.map((name) => ({ name, packageSize: 1 })));
  }
  console.log(
    `Added ${missing.length} ingredient(s); ${USUAL_ITEMS.length - missing.length} were already there.`,
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
