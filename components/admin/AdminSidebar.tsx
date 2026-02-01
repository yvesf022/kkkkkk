"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";

export type AdminSidebarProps = {
  isMobile?: boolean;
  onClose?: () => void;
};

type Item = {
  label: string;
  href: string;
};

const PRIMARY: Item[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Payments", href: "/admin/payments" },
];

const CATALOG: Item[] = [
  { label: "Products", href: "/admin/products" },
];

export default function AdminSidebar({
  isMobile,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAdminAuth((s) => s.logout);

  async function handleLogout() {
    try {
      await logout(); // clears admin cookie
    } finally {
      onClose?.();
      router.replace("/admin/login");
    }
  }

  function renderItems(items: Item[]) {
    return items.map((item) => {
      const active =
        pathname === item.href ||
        pathname.startsWith(item.href + "/");

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            color: active ? "#ffffff" : "#cbd5f5",
            background: active
              ? "rgba(99,102,241,0.25)"
              : "transparent",
            border: active
              ? "1px solid rgba(99,102,241,0.4)"
              : "1px solid transparent",
          }}
        >
          {item.label}
        </Link>
      );
    });
  }

  return (
    <aside
      style={{
        width: 260,
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "22px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* MOBILE CLOSE */}
      {isMobile && (
        <button
          onClick={onClose}
          style={{
            alignSelf: "flex-end",
            padding: "6px 10px",
            borderRadius: 8,
            fontWeight: 800,
            background: "#1e293b",
            color: "#e5e7eb",
            border: "none",
            cursor: "pointer",
          }}
        >
          ✕ Close
        </button>
      )}

      {/* BRAND */}
      <div>
        <div
          style={{
            fontWeight: 900,
            fontSize: 18,
            color: "#ffffff",
          }}
        >
          Karabo Admin
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.65,
            marginTop: 2,
          }}
        >
          Store control center
        </div>
      </div>

      {/* PRIMARY NAV */}
      <nav style={{ display: "grid", gap: 6 }}>
        {renderItems(PRIMARY)}
      </nav>

      {/* DIVIDER */}
      <div
        style={{
          height: 1,
          background: "#1e293b",
          margin: "10px 0",
        }}
      />

      {/* CATALOG */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.5,
            opacity: 0.6,
            marginBottom: 8,
          }}
        >
          CATALOG
        </div>

        <nav style={{ display: "grid", gap: 6 }}>
          {renderItems(CATALOG)}
        </nav>
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: "auto" }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 14,
            background: "#1e293b",
            color: "#fca5a5",
            border: "1px solid #334155",
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
