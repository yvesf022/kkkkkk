import { NextRequest, NextResponse } from "next/server";

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect these paths
  const isAccountRoute = pathname.startsWith("/account");
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isAccountRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get("access_token")?.value;

  // Not logged in
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = decodeJwtPayload(token);

  // Invalid token
  if (!payload || !payload.role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only protection
  if (isAdminRoute && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/account", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
