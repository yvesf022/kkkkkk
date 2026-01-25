"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUI } from "@/components/layout/uiStore";
import { useStore } from "@/lib/store"; // ✅ wishlist ONLY
import { useCart } from "@/app/context/CartContext"; // ✅ cart ONLY

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
        fontWeight: 1100,
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
      className="kyCapsule"
      style={{
        position: "relative",
        padding: "11px 16px",
        borderRadius: 999,
        fontWeight: 1100,
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
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar } = useUI();

  // ✅ CORRECT STATE SOURCES
  const { items } = useCart();
  const cartCount = items.reduce((a, b) => a + b.quantity, 0);

  const wishlistCount = useStore((s) => s.wishlist.length);

  // 🔐 AUTH STATE
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="kyFixedHeader">
      <div className="kyHeaderGlass">
        <div className="container" style={{ padding: "18px 18px" }}>
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
              href="/"
              aria-label="Karabo’s Boutique"
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
              <span
                style={{
                  fontSize: 42,
                  fontWeight: 1400,
                  color: "#ff2fa0",
                }}
              >
                Karabo’s
              </span>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 1200,
                  color: "#00e6ff",
                }}
              >
                Boutique
              </span>
            </Link>

            {/* NAV */}
            <nav style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CapsuleLink href="/store">Shop</CapsuleLink>

              <div style={{ position: "relative" }}>
                <CapsuleLink href="/wishlist">Wishlist</CapsuleLink>
                <CountBadge n={wishlistCount} />
              </div>

              <Link
                href="/cart"
                className="kyCapsule"
                style={{
                  position: "relative",
                  padding: "11px 16px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(180deg, rgba(8,14,28,.75), rgba(6,10,20,.75))",
                  border: "1px solid rgba(255,255,255,.18)",
                  color: "#fff",
                  fontWeight: 1100,
                }}
              >
                Cart
                <CountBadge n={cartCount} />
              </Link>

              {/* 🔐 AUTH */}
              {!token && <CapsuleLink href="/login">Login</CapsuleLink>}

              {token && <CapsuleLink href="/account">Account</CapsuleLink>}

              {token && (
                <button
                  onClick={logout}
                  className="kyCapsule"
                  style={{
                    padding: "11px 16px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(180deg, rgba(120,0,30,.6), rgba(80,0,20,.6))",
                    border: "1px solid rgba(255,255,255,.18)",
                    color: "#fff",
                    fontWeight: 1100,
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              )}

              <button
                onClick={toggleSidebar}
                className="kyBurger"
                aria-label="Open menu"
              >
                ☰
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
