import { NextRequest, NextResponse } from "next/server";

/**
 * SAFE AUTH MIDDLEWARE
 * --------------------
 * - Protects /account routes
 * - Blocks authenticated users from public auth pages
 * - Does NOT touch /store or /admin
 * - Does NOT read admin cookies
 * - Redirect-only logic (no side effects)
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const hasUserToken =
    request.cookies.get("access_token") !== undefined;

  /**
   * 🔒 BLOCK AUTH PAGES FOR LOGGED-IN USERS
   */
  if (
    hasUserToken &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/verify-email")
  ) {
    return NextResponse.redirect(
      new URL("/account", request.url)
    );
  }

  /**
   * 🔐 PROTECT /account ROUTES
   */
  if (pathname.startsWith("/account")) {
    if (!hasUserToken) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }
  }

  return NextResponse.next();
}

/**
 * Run middleware ONLY where needed
 */
export const config = {
  matcher: [
    "/account/:path*",
    "/login",
    "/register",
    "/verify-email",
  ],
};
