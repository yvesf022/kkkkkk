"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { adminAuthApi, adminApi } from "@/lib/api";
import toast from "react-hot-toast";

const NAV = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard",    href: "/admin",                      icon: "⬡", exact: true },
      { label: "Analytics",    href: "/admin/analytics",            icon: "↗" },
      { label: "Reports",      href: "/admin/reports",              icon: "⊞" },
    ],
  },
  {
    section: "Catalog",
    items: [
      { label: "Products",     href: "/admin/products",             icon: "◈" },
      { label: "Inventory",    href: "/admin/inventory",            icon: "▦" },
      { label: "Bulk Upload",  href: "/admin/products/bulk-upload", icon: "⇪" },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Orders",       href: "/admin/orders",               icon: "◎", badgeKey: "orders" },
      { label: "Payments",     href: "/admin/payments",             icon: "◇", badgeKey: "payments" },
    ],
  },
  {
    section: "People",
    items: [
      { label: "Customers",    href: "/admin/users",                icon: "◉" },
      { label: "Sessions",     href: "/admin/sessions",             icon: "◌" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Stores",       href: "/admin/stores",               icon: "▣" },
      { label: "Audit Logs",   href: "/admin/logs",                 icon: "≡" },
      { label: "Bank Settings",href: "/admin/settings/bank",        icon: "◻" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [badges, setBadges] = useState({ orders: 0, payments: 0 });

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    adminApi.getDashboard().then((d: any) => {
      setBadges({ orders: d?.pending_orders ?? 0, payments: d?.pending_payments ?? 0 });
    }).catch(() => {});
  }, []);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : (pathname === href || pathname.startsWith(href + "/"));

  async function logout() {
    setLoggingOut(true);
    try {
      await adminAuthApi.logout();
      toast.success("Logged out");
      router.replace("/admin/login");
    } catch {
      toast.error("Logout failed");
    } finally { setLoggingOut(false); }
  }

  const W = collapsed ? 64 : 240;

  return (
    <>
      <button className="adminMenuBtn" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
        {mobileOpen ? "✕" : "☰"}
      </button>

      <div className={`adminSidebarOverlay${mobileOpen ? " open" : ""}`} onClick={() => setMobileOpen(false)} />

      <aside className={`adminSidebar${mobileOpen ? " open" : ""}`} style={{
        width: W, minWidth: W,
        transition: "width 0.2s ease, min-width 0.2s ease",
        display: "flex", flexDirection: "column",
        background: "#0a0f1e",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        height: "100vh", position: "sticky", top: 0,
        overflowX: "hidden", overflowY: "hidden",
        flexShrink: 0, zIndex: 100,
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? "18px 0" : "18px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 10, minHeight: 70, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden", minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: "linear-gradient(135deg,#0033a0,#009543)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: "Georgia,serif",
            }}>K</div>
            {!collapsed && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>Karabo Admin</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase" }}>Control Centre</div>
              </div>
            )}
          </div>
          {!collapsed && <button onClick={() => setCollapsed(true)} style={cBtn}>‹</button>}
        </div>

        {collapsed && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", flexShrink: 0 }}>
            <button onClick={() => setCollapsed(false)} style={cBtn}>›</button>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
          {NAV.map((group) => (
            <div key={group.section} style={{ marginBottom: 2 }}>
              {!collapsed && (
                <div style={{
                  padding: "10px 18px 3px", fontSize: 9, fontWeight: 800,
                  color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.15em",
                }}>{group.section}</div>
              )}
              {group.items.map((item) => {
                const active = isActive(item.href, (item as any).exact);
                const badge  = badges[(item as any).badgeKey as keyof typeof badges] ?? 0;
                return (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: collapsed ? "11px 0" : "10px 18px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    textDecoration: "none",
                    color: active ? "#fff" : "rgba(255,255,255,0.42)",
                    background: active ? "rgba(255,255,255,0.07)" : "transparent",
                    borderLeft: active && !collapsed ? "2px solid #0ef" : "2px solid transparent",
                    transition: "all 0.12s", position: "relative",
                    minHeight: 40, whiteSpace: "nowrap", fontSize: 13,
                    fontWeight: active ? 700 : 400,
                  }}>
                    <span style={{ fontSize: 15, flexShrink: 0, fontFamily: "monospace", color: active ? "#0ef" : "rgba(255,255,255,0.25)" }}>
                      {item.icon}
                    </span>
                    {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                    {badge > 0 && !collapsed && (
                      <span style={{ background: "#ef4444", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>
                        {badge}
                      </span>
                    )}
                    {badge > 0 && collapsed && (
                      <span style={{ position: "absolute", top: 6, right: 10, background: "#ef4444", width: 7, height: 7, borderRadius: "50%" }} />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: collapsed ? "12px 0" : "12px 14px",
          flexShrink: 0, display: "flex", justifyContent: collapsed ? "center" : "stretch",
        }}>
          <button onClick={logout} disabled={loggingOut} title={collapsed ? "Logout" : undefined} style={{
            width: collapsed ? 38 : "100%", height: 38, borderRadius: 8,
            border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)",
            color: "#f87171", cursor: loggingOut ? "not-allowed" : "pointer",
            fontSize: 12, fontWeight: 600, opacity: loggingOut ? 0.5 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>⏻</span>
            {!collapsed && (loggingOut ? "Logging out…" : "Logout")}
          </button>
        </div>
      </aside>
    </>
  );
}

const cBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, padding: 0,
  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 14, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
};