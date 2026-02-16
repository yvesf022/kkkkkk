"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUI } from "@/components/layout/uiStore";
import { useCart } from "@/app/context/CartContext";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";

/* ---------------------------------
   Refined Basotho Hat Icon
---------------------------------- */

function BasothoHat() {
  return (
    <svg
      viewBox="0 0 64 64"
      width="20"
      height="20"
      style={{
        position: "absolute",
        top: "-16px",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {/* Hat body */}
      <path
        d="M8 42 Q32 10 56 42 Q32 34 8 42 Z"
        fill="#111"
      />
      {/* Blue stripe accent */}
      <rect
        x="20"
        y="34"
        width="24"
        height="4"
        fill="#0033a0"
      />
    </svg>
  );
}

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
  };

  if (onClick) return <button onClick={onClick} style={baseStyle}>{children}</button>;
  if (href) return <Link href={href} style={baseStyle}>{children}</Link>;
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
        {/* ================= LOGO ================= */}

        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            lineHeight: 1,
          }}
        >
          <span
            style={{
              fontSize: "clamp(22px,4vw,32px)",
              fontWeight: 900,
              letterSpacing: 1,
              color: "#0033a0",
              display: "inline-block",
            }}
          >
            Karab
            <span style={{ position: "relative", display: "inline-block" }}>
              o
              <BasothoHat />
            </span>
            ’s
          </span>

          <span
            style={{
              fontSize: "clamp(11px,3vw,14px)",
              fontWeight: 800,
              letterSpacing: 6,
              color: "#111",
              marginTop: 4,
            }}
          >
            STORE
          </span>
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
            <CapsuleLink onClick={goToLogin}>Login</CapsuleLink>
          )}

          {user && user.role === "user" && (
            <>
              <CapsuleLink onClick={goToAccount}>Account</CapsuleLink>
              <CapsuleLink onClick={handleLogout}>Logout</CapsuleLink>
            </>
          )}

          {user && user.role === "admin" && (
            <>
              <CapsuleLink href="/admin">Admin</CapsuleLink>
              <CapsuleLink onClick={handleLogout}>Logout</CapsuleLink>
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
