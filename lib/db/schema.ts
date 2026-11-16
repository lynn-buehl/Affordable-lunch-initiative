import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const userStatusEnum = pgEnum("user_status", [
  "invited",
  "active",
  "left",
]);
export const themeModeEnum = pgEnum("theme_mode", ["light", "dark"]);
export const authTokenPurposeEnum = pgEnum("auth_token_purpose", [
  "invite",
  "password_reset",
  "email_change",
]);
export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "contribution",
  "expense",
]);
export const aliEventStatusEnum = pgEnum("ali_event_status", [
  "voting",
  "shopping",
  "completed",
  "cancelled",
]);

// --- Phase 1: accounts, finance/ledger, theming ---------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  // What they do in the group, e.g. "PhD Student". Shown on their profile.
  title: text("title"),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("member"),
  status: userStatusEnum("status").notNull().default("invited"),
  themeMode: themeModeEnum("theme_mode"),
  themeAccent: text("theme_accent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("users_email_unique_idx").on(table.email),
]);

export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  purpose: authTokenPurposeEnum("purpose").notNull(),
  newEmail: text("new_email"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("auth_tokens_token_hash_idx").on(table.tokenHash),
]);

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  entryType: ledgerEntryTypeEnum("entry_type").notNull(),
  amountCents: integer("amount_cents").notNull(),
  description: text("description").notNull(),
  entryDate: date("entry_date").notNull(),
  aliEventId: uuid("ali_event_id").references(() => aliEvents.id, {
    onDelete: "set null",
  }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const balanceAdjustments = pgTable("balance_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Forward-compatible tables for Phase 2/3 -------------------------------
// Created now so ledger_entries.ali_event_id has something to reference and
// no painful migration is needed when Phase 2/3 are built. Lightly used
// until then.

export const aliEvents = pgTable("ali_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  organizerId: uuid("organizer_id")
    .notNull()
    .references(() => users.id),
  status: aliEventStatusEnum("status").notNull().default("voting"),
  shoppingStartedAt: timestamp("shopping_started_at", { withTimezone: true }),
  shoppingStartedBy: uuid("shopping_started_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const aliParticipants = pgTable(
  "ali_participants",
  {
    aliEventId: uuid("ali_event_id")
      .notNull()
      .references(() => aliEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    optedIn: boolean("opted_in").notNull().default(true),
    respondedAt: timestamp("responded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.aliEventId, table.userId] }),
  ],
);

export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // How many units come in one store package (e.g. wraps = 8/pack), so the
  // generated shopping list can round vote counts up to packages to buy.
  packageSize: integer("package_size").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A member's standing ingredient preferences (e.g. "I always want chicken"),
// used to pre-fill their vote on a new ALI event rather than making them
// re-pick every time.
export const userIngredientDefaults = pgTable(
  "user_ingredient_defaults",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.ingredientId] })],
);

export const ingredientVotes = pgTable(
  "ingredient_votes",
  {
    aliEventId: uuid("ali_event_id")
      .notNull()
      .references(() => aliEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    // How many of this ingredient this person wants (not just a yes/no
    // vote), so the shopping list sums real quantities rather than voter
    // counts before rounding to packages.
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.aliEventId, table.userId, table.ingredientId],
    }),
  ],
);

// --- Shopping: shared checklist + scanned receipts --------------------------

// Ticked-off shopping list lines. Stored server-side (not localStorage) so
// two people shopping together see the same list, and it survives a reload
// in the middle of the supermarket.
export const shoppingChecks = pgTable(
  "shopping_checks",
  {
    aliEventId: uuid("ali_event_id")
      .notNull()
      .references(() => aliEvents.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    checkedBy: uuid("checked_by")
      .notNull()
      .references(() => users.id),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.aliEventId, table.ingredientId] })],
);

// A scanned supermarket receipt (Kassenbon). Only the extracted data is
// kept — the photo itself is never stored.
export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  aliEventId: uuid("ali_event_id").references(() => aliEvents.id, {
    onDelete: "set null",
  }),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  store: text("store"),
  purchaseDate: date("purchase_date"),
  totalCents: integer("total_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const receiptItems = pgTable("receipt_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptId: uuid("receipt_id")
    .notNull()
    .references(() => receipts.id, { onDelete: "cascade" }),
  // Exactly as printed, e.g. "GUT&GÜNSTIG SCHMAND 24%".
  rawName: text("raw_name").notNull(),
  // Readable name, e.g. "Schmand".
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  priceCents: integer("price_cents").notNull(),
  // Which ALI ingredient this line is, if any (null = something else, like
  // a deposit or napkins).
  ingredientId: uuid("ingredient_id").references(() => ingredients.id, {
    onDelete: "set null",
  }),
});

// No karma_entries table: the confirmed formula (weekly group cost / weekly
// meals = price per meal; spending is +karma, consuming a meal is -karma) is
// fully derivable at read time from ledger_entries (money spent) and
// ali_participants (meals consumed) — see lib/db/queries/karma.ts. Nothing
// to store, and no risk of it drifting from the source data.

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthToken = typeof authTokens.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
export type BalanceAdjustment = typeof balanceAdjustments.$inferSelect;
export type NewBalanceAdjustment = typeof balanceAdjustments.$inferInsert;
export type AliEvent = typeof aliEvents.$inferSelect;
export type NewAliEvent = typeof aliEvents.$inferInsert;
export type AliParticipant = typeof aliParticipants.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type ReceiptItem = typeof receiptItems.$inferSelect;
