import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";

const PUBLIC_PATHS = [
  "/login",
  "/accept-invite",
  "/reset-password",
  "/forgot-password",
  "/confirm-email",
];

/**
 * Fast, non-authoritative gate for UX (redirects) only. The JWT claims used
 * here are not re-verified against the database — every admin-gated Server
 * Action independently re-checks role via requireAdmin() (see
 * lib/auth/rbac.ts), which is the real authorization boundary.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Must run for people who still have a session cookie (see the route).
  if (pathname === "/signed-out") return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const session = await auth();

  if (!session?.user) {
    if (isPublic) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
