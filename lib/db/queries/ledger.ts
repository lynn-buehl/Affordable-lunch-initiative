import { desc, eq, sql, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  balanceAdjustments,
  ledgerEntries,
  users,
  type NewLedgerEntry,
} from "@/lib/db/schema";

export type MemberBalance = {
  userId: string;
  name: string;
  status: "invited" | "active" | "left";
  totalContributions: number;
  totalExpensesFronted: number;
  fairShare: number;
  computedBalance: number;
  adjustmentsTotal: number;
  finalBalance: number;
};

/**
 * Per-member balances. fairShare is an even split of all group expense
 * entries across currently-active members — a documented v1 simplification
 * (see plan): Phase 2 refines this to split only across a given ALI event's
 * opted-in participants once ledger_entries.ali_event_id is populated.
 */
export async function getMemberBalances(): Promise<MemberBalance[]> {
  const activeUsers = await db
    .select({ id: users.id, name: users.name, status: users.status })
    .from(users)
    .where(eq(users.status, "active"))
    .orderBy(users.name);

  if (activeUsers.length === 0) return [];

  const [{ totalGroupExpenses }] = await db
    .select({
      totalGroupExpenses: sql<number>`coalesce(sum(case when ${ledgerEntries.entryType} = 'expense' then ${ledgerEntries.amountCents} else 0 end), 0)`,
    })
    .from(ledgerEntries);

  const fairShare = Math.round(totalGroupExpenses / activeUsers.length);

  const ledgerSums = await db
    .select({
      userId: ledgerEntries.userId,
      contributions: sql<number>`coalesce(sum(case when ${ledgerEntries.entryType} = 'contribution' then ${ledgerEntries.amountCents} else 0 end), 0)`,
      expenses: sql<number>`coalesce(sum(case when ${ledgerEntries.entryType} = 'expense' then ${ledgerEntries.amountCents} else 0 end), 0)`,
    })
    .from(ledgerEntries)
    .groupBy(ledgerEntries.userId);

  const adjustmentSums = await db
    .select({
      userId: balanceAdjustments.userId,
      total: sum(balanceAdjustments.amountCents).mapWith(Number),
    })
    .from(balanceAdjustments)
    .groupBy(balanceAdjustments.userId);

  const ledgerByUser = new Map(ledgerSums.map((row) => [row.userId, row]));
  const adjustmentsByUser = new Map(
    adjustmentSums.map((row) => [row.userId, row.total ?? 0]),
  );

  return activeUsers.map((user) => {
    const ledger = ledgerByUser.get(user.id);
    const totalContributions = ledger?.contributions ?? 0;
    const totalExpensesFronted = ledger?.expenses ?? 0;
    const adjustmentsTotal = adjustmentsByUser.get(user.id) ?? 0;
    const computedBalance =
      totalContributions + totalExpensesFronted - fairShare;

    return {
      userId: user.id,
      name: user.name,
      status: user.status,
      totalContributions,
      totalExpensesFronted,
      fairShare,
      computedBalance,
      adjustmentsTotal,
      finalBalance: computedBalance + adjustmentsTotal,
    };
  });
}

export type LedgerEntryWithUser = {
  id: string;
  userId: string;
  userName: string;
  entryType: "contribution" | "expense";
  amountCents: number;
  description: string;
  entryDate: string;
  createdAt: Date;
};

export async function getRecentLedgerEntries(
  limit = 100,
): Promise<LedgerEntryWithUser[]> {
  const rows = await db
    .select({
      id: ledgerEntries.id,
      userId: ledgerEntries.userId,
      userName: users.name,
      entryType: ledgerEntries.entryType,
      amountCents: ledgerEntries.amountCents,
      description: ledgerEntries.description,
      entryDate: ledgerEntries.entryDate,
      createdAt: ledgerEntries.createdAt,
    })
    .from(ledgerEntries)
    .innerJoin(users, eq(ledgerEntries.userId, users.id))
    .orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.createdAt))
    .limit(limit);

  return rows;
}

export async function insertLedgerEntry(entry: NewLedgerEntry) {
  await db.insert(ledgerEntries).values(entry);
}

export async function getComputedBalanceForUser(
  userId: string,
): Promise<number> {
  const balances = await getMemberBalances();
  const match = balances.find((b) => b.userId === userId);
  return match?.computedBalance ?? 0;
}
