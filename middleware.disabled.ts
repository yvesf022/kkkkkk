import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware scope
 * ----------------
 * - Does NOT enforce admin auth (cross-domain cookies)
 * - Admin auth is enforced in app/admin/layout.tsx
 * - User auth remains enforced here (same-domain cookie)
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const userToken = req.cookies.get("access_token")?.value;

  /* =========================
     ADMIN ROUTES
     (ALLOW THROUGH)
  ========================= */

  if (pathname.startsWith("/admin")) {
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
