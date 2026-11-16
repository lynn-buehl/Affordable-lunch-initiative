import { signOut } from "@/lib/auth/config";

/**
 * Where the app sends someone whose session cookie is still valid but whose
 * account no longer is (marked as left, or deleted). Clears the cookie and
 * returns them to the login page; redirecting straight to /login would loop,
 * because the proxy sends anyone with a session cookie back into the app.
 */
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
