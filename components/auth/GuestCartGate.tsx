"use client";

/**
 * GuestCartGate — Enterprise Edition
 * 
 * Handles the complete flow:
 * 1. Guest adds items to cart (stored in localStorage via Zustand persist)
 * 2. Guest tries to checkout → redirected to /login?redirect=/store/checkout
 * 3. After login/register → cart is PRESERVED (localStorage survives)
 * 4. CartSyncProvider merges guest cart with server cart on auth
 * 5. User lands back at checkout with full cart intact
 * 
 * Usage: Wrap checkout page with this component.
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useCart } from "@/lib/cart";

interface Props {
  children: React.ReactNode;
  /** Path to redirect to after login. Defaults to current path. */
  redirectPath?: string;
}

export default function GuestCartGate({ children, redirectPath }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<"checking" | "authed" | "guest">("checking");
  const cartItemCount = useCart(s => s.itemCount);

  useEffect(() => {
    authApi.me()
      .then(() => setAuthState("authed"))
      .catch(() => setAuthState("guest"));
  }, []);

  if (authState === "checking") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "60vh", fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none" style={{ animation: "spin .7s linear infinite", marginBottom: 8 }}>
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity=".2"/>
            <path d="M10 2a8 8 0 018 8" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p>Checking session…</p>
        </div>
      </div>
    );
  }

  if (authState === "guest") {
    const dest = redirectPath ?? pathname;
    return <GuestCheckoutPrompt itemCount={cartItemCount} redirectPath={dest} />;
  }

  return <>{children}</>;
}

/* ─── Guest Prompt UI ─── */
function GuestCheckoutPrompt({ itemCount, redirectPath }: { itemCount: number; redirectPath: string }) {
  const encodedRedirect = encodeURIComponent(redirectPath);
  const FF = "'DM Sans', -apple-system, sans-serif";
  const ACCENT = "#2563EB";

  return (
    <div style={{
      maxWidth: 480, margin: "60px auto", padding: "0 20px 60px",
      fontFamily: FF, textAlign: "center",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "#EFF6FF", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 32, margin: "0 auto 20px",
      }}>
        🛒
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", marginBottom: 8 }}>
        Almost there!
      </h1>
      <p style={{ fontSize: 15, color: "#64748B", lineHeight: 1.7, marginBottom: 8 }}>
        You have <strong style={{ color: "#0F172A" }}>{itemCount} item{itemCount !== 1 ? "s" : ""}</strong> in your cart.
        Sign in or create a free account to complete your order.
      </p>
      <p style={{ fontSize: 13, color: "#10B981", fontWeight: 600, marginBottom: 28 }}>
        ✓ Your cart will be saved — nothing will be lost.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link
          href={`/login?redirect=${encodedRedirect}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "14px 24px", borderRadius: 12,
            background: ACCENT, color: "#fff",
            textDecoration: "none", fontWeight: 700, fontSize: 15,
            boxShadow: "0 4px 16px rgba(37,99,235,.3)",
          }}
        >
          Sign In to Continue →
        </Link>
        <Link
          href={`/register?redirect=${encodedRedirect}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "14px 24px", borderRadius: 12,
            border: "1px solid #E2E8F0", background: "#fff",
            textDecoration: "none", fontWeight: 700, fontSize: 15, color: "#0F172A",
          }}
        >
          Create Free Account
        </Link>
        <Link
          href="/store"
          style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none", marginTop: 4 }}
        >
          ← Continue Shopping
        </Link>
      </div>

      <div style={{
        marginTop: 32, padding: "16px 20px",
        background: "#F8FAFC", borderRadius: 12,
        border: "1px solid #E2E8F0",
      }}>
        <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, lineHeight: 1.7 }}>
          🔒 Your cart is saved in this browser. Even if you close the tab and come back, your items will still be here. After signing in, your cart syncs automatically.
        </p>
      </div>
    </div>
  );
}