"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/rbac";
import { getActiveIngredients } from "@/lib/db/queries/ingredients";
import { getAliEvent, completeEvent } from "@/lib/db/queries/ali-events";
import { saveReceiptWithExpense } from "@/lib/db/queries/receipts";
import { extractReceipt, ReceiptScanError, type ExtractedReceipt } from "@/lib/receipts/extract";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ScanResult =
  | { ok: true; receipt: ExtractedReceipt }
  | { ok: false; error: string };

export async function scanReceiptAction(formData: FormData): Promise<ScanResult> {
  await requireUser();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo of the receipt first." };
  }
  const mediaType = ALLOWED_TYPES.find((t) => t === file.type);
  if (!mediaType) {
    return { ok: false, error: "That file isn't a photo. Use a JPEG or PNG." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "That photo is too large. Try again with a smaller one." };
  }

  const ingredients = await getActiveIngredients();
  try {
    const receipt = await extractReceipt({
      imageBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      mediaType,
      ingredients: ingredients.map((i) => ({ id: i.id, name: i.name })),
    });
    if (!receipt.isReceipt || receipt.items.length === 0) {
      return {
        ok: false,
        error: "That doesn't look like a readable receipt. Try a sharper photo of the whole thing.",
      };
    }
    return { ok: true, receipt };
  } catch (error) {
    if (error instanceof ReceiptScanError) return { ok: false, error: error.message };
    console.error("Receipt scan failed:", error);
    return { ok: false, error: "Something went wrong reading the receipt. Try again." };
  }
}

const saveSchema = z.object({
  aliEventId: z.uuid().nullable(),
  store: z.string().max(100).nullable(),
  purchaseDate: z.iso.date(),
  totalCents: z.number().int().positive("The total must be more than zero").max(1_000_000),
  description: z.string().min(1, "Description is required").max(200),
  markCompleted: z.boolean(),
  items: z
    .array(
      z.object({
        rawName: z.string().max(200),
        name: z.string().min(1).max(200),
        quantity: z.number().int().min(1).max(999),
        priceCents: z.number().int().min(-1_000_000).max(1_000_000),
        ingredientId: z.uuid().nullable(),
      }),
    )
    .max(200),
});

export type SaveReceiptInput = z.infer<typeof saveSchema>;

export async function saveReceiptAction(
  input: SaveReceiptInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid receipt" };
  }
  const data = parsed.data;

  let canComplete = false;
  if (data.aliEventId) {
    const event = await getAliEvent(data.aliEventId);
    if (!event) return { ok: false, error: "That ALI no longer exists." };
    canComplete =
      event.status === "shopping" && (user.role === "admin" || event.organizerId === user.id);
  }

  await saveReceiptWithExpense({
    userId: user.id,
    aliEventId: data.aliEventId,
    store: data.store,
    purchaseDate: data.purchaseDate,
    totalCents: data.totalCents,
    description: data.description,
    items: data.items,
  });

  if (data.aliEventId && data.markCompleted && canComplete) {
    await completeEvent(data.aliEventId);
  }

  return { ok: true };
}
