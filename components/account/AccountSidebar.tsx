"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Profile", href: "/account/profile" },
  { label: "My Orders", href: "/account/orders" },
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
        background: "#fff",
        borderRadius: 20,
        padding: "28px 20px",
        boxShadow: "0 20px 60px rgba(0,0,0,.08)",
        height: "fit-content",
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
        My Account
      </h3>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>
        Orders, payments & settings
      </p>

      <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                fontWeight: active ? 700 : 500,
                textDecoration: "none",
                background: active
                  ? "rgba(0,0,0,.06)"
                  : "transparent",
                color: "#111",
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
