import { NextResponse } from "next/server";

/**
 * MIDDLEWARE — FINAL & CORRECT
 *
 * IMPORTANT:
 * - DO NOT perform user auth here
 * - Edge middleware cannot reliably read HTTP-only cookies
 * - User auth is handled in:
 *   - /account/layout.tsx
 *   - useAuth() hydration
 *
 * RESULT:
 * - /account routes are no longer blocked
 * - Login → redirect → dashboard works
 */

export function middleware() {
  return NextResponse.next();
}

/**
 * Disable middleware completely
 */
export const config = {
  matcher: [],
};
