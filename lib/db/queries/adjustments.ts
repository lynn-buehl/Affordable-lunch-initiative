import { db } from "@/lib/db";
import { balanceAdjustments, type NewBalanceAdjustment } from "@/lib/db/schema";

export async function insertAdjustment(adjustment: NewBalanceAdjustment) {
  await db.insert(balanceAdjustments).values(adjustment);
}
