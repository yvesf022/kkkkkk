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
    // Redirect is handled by the account layout guard.
    logout();
  }

  return (
    <aside
      className="accountSidebar"
      style={{
        minWidth: 220,
        maxWidth: 260,
        width: "100%",
        background: "#ffffff",
        borderRight: "1px solid var(--border)",
        padding: "24px 18px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 22 }}>
        <div className="sectionTitle">My Account</div>
        <div className="mutedText">
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
              className={`accountNavItem ${
                active ? "active" : ""
              }`}
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
          className="btn btnDanger"
          style={{ width: "100%" }}
        >
          Log out
        </button>

        <p className="mutedText" style={{ textAlign: "center" }}>
          You can sign back in anytime
        </p>
      </div>
    </aside>
  );
}
