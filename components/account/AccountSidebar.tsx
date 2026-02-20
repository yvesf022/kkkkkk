"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

type Props = {
  isMobile?: boolean;
  onClose?: () => void;
};

const navItems = [
  { label: "Profile",   href: "/account/profile" },
  { label: "My Orders", href: "/account/orders" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Payments",  href: "/account/payments" },
  { label: "Security",  href: "/account/security" },
];

export default function AccountSidebar({ isMobile, onClose }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // FIX #3: logout() clears auth state, then router.replace("/store") redirects away.
  // Previously the sidebar had no logout button at all — the layout handled auth but
  // never gave the user a way to sign out, so they stayed stuck on /account.
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();      // calls authApi.logout() + clears Zustand user state
    } finally {
      setLoggingOut(false);
      router.replace("/store");   // always redirect even if API call failed
    }
  }

  return (
    <aside
      style={{
        width: 260,
        background: "#fff",
        borderRadius: 20,
        padding: "28px 20px",
        boxShadow: "0 20px 60px rgba(0,0,0,.08)",
        height: "fit-content",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {isMobile && (
        <button
          onClick={onClose}
          style={{ marginBottom: 14, padding: "6px 10px", borderRadius: 8, fontWeight: 800, background: "#f1f5f9", border: "none", cursor: "pointer" }}
        >
          ✕ Close
        </button>
      )}

      {/* User avatar + name */}
      {user && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "#0f172a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 18, marginBottom: 10,
          }}>
            {(user.full_name ?? user.email ?? "U")[0].toUpperCase()}
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            {user.full_name ?? "My Account"}
          </p>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </p>
        </div>
      )}

      {!user && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>My Account</h3>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>Orders, payments & settings</p>
        </>
      )}

      <nav style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                fontWeight: active ? 700 : 500,
                textDecoration: "none",
                background: active ? "rgba(0,0,0,.06)" : "transparent",
                color: "#111",
                fontSize: 14,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ borderTop: "1px solid #f1f5f9", marginBottom: 16 }} />

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #fecaca",
          background: "#fff",
          color: "#dc2626",
          fontWeight: 600,
          fontSize: 14,
          cursor: loggingOut ? "not-allowed" : "pointer",
          textAlign: "left",
          transition: "background .15s",
        }}
        onMouseEnter={e => { if (!loggingOut) e.currentTarget.style.background = "#fef2f2"; }}
        onMouseLeave={e => { if (!loggingOut) e.currentTarget.style.background = "#fff"; }}
      >
        {loggingOut ? "Signing out…" : "← Sign Out"}
      </button>
    </aside>
  );
}