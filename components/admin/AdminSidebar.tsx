"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminAuthApi } from "@/lib/api";

export type AdminSidebarProps = {
  isMobile?: boolean;
  onClose?: () => void;
};

const NAV = [
  {
    section: "COMMAND",
    items: [
      { label: "Dashboard",       href: "/admin",                   icon: "⬛" },
      { label: "Analytics",       href: "/admin/analytics",         icon: "◈" },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      { label: "Orders",          href: "/admin/orders",            icon: "◉", badge: "orders" },
      { label: "Payments",        href: "/admin/payments",          icon: "◆", badge: "payments" },
      { label: "Products",        href: "/admin/products",          icon: "▣" },
      { label: "Inventory",       href: "/admin/inventory",         icon: "▤" },
    ],
  },
  {
    section: "CATALOG",
    items: [
      { label: "Bulk Upload",     href: "/admin/products/bulk-upload", icon: "⬆" },
      { label: "Categories",      href: "/admin/categories",        icon: "◧" },
      { label: "Stores",          href: "/admin/stores",            icon: "▦" },
    ],
  },
  {
    section: "USERS",
    items: [
      { label: "Customers",       href: "/admin/users",             icon: "◎" },
      { label: "Sessions",        href: "/admin/sessions",          icon: "◌" },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { label: "Reports",         href: "/admin/reports",           icon: "◫" },
      { label: "Audit Logs",      href: "/admin/logs",              icon: "▥" },
      { label: "Bank Settings",   href: "/admin/settings/bank",     icon: "▩" },
    ],
  },
];

