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
};

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
      { label: "All Products", href: "/store", icon: "🛍️" },
      { label: "Beauty", href: "/store/beauty", badge: "Glow", icon: "✨" },
      { label: "Mobile", href: "/store/mobile", badge: "Tech", icon: "📱" },
      { label: "Fashion", href: "/store/fashion", badge: "Style", icon: "👗" },
    ],
    []
  );

  const quickLinks: NavItem[] = useMemo(
    () => [
      { label: "Wishlist", href: "/wishlist", badge: wishlistCount?.toString(), icon: "❤️" },
      { label: "Cart", href: "/cart", badge: cartCount?.toString(), icon: "🛒" },
    ],
    [cartCount, wishlistCount]
  );

  return (
    <>
      {/* DESKTOP RIGHT SIDEBAR */}
      <aside
        className="kyDesktopSidebar"
        style={{
          position: "fixed",
          top: "calc(var(--headerH) + 12px)",
          right: "max(4vw, calc((100vw - 1200px) / 2))",
          width: collapsed ? 88 : 310,
          height: "calc(100vh - (var(--headerH) + 34px))",
          transition: "width .25s ease",
          zIndex: 60,
        }}
      >
        <div className="glass" style={{ height: "100%", padding: 14 }}>
          <button onClick={() => setCollapsed((s) => !s)}>
            {collapsed ? "›" : "‹"}
          </button>

          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.icon} {!collapsed && item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      <aside
        className="kyMobileDrawer"
        style={{
          right: 12,
          transform: sidebarOpen ? "translateX(0)" : "translateX(110%)",
        }}
      />
    </>
  );
}
