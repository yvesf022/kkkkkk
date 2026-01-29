"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/account" },
  { label: "My Orders", href: "/account/orders" },
  { label: "Profile", href: "/account/profile" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Payments", href: "/account/payments" },
  { label: "Security", href: "/account/security" },
];

export default function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        background: "#ffffff",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        padding: "32px 20px",
      }}
    >
      {/* TITLE */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>My Account</h3>
        <p style={{ fontSize: 13, opacity: 0.6 }}>
          Orders, payments & settings
        </p>
      </div>

      {/* NAV */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/account" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                textDecoration: "none",
                color: active ? "#111" : "#444",
                background: active
                  ? "rgba(0,0,0,0.05)"
                  : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
