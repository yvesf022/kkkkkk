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
      aria-hidden="true"
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,

        border: active
          ? "1px solid rgba(214, 170, 92, 0.42)"
          : "1px solid rgba(45, 72, 126, 0.16)",
        background: active
          ? "linear-gradient(180deg, rgba(236,203,140,0.22), rgba(255,255,255,0.92))"
          : "linear-gradient(180deg, rgba(246,248,252,0.96), rgba(255,255,255,0.92))",
        boxShadow: active
          ? "0 12px 28px rgba(12, 14, 20, 0.12)"
          : "0 10px 22px rgba(12, 14, 20, 0.08)",

        color: active ? "rgba(20,34,64,0.92)" : "rgba(20,34,64,0.70)",
        transition:
          "transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease",
      }}
    >
      {children}
    </span>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span
      className="badge"
      style={{
        borderColor: "rgba(214, 170, 92, 0.34)",
        background: "rgba(214, 170, 92, 0.14)",
        color: "rgba(12,14,20,0.88)",
      }}
    >
      {text}
    </span>
  );
}

function Divider({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div style={{ height: 8 }} />;
  return (
    <div
      style={{
        fontSize: 12,
        letterSpacing: 0.18,
        fontWeight: 1000,
        color: "var(--muted2)",
        marginTop: 2,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ flexShrink: 0 }}>{label}</span>
      <span
        aria-hidden="true"
        style={{
          height: 1,
          width: "100%",
          background: "rgba(12,14,20,0.10)",
          borderRadius: 999,
        }}
      />
    </div>
  );
}

function CollapseChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}
        stroke="rgba(20,34,64,0.90)"
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSidebar]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1180px)");
    const apply = () => {
      if (autoCollapseRef.current === null) {
        autoCollapseRef.current = true;
        setCollapsed(mq.matches);
      }
    };
    apply();
    const onChange = () => {
      if (autoCollapseRef.current) setCollapsed(mq.matches);
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const nav: NavItem[] = useMemo(() => [], []);
  const quickLinks: NavItem[] = useMemo(() => [], []);

  const Item = ({ item }: { item: NavItem }) => {
    const active = path === item.href;
    return (
      <Link href={item.href} onClick={closeSidebar} className="pill">
        {item.label}
      </Link>
    );
  };

  return null;
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
  return <div />;
}
