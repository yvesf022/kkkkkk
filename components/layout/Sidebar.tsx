"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUI } from "@/components/layout/uiStore";
import { useStore } from "@/lib/store";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  hint?: string;
};

function IconWrap({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        border: active
          ? "1px solid rgba(214,170,92,.42)"
          : "1px solid rgba(45,72,126,.16)",
        background: active
          ? "linear-gradient(180deg, rgba(236,203,140,.22), rgba(255,255,255,.92))"
          : "linear-gradient(180deg, rgba(246,248,252,.96), rgba(255,255,255,.92))",
        boxShadow: active
          ? "0 12px 28px rgba(12,14,20,.12)"
          : "0 10px 22px rgba(12,14,20,.08)",
      }}
    >
      {children}
    </span>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="badge">
      {text}
    </span>
  );
}

function CollapseChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d={collapsed ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="rgba(20,34,64,.9)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar() {
  const path = usePathname();
  const { sidebarOpen, closeSidebar } = useUI();
  const cartCount = useStore((s) => s.cartCount());
  const wishlistCount = useStore((s) => s.wishlist.length);

  const [collapsed, setCollapsed] = useState(false);
  const autoCollapseRef = useRef<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1180px)");
    if (autoCollapseRef.current === null) {
      autoCollapseRef.current = true;
      setCollapsed(mq.matches);
    }
  }, []);

  const nav: NavItem[] = useMemo(
    () => [
      { label: "All Products", href: "/store", icon: <span>🛍️</span> },
      { label: "Beauty", href: "/store/beauty", badge: "Glow", icon: <span>✨</span> },
      { label: "Mobile", href: "/store/mobile", badge: "Tech", icon: <span>📱</span> },
      { label: "Fashion", href: "/store/fashion", badge: "Style", icon: <span>👗</span> },
    ],
    []
  );

  const quickLinks: NavItem[] = useMemo(
    () => [
      { label: "Wishlist", href: "/wishlist", badge: wishlistCount ? String(wishlistCount) : undefined, icon: <span>❤️</span> },
      { label: "Cart", href: "/cart", badge: cartCount ? String(cartCount) : undefined, icon: <span>🛒</span> },
      { label: "Account", href: "/account", icon: <span>👤</span> },
    ],
    [cartCount, wishlistCount]
  );

  const Item = ({ item }: { item: NavItem }) => {
    const active = path === item.href;
    return (
      <Link href={item.href} onClick={closeSidebar} className="pill">
        <IconWrap active={active}>{item.icon}</IconWrap>
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && item.badge && <Badge text={item.badge} />}
      </Link>
    );
  };

  return (
    <>
      {/* DESKTOP RIGHT SIDEBAR */}
      <aside
        className="kyDesktopSidebar"
        style={{
          width: collapsed ? 88 : 310,
          right: "max(4vw, calc((100vw - 1200px)/2))",
          transition: "width .28s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <SidebarShell
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          nav={nav}
          quickLinks={quickLinks}
          Item={Item}
        />
      </aside>

      {/* MOBILE OVERLAY */}
      <div
        className="kyMobileOverlay"
        onClick={closeSidebar}
        style={{
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? "auto" : "none",
        }}
      />

      {/* MOBILE DRAWER (RIGHT) */}
      <aside
        className="kyMobileDrawer"
        style={{
          right: 12,
          left: "auto",
          transform: sidebarOpen ? "translateX(0)" : "translateX(110%)",
        }}
      >
        <SidebarShell
          collapsed={false}
          setCollapsed={() => {}}
          nav={nav}
          quickLinks={quickLinks}
          Item={Item}
          forceCloseButton
        />
      </aside>
    </>
  );
}

function SidebarShell({
  collapsed,
  setCollapsed,
  nav,
  quickLinks,
  Item,
  forceCloseButton = false,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((s: boolean) => boolean)) => void;
  nav: NavItem[];
  quickLinks: NavItem[];
  Item: ({ item }: { item: NavItem }) => React.ReactElement;
  forceCloseButton?: boolean;
}) {
  const { closeSidebar } = useUI();

  return (
    <div className="glass" style={{ height: "100%", padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{collapsed ? "Menu" : "Sub-Stores"}</strong>
        {!forceCloseButton ? (
          <button onClick={() => setCollapsed((s) => !s)}>
            <CollapseChevron collapsed={collapsed} />
          </button>
        ) : (
          <button onClick={closeSidebar}>✕</button>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        {nav.map((item) => (
          <Item key={item.href} item={item} />
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {quickLinks.map((item) => (
          <Item key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}
