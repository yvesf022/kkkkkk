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
      { label: "Dashboard",     href: "/admin",                      icon: "⊡", exact: true },
      { label: "Analytics",     href: "/admin/analytics",            icon: "↗" },
      { label: "Reports",       href: "/admin/reports",              icon: "⊞" },
    ],
  },
  {
    section: "Catalog",
    items: [
      { label: "Products",      href: "/admin/products",             icon: "◈" },
      { label: "Inventory",     href: "/admin/inventory",            icon: "▦" },
      { label: "Bulk Upload",   href: "/admin/products/bulk-upload", icon: "⇪" },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Orders",        href: "/admin/orders",               icon: "◎", badgeKey: "orders" },
      { label: "Payments",      href: "/admin/payments",             icon: "◇", badgeKey: "payments" },
    ],
  },
  {
    section: "People",
    items: [
      { label: "Customers",     href: "/admin/users",                icon: "◉" },
      { label: "Sessions",      href: "/admin/sessions",             icon: "◌" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Stores",        href: "/admin/stores",               icon: "▣" },
      { label: "Audit Logs",    href: "/admin/logs",                 icon: "≡" },
      { label: "Bank Settings", href: "/admin/settings/bank",        icon: "◻" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [badges,     setBadges]     = useState({ orders: 0, payments: 0 });

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

  const sidebar = (
    <aside style={{
      width: W, minWidth: W,
      transition: "width 0.2s ease, min-width 0.2s ease",
      display: "flex", flexDirection: "column",
      background: "#ffffff",
      borderRight: "1px solid #e2e8f0",
      height: "100vh", position: "sticky", top: 0,
      overflowX: "hidden", overflowY: "hidden",
      flexShrink: 0, zIndex: 100,
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: collapsed ? "16px 0" : "16px 16px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        gap: 10, minHeight: 68, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden", minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: "linear-gradient(135deg, #0033a0, #009543)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: "Georgia, serif",
            boxShadow: "0 2px 8px rgba(0,51,160,0.25)",
          }}>K</div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>Karabo Admin</div>
              <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "1.2px", textTransform: "uppercase" }}>Control Centre</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={collapseBtn} title="Collapse">‹</button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", flexShrink: 0 }}>
          <button onClick={() => setCollapsed(false)} style={collapseBtn} title="Expand">›</button>
        </div>
      )}

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
        {NAV.map((group) => (
          <div key={group.section} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{
                padding: "10px 16px 3px",
                fontSize: 10, fontWeight: 700,
                color: "#cbd5e1",
                textTransform: "uppercase", letterSpacing: "0.12em",
              }}>
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href, (item as any).exact);
              const badge  = badges[(item as any).badgeKey as keyof typeof badges] ?? 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: collapsed ? "10px 0" : "9px 16px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    textDecoration: "none",
                    color: active ? "#0f172a" : "#64748b",
                    background: active ? "#f1f5f9" : "transparent",
                    borderLeft: active && !collapsed ? "2px solid #0f172a" : "2px solid transparent",
                    borderRadius: collapsed ? 0 : "0 8px 8px 0",
                    marginRight: collapsed ? 0 : 8,
                    transition: "all 0.12s",
                    position: "relative",
                    minHeight: 38,
                    whiteSpace: "nowrap",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span style={{
                    fontSize: 14, flexShrink: 0,
                    color: active ? "#0f172a" : "#94a3b8",
                    transition: "color 0.12s",
                  }}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span style={{ flex: 1 }}>{item.label}</span>
                  )}
                  {badge > 0 && !collapsed && (
                    <span style={{
                      background: "#ef4444", color: "#fff",
                      borderRadius: 99, fontSize: 10, fontWeight: 700,
                      padding: "1px 6px", lineHeight: 1.6,
                    }}>
                      {badge}
                    </span>
                  )}
                  {badge > 0 && collapsed && (
                    <span style={{
                      position: "absolute", top: 7, right: 10,
                      background: "#ef4444", width: 6, height: 6, borderRadius: "50%",
                    }} />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Logout ── */}
      <div style={{
        borderTop: "1px solid #e2e8f0",
        padding: collapsed ? "12px 0" : "12px 10px",
        flexShrink: 0,
        display: "flex", justifyContent: collapsed ? "center" : "stretch",
      }}>
        <button
          onClick={logout}
          disabled={loggingOut}
          title={collapsed ? "Logout" : undefined}
          style={{
            width: collapsed ? 38 : "100%", height: 36, borderRadius: 8,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#dc2626",
            cursor: loggingOut ? "not-allowed" : "pointer",
            fontSize: 12, fontWeight: 600,
            opacity: loggingOut ? 0.5 : 1,
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
            transition: "all 0.12s",
          }}
          onMouseEnter={(e) => { if (!loggingOut) (e.currentTarget as HTMLElement).style.background = "#fee2e2"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; }}
        >
          <span style={{ fontSize: 13 }}>⏻</span>
          {!collapsed && (loggingOut ? "Logging out…" : "Logout")}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="adminMenuBtn"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
        style={{
          display: "none",
          position: "fixed", top: 12, left: 12, zIndex: 200,
          width: 38, height: 38, borderRadius: 9,
          border: "1px solid #e2e8f0", background: "#fff",
          cursor: "pointer", fontSize: 16, alignItems: "center", justifyContent: "center",
        }}
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 150,
            background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Desktop sidebar */}
      <div className="adminSidebarDesktop" style={{ display: "flex" }}>
        {sidebar}
      </div>

      {/* Mobile sidebar */}
      <div
        className="adminSidebarMobile"
        style={{
          position: "fixed", top: 0, left: mobileOpen ? 0 : -260, zIndex: 160,
          transition: "left 0.25s ease",
          boxShadow: mobileOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
        }}
      >
        {sidebar}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .adminSidebarDesktop { display: none !important; }
          .adminMenuBtn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .adminSidebarMobile { display: none !important; }
        }
        nav::-webkit-scrollbar { width: 3px; }
        nav::-webkit-scrollbar-track { background: transparent; }
        nav::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
      `}</style>
    </>
  );
}

const collapseBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, padding: 0,
  border: "1px solid #e2e8f0", background: "#f8fafc",
  color: "#94a3b8", cursor: "pointer", fontSize: 15, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.12s",
};