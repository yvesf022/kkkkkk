"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ordersApi, paymentsApi, wishlistApi, notificationsApi, walletApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";

const FF = "'Sora', 'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#2563EB";

const STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B", paid: "#10B981", shipped: "#3B82F6",
  completed: "#10B981", cancelled: "#F43F5E",
};
const PAY_COLOR: Record<string, string> = {
  pending: "#F59E0B", on_hold: "#F97316", paid: "#10B981", rejected: "#F43F5E",
};

function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width: 40, height: 40, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📦</div>
  );
  return <img src={src} alt={alt} onError={() => setErr(true)} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />;
}

/* ── SVG Icons — clean, natural, stroke-based ── */
const Icon = {
  orders: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  ),
  payments: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  profile: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  security: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  addresses: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  wishlist: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  ),
  reviews: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  wallet: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
      <circle cx="17" cy="13" r="1" fill="currentColor"/>
    </svg>
  ),
  coupons: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  notifications: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  support: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  chevron: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12l4-4-4-4"/>
    </svg>
  ),
  logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const TILES = [
  { key: "orders",        label: "Your Orders",       desc: "Track, return, or reorder",          href: "/account/orders",        Icon: Icon.orders },
  { key: "payments",      label: "Payments",           desc: "Upload proof, track payment status", href: "/account/payments",       Icon: Icon.payments },
  { key: "addresses",     label: "Addresses",          desc: "Manage delivery addresses",          href: "/account/addresses",      Icon: Icon.addresses },
  { key: "profile",       label: "Profile",            desc: "Name, phone and avatar",             href: "/account/profile",        Icon: Icon.profile },
  { key: "security",      label: "Login & Security",   desc: "Password and account security",      href: "/account/security",       Icon: Icon.security },
  { key: "wishlist",      label: "Wishlist",           desc: "Items you saved for later",          href: "/account/wishlist",       Icon: Icon.wishlist },
  { key: "reviews",       label: "My Reviews",         desc: "Reviews you've written",             href: "/account/reviews",        Icon: Icon.reviews },
  { key: "wallet",        label: "Wallet & Loyalty",   desc: "Points balance and rewards",         href: "/account/wallet",         Icon: Icon.wallet },
  { key: "coupons",       label: "Coupons",            desc: "Your available discount codes",      href: "/account/coupons",        Icon: Icon.coupons },
  { key: "notifications", label: "Notifications",      desc: "Alerts and messages",                href: "/account/notifications",  Icon: Icon.notifications },
  { key: "support",       label: "Customer Support",   desc: "Get help with orders and issues",    href: "/account/support",        Icon: Icon.support },
];

