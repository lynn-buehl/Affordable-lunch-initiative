import { Resend } from "resend";

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

/**
 * The Resend SDK returns `{ data, error }` rather than throwing on API
 * failures (e.g. an invalid key or unverified sending domain), so a plain
 * `await emails.send(...)` silently "succeeds" even when nothing was sent.
 * This wrapper throws so callers' existing try/catch and error states work
 * as expected.
 */
export async function sendEmail(payload: Parameters<Resend["emails"]["send"]>[0]) {
  const { error } = await getResendClient().emails.send(payload);
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export function emailFrom(): string {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not set");
  }
  return process.env.EMAIL_FROM;
}

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}
