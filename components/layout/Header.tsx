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
      style={{
        position: "absolute",
        top: -6,
        right: -6,
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        display: "grid",
        placeItems: "center",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 900,
        color: "#fff",
        background: "#111",
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
    padding: "9px 14px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 13,
    textDecoration: "none",
    color: "#fff",
    background: "rgba(0,0,0,0.65)",
    border: "1px solid rgba(255,255,255,.15)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "0.2s ease",
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

  /* Role guard */
  React.useEffect(() => {
    if (!user) return;

    if (user.role === "admin" && !pathname.startsWith("/admin")) {
      toast.error("Admin accounts cannot access user pages");
      router.replace("/admin");
    }
  }, [user, pathname, router]);

  async function handleLogout() {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Logout failed");
    }
  }

  function goToAccount() {
    if (!user) return router.push("/login");
    if (user.role === "admin") return router.push("/admin");
    router.push("/account");
  }

  function goToCart() {
    router.push("/store/cart");
  }

  function goToLogin() {
    router.push("/login");
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 2000,
        padding: "12px 16px",
        background:
          "linear-gradient(90deg,#0033a0 0%,#ffffff 50%,#009543 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
 {/* ================= LUXURY BRAND LOGO ================= */}

        <Link
          href="/"
          style={{
            textDecoration: "none",
            position: "relative",
            padding: "12px 24px",
            background: "rgba(255,255,255,0.98)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            border: "2px solid transparent",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.98), rgba(255,255,255,0.98)), linear-gradient(135deg, #0033a0, #009543)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
          }}
        >
          {/* Karabo's Store - Unified Logo */}
          <div
            style={{
              fontSize: "clamp(24px, 4.5vw, 36px)",
              fontWeight: 900,
              letterSpacing: 1.5,
              background: "linear-gradient(135deg, #0033a0 0%, #006b3d 50%, #009543 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 4px 20px rgba(0,51,160,0.15)",
              lineHeight: 1,
              position: "relative",
            }}
          >
            Karabo's Store
          </div>

          {/* Elegant underline accent */}
          <div
            style={{
              marginTop: 8,
              height: 3,
              width: "100%",
              borderRadius: 3,
              background: "linear-gradient(90deg, #0033a0 0%, #009543 100%)",
              opacity: 0.8,
            }}
          />
        </Link>

        {/* ================= NAVIGATION ================= */}

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
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
                Account
              </CapsuleLink>
              <CapsuleLink onClick={handleLogout}>
                Logout
              </CapsuleLink>
            </>
          )}

          {user && user.role === "admin" && (
            <>
              <CapsuleLink href="/admin">
                Admin
              </CapsuleLink>
              <CapsuleLink onClick={handleLogout}>
                Logout
              </CapsuleLink>
            </>
          )}

          {shouldShowMenu && (
            <button
              onClick={toggleSidebar}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                background: "#111",
                color: "#fff",
                border: "none",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              ☰
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
