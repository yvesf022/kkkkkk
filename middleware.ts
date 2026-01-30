import { NextRequest, NextResponse } from "next/server";

/**
 * Authoritative auth middleware
 * -----------------------------
 * - Enforces ADMIN isolation
 * - Enforces USER isolation
 * - Runs BEFORE React renders
 * - No role mixing, no leaks
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const userToken = req.cookies.get("access_token")?.value;
  const adminToken = req.cookies.get("admin_access_token")?.value;

  /* =========================
     ADMIN ROUTES
  ========================= */

  // Allow admin login page ALWAYS
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Any other /admin route requires admin cookie
  if (pathname.startsWith("/admin")) {
    if (!adminToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  /* =========================
     USER ACCOUNT ROUTES
  ========================= */

  if (pathname.startsWith("/account")) {
    if (!userToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * Explicit matcher
 * ----------------
 * Keep scope tight and predictable
 */
export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
