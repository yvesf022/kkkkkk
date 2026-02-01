"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUI } from "@/components/layout/uiStore";
import { useCart } from "@/app/context/CartContext";
import { useAuth } from "@/lib/auth";

/* ---------------------------------
   Helpers
---------------------------------- */

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;

  return (
    <span
      aria-label={`${n} items`}
      style={{
        position: "absolute",
        top: -10,
        right: -10,
        minWidth: 22,
        height: 22,
        padding: "0 7px",
        display: "grid",
        placeItems: "center",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        color: "#fff",
        background:
          "linear-gradient(180deg, rgba(10,16,30,0.98), rgba(4,8,18,0.98))",
        boxShadow:
          "0 10px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
        pointerEvents: "none",
      }}
    >
      {n}
    </span>
  );
}

function CapsuleLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        position: "relative",
        padding: "11px 16px",
        borderRadius: 999,
        fontWeight: 900,
        letterSpacing: 0.3,
        fontSize: 14,
        textDecoration: "none",
        color: "#f8fbff",
        background:
          "linear-gradient(180deg, rgba(8,14,28,.75), rgba(6,10,20,.75))",
        border: "1px solid rgba(255,255,255,.18)",
        boxShadow: "0 10px 26px rgba(0,0,0,.35)",
        backdropFilter: "blur(6px)",
      }}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------
   Header
---------------------------------- */

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // 🔒 NEVER render header in admin area
  if (pathname.startsWith("/admin")) return null;

  const { toggleSidebar } = useUI();
  const { items } = useCart();

  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const cartCount = items.reduce((a, b) => a + b.quantity, 0);
  const isStoreRoute = pathname.startsWith("/store");

  // ✅ FINAL, SAFE LOGOUT
  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="kyFixedHeader">
      <div className="kyHeaderGlass">
        <div style={{ padding: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            {/* LOGO */}
            <Link
              href="/store"
              aria-label="Go to shop"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 14,
                padding: "10px 18px",
                borderRadius: 18,
                background:
                  "linear-gradient(180deg, rgba(4,8,20,.85), rgba(4,8,16,.75))",
                border: "1px solid rgba(255,255,255,.14)",
                textDecoration: "none",
                lineHeight: 1,
                backdropFilter: "blur(10px)",
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 900, color: "#ff2fa0" }}>
                Karabo’s
              </span>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#00e6ff" }}>
                Boutique
              </span>
            </Link>

            {/* NAV */}
            <nav style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CapsuleLink href="/store">Shop</CapsuleLink>

              <div style={{ position: "relative" }}>
                <CapsuleLink href="/store/cart">Cart</CapsuleLink>
                <CountBadge n={cartCount} />
              </div>

              {!user && <CapsuleLink href="/login">Login</CapsuleLink>}

              {user && (
                <CapsuleLink href="/account/profile">
                  Hello, {user.full_name || user.email}
                </CapsuleLink>
              )}

              {user && (
                <button
                  onClick={handleLogout}
                  style={{
                    padding: "11px 16px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(180deg, rgba(120,0,30,.6), rgba(80,0,20,.6))",
                    border: "1px solid rgba(255,255,255,.18)",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              )}

              {/* Mobile menu — STORE ONLY */}
              {isStoreRoute && (
                <button
                  onClick={toggleSidebar}
                  aria-label="Open menu"
                  style={{
                    fontSize: 20,
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: "transparent",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ☰
                </button>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
