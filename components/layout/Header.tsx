"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUI } from "@/components/layout/uiStore";
import { useCart } from "@/app/context/CartContext";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";

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
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const baseStyle: React.CSSProperties = {
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
    cursor: "pointer",
  };

  if (onClick) {
    return (
      <button onClick={onClick} style={baseStyle}>
        {children}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} style={baseStyle}>
        {children}
      </Link>
    );
  }

  return null;
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

  const shouldShowMenu =
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/register") &&
    !pathname.startsWith("/verify-email");

  /* ============ ROLE-BASED NAVIGATION ============ */

  React.useEffect(() => {
    if (!user) return;

    if (user.role === "admin" && !pathname.startsWith("/admin")) {
      toast.error("Admin accounts cannot access user pages");
      router.replace("/admin");
    }
  }, [user, pathname, router]);

  /* ============ LOGOUT ============ */
  async function handleLogout() {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.replace("/login");
      router.refresh();
    } catch (err) {
      toast.error("Logout failed");
    }
  }

  /* ============ GO TO ACCOUNT ============ */
  function goToAccount() {
    if (!user) {
      toast.error("Please log in first");
      router.push("/login");
      return;
    }

    if (user.role === "admin") {
      toast.error("Admin accounts should use /admin");
      router.push("/admin");
      return;
    }

    router.push("/account");
  }

  /* ============ GO TO CART ============ */
  function goToCart() {
    router.push("/store/cart");
  }

  /* ============ GO TO LOGIN ============ */
  function goToLogin() {
    router.push("/login");
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
            {/* LOGO – NOW LINKS TO HOME */}
            <Link
              href="/"
              aria-label="Go to home"
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
                  fontSize: 36,
                  fontWeight: 900,
                  color: "#ff2fa0",
                }}
              >
                Karabo's
              </span>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#00e6ff",
                }}
              >
                Boutique
              </span>
            </Link>

            {/* NAV */}
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <CapsuleLink href="/store">Shop</CapsuleLink>

              <div style={{ position: "relative" }}>
                <CapsuleLink onClick={goToCart}>Cart</CapsuleLink>
                <CountBadge n={cartCount} />
              </div>

              {!user && (
                <CapsuleLink onClick={goToLogin}>
                  Login
                </CapsuleLink>
              )}

              {user && user.role === "user" && (
                <>
                  <CapsuleLink onClick={goToAccount}>
                    Hello,{" "}
                    {user.full_name ||
                      user.email.split("@")[0]}
                  </CapsuleLink>

                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "11px 16px",
                      borderRadius: 999,
                      background:
                        "linear-gradient(180deg, rgba(120,0,30,.6), rgba(80,0,20,.6))",
                      border:
                        "1px solid rgba(255,255,255,.18)",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                      fontSize: 14,
                      letterSpacing: 0.3,
                    }}
                  >
                    Logout
                  </button>
                </>
              )}

              {user && user.role === "admin" && (
                <>
                  <CapsuleLink href="/admin">
                    Admin Panel
                  </CapsuleLink>

                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "11px 16px",
                      borderRadius: 999,
                      background:
                        "linear-gradient(180deg, rgba(120,0,30,.6), rgba(80,0,20,.6))",
                      border:
                        "1px solid rgba(255,255,255,.18)",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                      fontSize: 14,
                      letterSpacing: 0.3,
                    }}
                  >
                    Logout
                  </button>
                </>
              )}

              {shouldShowMenu && (
                <button
                  onClick={toggleSidebar}
                  aria-label="Toggle menu"
                  style={{
                    fontSize: 20,
                    padding: "8px 12px",
                    borderRadius: 12,
                    background:
                      "linear-gradient(180deg, rgba(8,14,28,.75), rgba(6,10,20,.75))",
                    border:
                      "1px solid rgba(255,255,255,.18)",
                    color: "#fff",
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
