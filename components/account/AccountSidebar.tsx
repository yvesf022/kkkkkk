"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Item = {
  label: string;
  href: string;
};

const ITEMS: Item[] = [
  { label: "Dashboard", href: "/account" },
  { label: "My Orders", href: "/account/orders" },
  { label: "Profile", href: "/account/profile" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Payments", href: "/account/payments" },
  { label: "Security", href: "/account/security" },
];

export default function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuth((s) => s.logout);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside
      style={{
        width: 260,
        minHeight: "100%",
        background: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        padding: "24px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 18,
            color: "#0f172a",
          }}
        >
          My Account
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.6,
            marginTop: 2,
          }}
        >
          Manage your orders & profile
        </div>
      </div>

      {/* NAV */}
      <nav style={{ display: "grid", gap: 4 }}>
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                color: active
                  ? "#0f172a"
                  : "rgba(15,23,42,0.7)",
                background: active
                  ? "rgba(37,99,235,0.08)"
                  : "transparent",
                border: active
                  ? "1px solid rgba(37,99,235,0.25)"
                  : "1px solid transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div style={{ marginTop: "auto", paddingTop: 18 }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 14,
            background: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
