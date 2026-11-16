import { z } from "zod";
import { parseEuroInput } from "@/lib/money";

const euroAmount = z
  .string()
  .min(1, "Amount is required")
  .refine((val) => parseEuroInput(val) !== null, {
    message: "Enter an amount like 12,50",
  });

export const ledgerEntrySchema = z.object({
  entryType: z.enum(["contribution", "expense"]),
  amount: euroAmount,
  description: z.string().min(1, "Description is required").max(200),
  entryDate: z.iso.date(),
  onBehalfOfUserId: z.uuid().optional(),
  aliEventId: z.uuid().optional(),
});

export const adjustmentSchema = z.object({
  userId: z.uuid(),
  amount: euroAmount,
  reason: z.string().min(1, "Reason is required").max(200),
});

export const addMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email(),
  title: z.string().max(80).optional(),
});

export const profileSchema = z.object({
  title: z.string().max(80),
});
