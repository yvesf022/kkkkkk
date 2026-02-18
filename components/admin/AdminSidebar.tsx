"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    section: "Catalog",
    items: [
      { label: "Products", href: "/admin/products" },
      { label: "Inventory", href: "/admin/inventory" },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders" },
      { label: "Payments", href: "/admin/payments" },
    ],
  },
  {
    section: "Users",
    items: [
      { label: "Customers", href: "/admin/users" },
      { label: "Sessions", href: "/admin/sessions" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Stores", href: "/admin/stores" },
      { label: "Audit Logs", href: "/admin/logs" },
      { label: "Bank Settings", href: "/admin/settings/bank" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(href);

  return (
    <aside
      style={{
        width: 260,
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        padding: "24px 0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "0 24px 24px",
          fontSize: 20,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        Karabo Admin
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {NAV.map((group) => (
          <div key={group.section} style={{ marginBottom: 24 }}>
            <div
              style={{
                padding: "0 24px 8px",
                fontSize: 12,
                fontWeight: 600,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {group.section}
            </div>

            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive(item.href)
                    ? "#0f172a"
                    : "#475569",
                  background: isActive(item.href)
                    ? "#f1f5f9"
                    : "transparent",
                  textDecoration: "none",
                  borderLeft: isActive(item.href)
                    ? "3px solid #0f172a"
                    : "3px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
