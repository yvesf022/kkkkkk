import { NextRequest, NextResponse } from "next/server";

/**
 * AUTH MIDDLEWARE
 * ----------------------
 * - Protects /account routes only
 * - Does NOT interfere with /login or other public routes
 * - Relies on cookie presence for authentication
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Safely read cookie
  const token = request.cookies.get("access_token")?.value;

  /**
   * 🔐 Protect /account routes
   */
  if (pathname.startsWith("/account")) {
    if (!token) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }
  }

  // ✅ Allow everything else
  return NextResponse.next();
}

/**
 * Run middleware ONLY where needed
 */
export const config = {
  matcher: ["/account/:path*"],
};
