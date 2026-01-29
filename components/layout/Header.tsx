"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/layout/uiStore";
import { useStore } from "@/lib/store";
import { useCart } from "@/app/context/CartContext";
import { useAuth } from "@/lib/auth";

/* ---------------------------------
   Helpers
---------------------------------- */

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;

  return (
    <span
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
        background: "rgba(0,0,0,.85)",
      }}
    >
      {n}
    </span>
  );
}

export default function Header() {
  const router = useRouter();
  const { toggleSidebar } = useUI();
  const { items } = useCart();
  const wishlistCount = useStore((s) => s.wishlist.length);

  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const cartCount = items.reduce((a, b) => a + b.quantity, 0);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="kyFixedHeader">
      <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/store">Shop</Link>

        <Link href="/wishlist">
          Wishlist <CountBadge n={wishlistCount} />
        </Link>

        <Link href="/cart">
          Cart <CountBadge n={cartCount} />
        </Link>

        {!user && <Link href="/login">Login</Link>}

        {user && (
          <>
            <span style={{ fontWeight: 700 }}>
              Hello, {user.name}
            </span>

            <Link href="/account">Account</Link>

            <button onClick={handleLogout}>Logout</button>
          </>
        )}

        <button onClick={toggleSidebar}>☰</button>
      </nav>
    </header>
  );
}