export default function AdminSidebar({ isMobile, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    adminAuthApi.me().then(a => setAdminEmail(a?.email ?? null)).catch(() => null);
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const handleLogout = async () => {
    await adminAuthApi.logout().catch(() => null);
    window.location.href = "/admin/login";
  };

  const w = collapsed ? 72 : 260;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@700;800&display=swap');

        .ksb-root {
          font-family: 'JetBrains Mono', monospace;
          width: ${w}px;
          min-width: ${w}px;
          max-width: ${w}px;
          height: 100vh;
          background: #080C10;
          border-right: 1px solid #1a2332;
          display: flex;
          flex-direction: column;
          transition: width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s, max-width 0.22s;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .ksb-scanline {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,255,136,0.012) 2px,
            rgba(0,255,136,0.012) 4px
          );
          pointer-events: none;
          z-index: 0;
        }

        .ksb-glow {
          position: absolute;
          top: -80px; left: -80px;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(0,255,136,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
          animation: ksb-pulse 4s ease-in-out infinite;
        }

        @keyframes ksb-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        .ksb-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
        }

        .ksb-content::-webkit-scrollbar { display: none; }

        .ksb-header {
          padding: ${collapsed ? "20px 0" : "24px 20px 16px"};
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #111921;
          justify-content: ${collapsed ? "center" : "space-between"};
        }

        .ksb-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          overflow: hidden;
        }

        .ksb-logo-mark {
          width: 32px;
          height: 32px;
          background: #00FF88;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: #080C10;
          flex-shrink: 0;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }

        .ksb-logo-text {
          overflow: hidden;
          white-space: nowrap;
        }

        .ksb-logo-name {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 800;
          color: #EDFFF7;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .ksb-logo-sub {
          font-size: 9px;
          color: #00FF88;
          letter-spacing: 3px;
          opacity: 0.7;
          text-transform: uppercase;
          margin-top: -2px;
        }

        .ksb-collapse-btn {
          width: 28px;
          height: 28px;
          border: 1px solid #1a2332;
          background: transparent;
          color: #3D6A4F;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          font-size: 12px;
          transition: all 0.2s;
        }

        .ksb-collapse-btn:hover {
          border-color: #00FF88;
          color: #00FF88;
          background: rgba(0,255,136,0.05);
        }

        .ksb-clock {
          padding: ${collapsed ? "10px 0" : "10px 20px"};
          font-size: 10px;
          color: #2A4D3A;
          letter-spacing: 2px;
          text-align: ${collapsed ? "center" : "left"};
          border-bottom: 1px solid #0D1520;
        }

        .ksb-clock span {
          color: #00FF88;
          opacity: 0.5;
        }

        .ksb-nav {
          flex: 1;
          padding: 12px 0;
        }

        .ksb-section {
          margin-bottom: 4px;
        }

        .ksb-section-label {
          padding: ${collapsed ? "10px 0 4px" : "10px 20px 4px"};
          font-size: 8px;
          letter-spacing: 3px;
          color: #1E3028;
          text-transform: uppercase;
          text-align: ${collapsed ? "center" : "left"};
          display: ${collapsed ? "none" : "block"};
        }

        .ksb-section-dot {
          display: ${collapsed ? "flex" : "none"};
          justify-content: center;
          padding: 10px 0 4px;
        }

        .ksb-section-dot::after {
          content: '';
          width: 20px;
          height: 1px;
          background: #1E3028;
          display: block;
        }

        .ksb-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: ${collapsed ? "10px 0" : "9px 20px"};
          text-decoration: none;
          position: relative;
          cursor: pointer;
          transition: all 0.15s;
          justify-content: ${collapsed ? "center" : "flex-start"};
          overflow: hidden;
          margin: 1px ${collapsed ? "0" : "8px"};
          border-radius: ${collapsed ? "0" : "6px"};
        }

        .ksb-nav-item::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: #00FF88;
          transform: scaleY(0);
          transition: transform 0.2s;
          display: ${collapsed ? "none" : "block"};
        }

        .ksb-nav-item:hover::before,
        .ksb-nav-item.active::before {
          transform: scaleY(1);
        }

        .ksb-nav-item:hover {
          background: rgba(0,255,136,0.04);
        }

        .ksb-nav-item.active {
          background: rgba(0,255,136,0.07);
        }

        .ksb-nav-icon {
          font-size: 14px;
          width: 18px;
          text-align: center;
          flex-shrink: 0;
          color: #2A4D3A;
          transition: color 0.15s;
        }

        .ksb-nav-item:hover .ksb-nav-icon,
        .ksb-nav-item.active .ksb-nav-icon {
          color: #00FF88;
        }

        .ksb-nav-label {
          font-size: 11px;
          font-weight: 500;
          color: #3D6A4F;
          letter-spacing: 0.5px;
          white-space: nowrap;
          flex: 1;
          transition: color 0.15s;
          overflow: hidden;
        }

        .ksb-nav-item:hover .ksb-nav-label,
        .ksb-nav-item.active .ksb-nav-label {
          color: #EDFFF7;
        }

        .ksb-badge {
          padding: 2px 6px;
          background: rgba(255,70,70,0.15);
          border: 1px solid rgba(255,70,70,0.3);
          color: #FF7070;
          font-size: 8px;
          letter-spacing: 1px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .ksb-tooltip {
          position: absolute;
          left: 72px;
          background: #0D1520;
          border: 1px solid #1a2332;
          color: #EDFFF7;
          font-size: 10px;
          letter-spacing: 1px;
          padding: 6px 10px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          z-index: 9999;
          transition: opacity 0.15s;
        }

        .ksb-nav-item:hover .ksb-tooltip {
          opacity: ${collapsed ? "1" : "0"};
        }

        .ksb-footer {
          padding: 16px ${collapsed ? "0" : "20px"};
          border-top: 1px solid #0D1520;
          flex-shrink: 0;
        }

        .ksb-admin-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          justify-content: ${collapsed ? "center" : "flex-start"};
        }

        .ksb-avatar {
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, #00FF88, #00CCFF);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #080C10;
          flex-shrink: 0;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }

        .ksb-admin-info {
          overflow: hidden;
          display: ${collapsed ? "none" : "block"};
        }

        .ksb-admin-role {
          font-size: 8px;
          letter-spacing: 3px;
          color: #00FF88;
          opacity: 0.6;
          text-transform: uppercase;
        }

        .ksb-admin-email {
          font-size: 10px;
          color: #3D6A4F;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 160px;
        }

        .ksb-logout-btn {
          width: 100%;
          padding: 8px;
          background: transparent;
          border: 1px solid #1a2332;
          color: #2A4D3A;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          display: ${collapsed ? "none" : "flex"};
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .ksb-logout-btn:hover {
          border-color: #FF4444;
          color: #FF4444;
          background: rgba(255,68,68,0.04);
        }

        .ksb-logout-icon {
          font-size: 14px;
          cursor: pointer;
          color: #1E3028;
          transition: color 0.2s;
          display: ${collapsed ? "flex" : "none"};
          justify-content: center;
          width: 100%;
          padding: 4px 0;
        }

        .ksb-logout-icon:hover { color: #FF4444; }

        .ksb-status-bar {
          padding: ${collapsed ? "6px 0" : "6px 20px"};
          font-size: 8px;
          letter-spacing: 2px;
          color: #1E3028;
          border-top: 1px solid #0D1520;
          text-align: ${collapsed ? "center" : "left"};
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: ${collapsed ? "center" : "flex-start"};
        }

        .ksb-status-dot {
          width: 5px;
          height: 5px;
          background: #00FF88;
          border-radius: 50%;
          animation: ksb-blink 2s ease-in-out infinite;
          flex-shrink: 0;
        }

        @keyframes ksb-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>

      <aside className="ksb-root">
        <div className="ksb-scanline" />
        <div className="ksb-glow" />

        <div className="ksb-content">
          {/* HEADER */}
          <div className="ksb-header">
            <Link href="/admin" className="ksb-logo">
              <div className="ksb-logo-mark">K</div>
              {!collapsed && (
                <div className="ksb-logo-text">
                  <div className="ksb-logo-name">Karabo</div>
                  <div className="ksb-logo-sub">Admin Console</div>
                </div>
              )}
            </Link>
            {!isMobile && (
              <button
                className="ksb-collapse-btn"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? "Expand" : "Collapse"}
              >
                {collapsed ? "▶" : "◀"}
              </button>
            )}
            {isMobile && onClose && (
              <button className="ksb-collapse-btn" onClick={onClose}>✕</button>
            )}
          </div>

          {/* CLOCK */}
          <div className="ksb-clock">
            {collapsed ? (
              <span>{time.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}</span>
            ) : (
              <><span>{time.toLocaleTimeString("en-US", { hour12: false })}</span> · UTC{String(-time.getTimezoneOffset() / 60).padStart(3, "+")}</>
            )}
          </div>

          {/* NAV */}
          <nav className="ksb-nav">
            {NAV.map(({ section, items }) => (
              <div key={section} className="ksb-section">
                <div className="ksb-section-label">{section}</div>
                <div className="ksb-section-dot" />
                {items.map(({ label, href, icon, badge }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`ksb-nav-item${isActive(href) ? " active" : ""}`}
                    onClick={isMobile ? onClose : undefined}
                  >
                    <span className="ksb-nav-icon">{icon}</span>
                    {!collapsed && (
                      <>
                        <span className="ksb-nav-label">{label}</span>
                        {badge === "payments" && (
                          <span className="ksb-badge">PENDING</span>
                        )}
                      </>
                    )}
                    {collapsed && <div className="ksb-tooltip">{label}</div>}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          {/* STATUS */}
          <div className="ksb-status-bar">
            <div className="ksb-status-dot" />
            {!collapsed && "SYSTEM ONLINE"}
          </div>

          {/* FOOTER */}
          <div className="ksb-footer">
            <div className="ksb-admin-row">
              <div className="ksb-avatar">
                {adminEmail ? adminEmail[0].toUpperCase() : "A"}
              </div>
              <div className="ksb-admin-info">
                <div className="ksb-admin-role">Administrator</div>
                <div className="ksb-admin-email">{adminEmail ?? "admin@karabo.com"}</div>
              </div>
            </div>
            <button className="ksb-logout-btn" onClick={handleLogout}>
              <span>⏻</span> Logout
            </button>
            <div className="ksb-logout-icon" onClick={handleLogout} title="Logout">⏻</div>
          </div>
        </div>
      </aside>
    </>
  );
}