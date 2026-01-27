import { NextRequest, NextResponse } from "next/server";

/**
 * Decode JWT payload without verifying signature.
 * Safe for middleware routing decisions.
 */
function getJwtPayload(token: string): any | null {
  try {
    const base64Payload = token.split(".")[1];
    const decoded = Buffer.from(base64Payload, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("access_token")?.value;

  // Public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Not logged in → redirect
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = getJwtPayload(token);

  if (!payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = payload.role;

  // 🔐 Admin-only protection
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/account", req.url));
  }

  // Authenticated user routes
  if (pathname.startsWith("/account")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * Apply middleware only where needed
 */
export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
