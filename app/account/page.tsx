"use client";

import Link from "next/link";

export default function AccountDashboardPage() {
  return (
    <div style={{ width: "100%" }}>
      <section style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 6 }}>Your Account</h1>
        <p style={{ opacity: 0.65, fontSize: 15 }}>Manage orders, payments, and your personal information.</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
        <AccountTile title="Your Orders" description="Track, return, or buy things again" href="/account/orders" emoji="📦" />
        <AccountTile title="Login & Security" description="Password, email, and security settings" href="/account/security" emoji="🔒" />
        <AccountTile title="Your Addresses" description="Edit shipping and billing addresses" href="/account/addresses" emoji="📍" />
        <AccountTile title="Payments" description="View payments, upload proof, track status" href="/account/payments" emoji="💳" />
        <AccountTile title="Profile Information" description="Name, phone number, and avatar" href="/account/profile" emoji="👤" />
        <AccountTile title="Wishlist" description="Products you saved for later" href="/account/wishlist" emoji="❤️" />
        <AccountTile title="My Reviews" description="Reviews you've written" href="/account/reviews" emoji="⭐" />
        <AccountTile title="Wallet & Loyalty" description="Points balance and transactions" href="/account/wallet" emoji="💰" />
        <AccountTile title="Coupons" description="Your available discount codes" href="/account/coupons" emoji="🏷️" />
        <AccountTile title="Notifications" description="Your alerts and messages" href="/account/notifications" emoji="🔔" />
        <AccountTile title="Preferences" description="Language, notifications, and personalization" href="/account/preferences" emoji="⚙️" />
        <AccountTile title="Customer Support" description="Get help with orders and issues" href="/account/support" emoji="💬" />
      </section>
    </div>
  );
}

function AccountTile({ title, description, href, emoji }: { title: string; description: string; href: string; emoji: string }) {
  return (
    <Link href={href} style={{ display: "block", padding: 28, borderRadius: 18, background: "#ffffff", textDecoration: "none", color: "#111", boxShadow: "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)", border: "1px solid rgba(0,0,0,.06)", transition: "transform .15s ease, box-shadow .15s ease" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,.08), 0 16px 40px rgba(0,0,0,.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)"; }}
    >
      <div style={{ fontSize: 28, marginBottom: 10 }}>{emoji}</div>
      <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 14, opacity: 0.65, lineHeight: 1.5 }}>{description}</p>
    </Link>
  );
}