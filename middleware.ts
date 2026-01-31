import { NextRequest, NextResponse } from "next/server";

/**
 * USER AUTH MIDDLEWARE
 * ----------------------
 * - Protects /account routes ONLY
 * - Does NOT interfere with public routes
 * - Runs BEFORE React (server-side)
 * - Accepts valid user auth cookies
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 🔐 Check for user authentication cookies
  const hasUserAuthCookie =
    request.cookies.has("access_token") || // common FastAPI user cookie
    request.cookies.has("user_token") ||    // alternate naming
    request.cookies.has("auth_token");      // fallback naming

  /**
   * Protect /account routes
   */
  if (pathname.startsWith("/account")) {
    if (!hasUserAuthCookie) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }
  }

  // ✅ Allow request to continue
  return NextResponse.next();
}

/**
 * Run middleware ONLY on account routes
 */
export const config = {
  matcher: ["/account/:path*"],
};