export default function AccountDashboardPage() {
  const { user, logout } = useAuth();

  const [recentOrders,   setRecentOrders]   = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [walletBalance,  setWalletBalance]  = useState<number | null>(null);
  const [wishlistCount,  setWishlistCount]  = useState<number | null>(null);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    Promise.allSettled([
      ordersApi.getMy(),
      paymentsApi.getMy(),
      notificationsApi.list(),
      walletApi.get(),
      wishlistApi.get(),
    ]).then(([ords, pmts, notifs, wallet, wl]) => {
      if (ords.status === "fulfilled") {
        const v: any = ords.value;
        const list = Array.isArray(v) ? v : v?.orders ?? v?.results ?? [];
        setRecentOrders(list.slice(0, 3));
      }
      if (pmts.status === "fulfilled") {
        const v: any = pmts.value;
        const list = Array.isArray(v) ? v : v?.payments ?? v?.results ?? [];
        setRecentPayments(list.slice(0, 2));
      }
      if (notifs.status === "fulfilled") {
        const v: any = notifs.value;
        const list = Array.isArray(v) ? v : v?.notifications ?? v?.results ?? [];
        setUnreadCount(list.filter((n: any) => !n.is_read).length);
      }
      if (wallet.status === "fulfilled") {
        const v: any = wallet.value;
        setWalletBalance(v?.balance ?? null);
      }
      if (wl.status === "fulfilled") {
        const v: any = wl.value;
        const list = Array.isArray(v) ? v : v?.items ?? v?.results ?? [];
        setWishlistCount(list.length);
      }
    }).finally(() => setLoading(false));
  }, []);

  const badges: Record<string, string | number> = {};
  if (unreadCount > 0) badges.notifications = unreadCount;
  if (wishlistCount !== null && wishlistCount > 0) badges.wishlist = wishlistCount;
  if (walletBalance !== null && walletBalance > 0) badges.wallet = formatCurrency(walletBalance);

  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const initials = user?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", padding: "clamp(24px, 4vw, 48px) clamp(16px, 4vw, 40px)" }}>
    <div style={{ fontFamily: FF, maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes kfadeup { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .kdash-tile { transition: box-shadow .18s, transform .18s, border-color .18s; }
        .kdash-tile:hover { box-shadow: 0 8px 28px rgba(37,99,235,.12); transform: translateY(-2px); border-color: #BFDBFE !important; }
        .kdash-tile:hover .ktile-icon { color: ${ACCENT} !important; background: #EFF6FF !important; }
        .korder-row { transition: background .12s; }
        .korder-row:hover { background: #F8FAFC !important; }
      `}</style>

      {/* ── Hero greeting ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt={user.full_name ?? ""} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #E2E8F0" }} />
            : <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, #1D4ED8)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{initials}</div>
          }
          <div>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 2px", fontWeight: 500 }}>Welcome back</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: BRAND, letterSpacing: "-0.04em", margin: 0 }}>
              {firstName}
            </h1>
            {user?.email && <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>{user.email}</p>}
          </div>
        </div>
        <button
          onClick={() => logout()}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", fontWeight: 600, fontSize: 13, fontFamily: FF, cursor: "pointer" }}
        >
          <Icon.logout /> Sign out
        </button>
      </div>

      {/* ── Recent orders snapshot ── */}
      {!loading && recentOrders.length > 0 && (
        <div style={{ marginBottom: 32, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, overflow: "hidden", animation: "kfadeup .3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #F1F5F9" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: BRAND, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon.orders /> Recent Orders
            </h2>
            <Link href="/account/orders" style={{ fontSize: 13, color: ACCENT, fontWeight: 600, textDecoration: "none" }}>View all →</Link>
          </div>
          {recentOrders.map((order, i) => {
            const items = order.items ?? [];
            const img = items[0]?.product?.main_image ?? null;
            const dot = STATUS_COLOR[order.status] ?? "#94A3B8";
            return (
              <Link key={order.id} href={`/account/orders/${order.id}`} style={{ textDecoration: "none" }}>
                <div className="korder-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: i < recentOrders.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                  <Thumb src={img} alt={items[0]?.title ?? "Order"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {items.length > 0 ? items.map((i: any) => i.title).join(", ") : `Order #${order.id.slice(0,8).toUpperCase()}`}
                    </p>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: dot, background: `${dot}18`, padding: "3px 9px", borderRadius: 20, textTransform: "capitalize" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot, display: "inline-block" }}/>
                      {order.status}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: BRAND }}>{typeof order.total_amount === "number" ? formatCurrency(order.total_amount) : ""}</span>
                    <span style={{ color: "#CBD5E1" }}><Icon.chevron /></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Payments needing action ── */}
      {!loading && recentPayments.some(p => ["pending", "rejected", "on_hold"].includes(p.status)) && (
        <div style={{ marginBottom: 32, padding: "14px 18px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, animation: "kfadeup .35s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E", margin: 0 }}>Payment action required</p>
              <p style={{ fontSize: 12, color: "#B45309", margin: 0 }}>
                {recentPayments.filter(p => p.status === "pending").length > 0 && "Upload proof of payment · "}
                {recentPayments.filter(p => p.status === "rejected").length > 0 && "Resubmit rejected proof"}
              </p>
            </div>
          </div>
          <Link href="/account/payments" style={{ padding: "8px 16px", borderRadius: 9, background: "#F59E0B", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            Go to Payments
          </Link>
        </div>
      )}

      {/* ── Nav tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {TILES.map((tile, i) => (
          <Link key={tile.key} href={tile.href} style={{ textDecoration: "none" }}>
            <div className="kdash-tile" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 20px 18px", display: "flex", alignItems: "center", gap: 16, animation: `kfadeup .3s ease ${i * 0.04}s both`, position: "relative" }}>
              <div className="ktile-icon" style={{ width: 44, height: 44, borderRadius: 12, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", flexShrink: 0, transition: "all .18s" }}>
                <tile.Icon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: 0 }}>{tile.label}</p>
                  {badges[tile.key] !== undefined && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: tile.key === "wallet" ? "#F0FDF4" : "#EFF6FF", color: tile.key === "wallet" ? "#166534" : ACCENT }}>
                      {badges[tile.key]}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "#94A3B8", margin: "2px 0 0", lineHeight: 1.4 }}>{tile.desc}</p>
              </div>
              <span style={{ color: "#CBD5E1", flexShrink: 0 }}><Icon.chevron /></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
    </div>
  );
}