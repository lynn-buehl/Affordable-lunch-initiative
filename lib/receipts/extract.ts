import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * Reads a photo of a (German) supermarket receipt with Claude's vision and
 * returns the purchased lines as structured data, each matched to one of the
 * group's known ALI ingredients where it clearly is one.
 *
 * The photo is sent to the Anthropic API for this one request and is not
 * stored by this app.
 */

const receiptSchema = z.object({
  isReceipt: z.boolean().describe("False if the image is not a readable shopping receipt."),
  store: z.string().nullable().describe("Shop name, e.g. 'REWE', 'Lidl', 'Aldi Süd'."),
  purchaseDate: z.string().nullable().describe("Date of purchase as YYYY-MM-DD, or null if not printed."),
  totalCents: z
    .number()
    .int()
    .nullable()
    .describe("The amount actually paid (SUMME / ZU ZAHLEN), in euro cents."),
  items: z.array(
    z.object({
      rawName: z.string().describe("The line exactly as printed on the receipt."),
      name: z
        .string()
        .describe("Short readable German product name with abbreviations spelled out, e.g. 'Schmand', 'Kidneybohnen'."),
      quantity: z.number().int().describe("Number of packages bought on this line (1 if not stated)."),
      priceCents: z
        .number()
        .int()
        .describe("Total for the line in euro cents. Negative for discounts and returned deposit."),
      ingredientId: z
        .string()
        .nullable()
        .describe("id of the matching known ingredient, or null if none matches."),
    }),
  ),
});

export type ExtractedReceipt = z.infer<typeof receiptSchema>;

export type KnownIngredient = { id: string; name: string };

const SYSTEM_PROMPT = `You read photos of German supermarket receipts (Kassenbons) for a group that shops together for a shared lunch, and turn them into structured data.

How German receipts work:
- Product lines are heavily abbreviated and often upper-case ("GG SCHMAND 24%", "HÄHN.BRUSTFIL.", "BIO AVOCADO VORGER."). Spell the product out in the readable name.
- Prices use a decimal comma ("1,29"). The letter after a price (A, B) is the VAT class, not part of the price.
- A quantity is often printed on its own line above or below the product ("2 x 0,99" or "2 Stk x 0,99"). Fold it into the product line: quantity 2, price = the line total.
- Weighed goods print a weight line ("0,486 kg x 2,99 EUR/kg"). That is one item with quantity 1.
- "Pfand" (deposit) lines, "Leergut" (returned deposit, negative), and discount lines ("Rabatt", "Coupon", "Aktion", negative) are real lines that change the total: include each as its own item so the items add up to the total.
- Everything from the total downwards is not a product: SUMME, payment method (EC, Girocard, Bar, Rückgeld), the VAT table (MwSt, Netto, Brutto), loyalty points (Payback, DeutschlandCard), and TSE/signature blocks. Never output those as items.
- The total is the amount actually paid, labelled SUMME, ZU ZAHLEN, or Gesamtbetrag.

Matching to known ingredients:
You are given the group's ingredient list with ids. Set ingredientId when a line is clearly that ingredient, across languages and brand names (the list may be in English or German: "Schmand" is "sour cream", "Kidneybohnen" is "kidney beans", "Mais" is "corn"). If two lines are the same ingredient, match both. If nothing on the list fits, or you would be guessing, use null. Deposits and discounts are always null.

If part of the receipt is cut off, folded or unreadable, extract what you can read and do not invent lines. If the image is not a receipt at all, set isReceipt to false and return no items.`;

export class ReceiptScanError extends Error {}

export function isReceiptScanningConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function extractReceipt(params: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  ingredients: KnownIngredient[];
}): Promise<ExtractedReceipt> {
  if (!isReceiptScanningConfigured()) {
    throw new ReceiptScanError(
      "Receipt scanning isn't set up yet: the ANTHROPIC_API_KEY environment variable is missing.",
    );
  }

  const client = new Anthropic();
  const ingredientList =
    params.ingredients.length > 0
      ? params.ingredients.map((i) => `${i.id}\t${i.name}`).join("\n")
      : "(none yet)";

  let response;
  try {
    response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // Reading a receipt is transcription, not deep reasoning; low effort
      // keeps the wait short for someone standing at the checkout.
      output_config: { effort: "low", format: zodOutputFormat(receiptSchema) },
      // If the primary model declines a request, let the API retry it on its
      // default fallback instead of failing the scan.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: params.mediaType, data: params.imageBase64 },
            },
            {
              type: "text",
              text: `Known ingredients (id, then name):\n${ingredientList}\n\nExtract this receipt.`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ReceiptScanError("Receipt scanning is misconfigured: the Anthropic API key was rejected.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ReceiptScanError("The receipt reader is busy right now. Try again in a minute.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Receipt extraction failed:", error.status, error.message);
      throw new ReceiptScanError("Couldn't read the receipt. Try again, or enter the amount by hand.");
    }
    throw error;
  }

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new ReceiptScanError("Couldn't read that photo. Try a sharper, well-lit picture of the whole receipt.");
  }

  const known = new Set(params.ingredients.map((i) => i.id));
  const parsed = response.parsed_output;
  return {
    ...parsed,
    purchaseDate:
      parsed.purchaseDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.purchaseDate)
        ? parsed.purchaseDate
        : null,
    // Never trust an id the model produced unless it's one we handed it.
    items: parsed.items.map((item) => ({
      ...item,
      quantity: Math.max(1, item.quantity),
      ingredientId: item.ingredientId && known.has(item.ingredientId) ? item.ingredientId : null,
    })),
  };
}
