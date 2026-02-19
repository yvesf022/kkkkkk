"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: "📊" },
      { label: "Analytics", href: "/admin/analytics", icon: "📈" },
    ],
  },
  {
    section: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: "🛍️" },
      { label: "Inventory", href: "/admin/inventory", icon: "📦" },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: "🧾" },
      { label: "Payments", href: "/admin/payments", icon: "💳" },
    ],
  },
  {
    section: "Users",
    items: [
      { label: "Customers", href: "/admin/users", icon: "👥" },
      { label: "Sessions", href: "/admin/sessions", icon: "🔐" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Stores", href: "/admin/stores", icon: "🏪" },
      { label: "Audit Logs", href: "/admin/logs", icon: "📋" },
      { label: "Bank Settings", href: "/admin/settings/bank", icon: "🏦" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(href);

  return (
    <>
      {/* ── Hamburger button (mobile only, shown via CSS) ── */}
      <button
        className="adminMenuBtn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle admin menu"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* ── Overlay (mobile only) ── */}
      <div
        className={`adminSidebarOverlay${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`adminSidebar${open ? " open" : ""}`}>
        {/* Logo */}
        <div
          style={{
            padding: "20px 24px",
            fontSize: 18,
            fontWeight: 700,
            color: "#0f172a",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "linear-gradient(135deg, #0033a0, #009543)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 900,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            K
          </div>
          Karabo Admin
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {NAV.map((group) => (
            <div key={group.section} style={{ marginBottom: 20 }}>
              <div
                style={{
                  padding: "0 20px 6px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {group.section}
              </div>

              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: isActive(item.href) ? "#0f172a" : "#475569",
                    background: isActive(item.href) ? "#f1f5f9" : "transparent",
                    textDecoration: "none",
                    borderLeft: isActive(item.href)
                      ? "3px solid #0f172a"
                      : "3px solid transparent",
                    transition: "all 0.15s ease",
                    minHeight: 44,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}