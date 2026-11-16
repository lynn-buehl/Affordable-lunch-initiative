import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerEntries, receiptItems, receipts, users } from "@/lib/db/schema";

export type NewReceiptItem = {
  rawName: string;
  name: string;
  quantity: number;
  priceCents: number;
  ingredientId: string | null;
};

/**
 * Saves a reviewed receipt and logs its total as an expense, in one
 * transaction — a receipt without its ledger entry (or the reverse) would
 * make karma and the receipt history disagree.
 */
export async function saveReceiptWithExpense(params: {
  userId: string;
  aliEventId: string | null;
  store: string | null;
  purchaseDate: string;
  totalCents: number;
  description: string;
  items: NewReceiptItem[];
}): Promise<string> {
  return db.transaction(async (tx) => {
    const [receipt] = await tx
      .insert(receipts)
      .values({
        aliEventId: params.aliEventId,
        uploadedBy: params.userId,
        store: params.store,
        purchaseDate: params.purchaseDate,
        totalCents: params.totalCents,
      })
      .returning({ id: receipts.id });

    if (params.items.length > 0) {
      await tx
        .insert(receiptItems)
        .values(params.items.map((item) => ({ ...item, receiptId: receipt.id })));
    }

    await tx.insert(ledgerEntries).values({
      userId: params.userId,
      entryType: "expense",
      amountCents: params.totalCents,
      description: params.description,
      entryDate: params.purchaseDate,
      aliEventId: params.aliEventId,
      createdBy: params.userId,
    });

    return receipt.id;
  });
}

export type ReceiptWithItems = {
  id: string;
  store: string | null;
  purchaseDate: string | null;
  totalCents: number;
  uploadedByName: string;
  items: { id: string; name: string; rawName: string; quantity: number; priceCents: number; matched: boolean }[];
};

export async function getReceiptsForEvent(eventId: string): Promise<ReceiptWithItems[]> {
  const rows = await db
    .select({ receipt: receipts, uploadedByName: users.name })
    .from(receipts)
    .innerJoin(users, eq(receipts.uploadedBy, users.id))
    .where(eq(receipts.aliEventId, eventId))
    .orderBy(desc(receipts.createdAt));

  return Promise.all(
    rows.map(async ({ receipt, uploadedByName }) => {
      const items = await db
        .select()
        .from(receiptItems)
        .where(eq(receiptItems.receiptId, receipt.id))
        .orderBy(receiptItems.name);
      return {
        id: receipt.id,
        store: receipt.store,
        purchaseDate: receipt.purchaseDate,
        totalCents: receipt.totalCents,
        uploadedByName,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          rawName: item.rawName,
          quantity: item.quantity,
          priceCents: item.priceCents,
          matched: item.ingredientId !== null,
        })),
      };
    }),
  );
}
