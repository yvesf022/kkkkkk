"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const logout = useAuth((s) => s.logout);

  function handleLogout() {
    // 🔐 Only change auth state.
    // Redirect is handled by RequireAuth.
    logout();
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
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 22 }}>
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
          Orders, payments & settings
        </div>
      </div>

      {/* NAV */}
      <nav style={{ display: "grid", gap: 6 }}>
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              style={{
                padding: "11px 14px",
                borderRadius: 14,
                fontWeight: 800,
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
                transition: "background 0.15s ease",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 14,
            fontWeight: 900,
            fontSize: 14,
            background: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            cursor: "pointer",
          }}
        >
          Log out
        </button>

        <p
          style={{
            marginTop: 10,
            fontSize: 11,
            textAlign: "center",
            opacity: 0.5,
          }}
        >
          You can sign back in anytime
        </p>
      </div>
    </aside>
  );
}
