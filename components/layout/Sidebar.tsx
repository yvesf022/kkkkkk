"use client";
import type React from "react";

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
        width: 36,
        height: 36,
        borderRadius: 12,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: active
          ? "linear-gradient(135deg, rgba(236,72,153,.35), rgba(168,85,247,.35))"
          : "transparent",
        border: active ? "1px solid rgba(236,72,153,.45)" : "1px solid transparent",
      }}
    >
      {children}
    </span>
  );
}

function NavRow({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="navRow"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        textDecoration: "none",
        color: "var(--fg)",
        background: active ? "rgba(236,72,153,.12)" : "transparent",
        border: active
          ? "1px solid rgba(236,72,153,.35)"
          : "1px solid transparent",
      }}
    >
      <IconWrap active={active}>{item.icon}</IconWrap>
      <div style={{ display: "grid", lineHeight: 1.15 }}>
        <span style={{ fontWeight: 700 }}>{item.label}</span>
        {item.hint && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {item.hint}
          </span>
        )}
      </div>
      {item.badge && (
        <span
          style={{
            marginLeft: "auto",
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 12,
            background: "rgba(236,72,153,.18)",
            color: "#ec4899",
            border: "1px solid rgba(236,72,153,.35)",
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({
  nav,
  quickLinks,
  Item,
  forceCloseButton,
}: {
  nav: NavItem[];
  quickLinks: NavItem[];
  Item: ({ item }: { item: NavItem }) => React.ReactElement;
  forceCloseButton?: boolean;
}) {
  const { closeSidebar, isSidebarOpen } = useUI();
  const pathname = usePathname();
  const cartCount = useStore((s) => s.cart.length);

  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isSidebarOpen, closeSidebar]);

  const activeHref = useMemo(() => pathname || "/", [pathname]);

  if (!mounted) return null;

  return (
    <aside
      ref={containerRef}
      className="sidebar"
      style={{
        position: "fixed",
        inset: "0 auto 0 0",
        width: 300,
        padding: 16,
        background:
          "linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.7))",
        backdropFilter: "blur(14px)",
        borderRight: "1px solid var(--softLine)",
        transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .25s ease",
        zIndex: 60,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <strong style={{ fontSize: 18 }}>Menu</strong>
        {(forceCloseButton || isSidebarOpen) && (
          <button className="iconBtn" onClick={closeSidebar}>
            ✕
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav style={{ display: "grid", gap: 6 }}>
        {nav.map((item) => (
          <NavRow
            key={item.href}
            item={{
              ...item,
              badge:
                item.label.toLowerCase() === "cart" && cartCount > 0
                  ? String(cartCount)
                  : item.badge,
            }}
            active={activeHref === item.href}
            onClick={closeSidebar}
          />
        ))}
      </nav>

      {/* Quick Links */}
      <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            paddingLeft: 6,
          }}
        >
          Quick Links
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {quickLinks.map((item) => (
            <Item key={item.href} item={item} />
          ))}
        </div>
      </div>
    </aside>
  );
}
