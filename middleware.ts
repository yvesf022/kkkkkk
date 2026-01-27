import { NextRequest, NextResponse } from "next/server";

/**
 * Passive middleware
 * -------------------
 * Auth is handled ONLY in React layouts (app/account/layout.tsx).
 * Middleware is kept for future edge use but performs no auth logic.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

/**
 * Keep matcher narrow and explicit.
 * This ensures middleware does not interfere with public routes or APIs.
 */
export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
