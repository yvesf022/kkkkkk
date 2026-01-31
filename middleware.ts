import { NextRequest, NextResponse } from "next/server";

/**
 * SAFE AUTH MIDDLEWARE
 * --------------------
 * - Protects /account routes only
 * - Does NOT touch /store or /admin
 * - Does NOT read admin cookies
 * - Redirect-only logic (no side effects)
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only protect /account routes
  if (!pathname.startsWith("/account")) {
    return NextResponse.next();
  }

  const hasUserToken =
    request.cookies.get("access_token") !== undefined;

  // Not logged in → redirect to login
  if (!hasUserToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Run middleware ONLY on /account routes
 */
export const config = {
  matcher: ["/account/:path*"],
};
