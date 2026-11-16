import { randomBytes, createHash } from "node:crypto";

const TOKEN_BYTES = 32;
export const TOKEN_TTL_MS = {
  invite: 1000 * 60 * 60 * 24 * 7, // 7 days
  password_reset: 1000 * 60 * 60, // 1 hour
  email_change: 1000 * 60 * 60 * 24, // 24 hours
} as const;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
