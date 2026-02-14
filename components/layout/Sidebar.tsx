"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "./uiStore";
import { useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, closeSidebar } = useUI();

  // Auto-close sidebar when navigating on mobile
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  // Don't render sidebar on admin or auth pages
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify-email")
  ) {
    return null;
  }

  return (
    <>
      {/* OVERLAY (for mobile) */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 19,
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          position: "fixed",
          top: "var(--headerH, 86px)",
          left: sidebarOpen ? 0 : "-100%",
          width: "var(--sidebarW, 300px)",
          height: "calc(100vh - var(--headerH, 86px))",
          padding: 18,
          zIndex: 20,
          transition: "left 0.3s ease",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "rgba(255, 255, 255, 0.92)",
            borderRadius: 22,
            boxShadow:
              "0 20px 60px rgba(12, 14, 20, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.6)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                Sub-Stores
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(12, 14, 20, 0.55)",
                }}
              >
                Choose your store
              </div>
            </div>

            <button
              onClick={toggleSidebar}
              aria-label="Close sidebar"
              style={{
                background: "none",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                color: "rgba(12, 14, 20, 0.6)",
                padding: 4,
              }}
            >
              ‹
            </button>
          </div>

          {/* NAVIGATION */}
          <nav
            style={{
              overflowY: "auto",
              display: "grid",
              gap: 10,
            }}
          >
            <SidebarItem
              title="All Products"
              subtitle="Browse everything"
              href="/store"
              active={pathname === "/store"}
            />

            <SidebarItem
              title="Beauty Products"
              subtitle="Glow, skincare, cosmetics"
              badge="Glow"
              href="/store/beauty"
              active={pathname.includes("/store/beauty")}
            />

            <SidebarItem
              title="Mobile & Accessories"
              subtitle="Cases, chargers, add-ons"
              badge="Tech"
              href="/store/mobile"
              active={pathname.includes("/store/mobile")}
            />

            <SidebarItem
              title="Fashion Store"
              subtitle="Streetwear & outfits"
              badge="Style"
              href="/store/fashion"
              active={pathname.includes("/store/fashion")}
            />
          </nav>
        </div>
      </aside>
    </>
  );
}

/* ============ SIDEBAR ITEM ============ */

interface SidebarItemProps {
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
  active?: boolean;
}

function SidebarItem({
  title,
  subtitle,
  badge,
  href,
  active,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        textDecoration: "none",
        color: "inherit",
        background: active
          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
          : "linear-gradient(135deg, #ffffff, #f7faff)",
        border: active
          ? "1px solid rgba(255, 255, 255, 0.3)"
          : "1px solid rgba(12, 14, 20, 0.06)",
        transition: "all 0.25s ease",
        boxShadow: active ? "0 10px 28px rgba(99, 102, 241, 0.3)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 10px 28px rgba(58, 169, 255, 0.25), 0 6px 18px rgba(255, 79, 161, 0.25)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            marginBottom: 4,
            color: active ? "#ffffff" : "inherit",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: active ? 0.9 : 0.6,
            color: active ? "#ffffff" : "inherit",
          }}
        >
          {subtitle}
        </div>
      </div>

      {badge && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            padding: "6px 12px",
            borderRadius: 999,
            background: active
              ? "rgba(255, 255, 255, 0.25)"
              : "linear-gradient(135deg, #3aa9ff, #ff4fa1)",
            color: "#ffffff",
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}