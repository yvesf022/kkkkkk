"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AccountDashboardPage() {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const initialized = useAuth((s) => s.initialized);

  // 🔐 Redirect ONLY after auth is fully initialized
  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.replace("/login");
    }
  }, [initialized, user, router]);

  // ⏳ Loading state during hydration
  if (!initialized) {
    return (
      <div style={{ padding: 40, fontWeight: 700 }}>
        Loading your account…
      </div>
    );
  }

  // ⛔ Block render after redirect
  if (!user) return null;

  return (
    <div style={{ width: "100%" }}>
      {/* ======================
          HEADER
      ====================== */}
      <section style={{ marginBottom: 36 }}>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 900,
            marginBottom: 6,
          }}
        >
          Your Account
        </h1>

        <p style={{ opacity: 0.65, fontSize: 15 }}>
          Hello{user.full_name ? `, ${user.full_name}` : ""}.  
          Manage orders, payments, and your personal information.
        </p>
      </section>

      {/* ======================
          GRID
      ====================== */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 24,
        }}
      >
        <AccountTile
          title="Your Orders"
          description="Track, return, or buy things again"
          href="/account/orders"
        />

        <AccountTile
          title="Login & Security"
          description="Password, email, and security settings"
          href="/account/security"
        />

        <AccountTile
          title="Your Addresses"
          description="Edit shipping and billing addresses"
          href="/account/addresses"
        />

        <AccountTile
          title="Payment Methods"
          description="Manage cards, UPI, and payment options"
          href="/account/payments"
        />

        <AccountTile
          title="Profile Information"
          description="Name, phone number, and avatar"
          href="/account/profile"
        />

        <AccountTile
          title="Preferences"
          description="Language, notifications, and personalization"
          href="/account/preferences"
        />

        <AccountTile
          title="Customer Support"
          description="Get help with orders and issues"
          href="/account/support"
        />
      </section>
    </div>
  );
}

/* ==========================
   TILE COMPONENT
========================== */

function AccountTile({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 28,
        borderRadius: 18,
        background: "#ffffff",
        textDecoration: "none",
        color: "#111",
        boxShadow:
          "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)",
        border: "1px solid rgba(0,0,0,.06)",
        transition: "transform .15s ease, box-shadow .15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          "0 4px 10px rgba(0,0,0,.08), 0 16px 40px rgba(0,0,0,.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)";
      }}
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: 900,
          marginBottom: 6,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: 14,
          opacity: 0.65,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </Link>
  );
}
