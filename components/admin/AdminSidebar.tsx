"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";

type Item = {
  label: string;
  href: string;
};

const ITEMS: Item[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Payment Settings", href: "/admin/payment-settings" },
  { label: "Products", href: "/admin/products" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = useAdminAuth((s) => s.logout);

  function handleLogout() {
    logout();
    router.replace("/admin/login");
  }

  return (
    <aside
      style={{
        width: 260,
        minHeight: "100%",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "24px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 18,
            color: "#ffffff",
          }}
        >
          Admin Panel
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            marginTop: 2,
          }}
        >
          Manage orders & store
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
