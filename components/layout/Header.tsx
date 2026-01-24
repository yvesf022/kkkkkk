"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "@/components/layout/uiStore";
import { useStore } from "@/lib/store";

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

/** 🔥 Premium futuristic capsule */
function CapsuleLink({
  href,
  children,
  activeGlow = false,
}: {
  href: string;
  children: React.ReactNode;
  activeGlow?: boolean;
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
        background: activeGlow
          ? "linear-gradient(180deg, rgba(255,34,140,.22), rgba(0,200,255,.10))"
          : "linear-gradient(180deg, rgba(8,14,28,.75), rgba(6,10,20,.75))",
        border: "1px solid rgba(255,255,255,.18)",
        boxShadow: activeGlow
          ? "0 0 22px rgba(255,34,140,.45), 0 0 30px rgba(0,200,255,.25)"
          : "0 10px 26px rgba(0,0,0,.35)",
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
  const { toggleSidebar } = useUI();

  const cartCount = useStore((s) =>
    s.cart.reduce((a, b) => a + b.qty, 0)
  );
  const wishlistCount = useStore((s) => s.wishlist.length);

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
            {/* LEFT */}
            <div style={{ display: "flex", alignItems: "center" }}>
              {/* 🔥 MAX-SIZE LOGO WITH CLARITY */}
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
                    fontSize: 42, // 🚀 MAX size
                    fontWeight: 1400,
                    letterSpacing: 1.4,
                    color: "#ff2fa0",
                    textShadow:
                      "0 0 10px rgba(255,47,160,.95), 0 0 22px rgba(255,47,160,.75)",
                  }}
                >
                  Karabo’s
                </span>

                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 1200,
                    letterSpacing: 1.2,
                    color: "#00e6ff",
                    textShadow:
                      "0 0 8px rgba(0,230,255,.95), 0 0 20px rgba(0,230,255,.75)",
                  }}
                >
                  Boutique
                </span>
              </Link>
            </div>

            {/* NAV */}
            <nav
              aria-label="Primary"
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <CapsuleLink
                href="/store"
                activeGlow={pathname === "/store"}
              >
                Shop
              </CapsuleLink>

              <div style={{ position: "relative" }}>
                <CapsuleLink href="/wishlist">
                  Wishlist
                </CapsuleLink>
                <CountBadge n={wishlistCount} />
              </div>

              <Link
                href="/cart"
                className="kyCapsule"
                aria-label="Cart"
                style={{
                  position: "relative",
                  padding: "11px 16px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(180deg, rgba(8,14,28,.75), rgba(6,10,20,.75))",
                  border: "1px solid rgba(255,255,255,.18)",
                  color: "#fff",
                  fontWeight: 1100,
                  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
                }}
              >
                Cart
                <CountBadge n={cartCount} />
              </Link>

              <button
                onClick={toggleSidebar}
                className="kyBurger"
                aria-label="Open menu"
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  fontSize: 18,
                  background:
                    "linear-gradient(180deg, rgba(8,14,28,.75), rgba(6,10,20,.75))",
                  border: "1px solid rgba(255,255,255,.18)",
                  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
                }}
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
