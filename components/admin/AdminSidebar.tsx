"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";

export type AdminSidebarProps = {
  isMobile?: boolean;
  onClose?: () => void;
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Products", href: "/admin/products", icon: "📦" },
  { label: "Orders", href: "/admin/orders", icon: "🛒" },
  { label: "Payments", href: "/admin/payments", icon: "💳" },
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
      await logout();
    } finally {
      onClose?.();
      router.replace("/admin/login");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 24,
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        gap: 24,
      }}
    >
      {/* BRAND */}
      <div style={{ paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#ffffff",
            marginBottom: 4,
          }}
        >
          Karabo Admin
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
          Store Control Center
        </p>
      </div>

      {/* NAVIGATION */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                transition: "all 0.2s ease",
                background: active
                  ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                  : "transparent",
                color: active ? "#ffffff" : "rgba(255,255,255,0.7)",
                border: active
                  ? "1px solid rgba(255,255,255,0.2)"
                  : "1px solid transparent",
                boxShadow: active
                  ? "0 8px 20px rgba(99,102,241,0.4)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                }
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* SPACER */}
      <div style={{ flex: 1 }} />

      {/* LOGOUT */}
      <button
        onClick={handleLogout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          background: "rgba(239,68,68,0.15)",
          color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.3)",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(239,68,68,0.25)";
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(239,68,68,0.15)";
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
        }}
      >
        <span style={{ fontSize: 20 }}>🚪</span>
        Log Out
      </button>

      {/* MOBILE CLOSE */}
      {isMobile && (
        <button
          onClick={onClose}
          style={{
            padding: "12px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          Close Menu
        </button>
      )}
    </div>
  );
}
