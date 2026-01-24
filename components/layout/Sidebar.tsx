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

        /* ✅ Premium neutral icon wrap (navy tint + subtle gold) */
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
        /* keep global badge but enhance */
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

  /* ✅ Production: auto-collapse on smaller laptop widths */
  const autoCollapseRef = useRef<boolean | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSidebar]);

  useEffect(() => {
    /* ✅ Auto collapse logic:
       - <= 1180px desktop: collapse sidebar by default for space
       - users can still manually expand
       - respects first load behavior */
    const mq = window.matchMedia("(max-width: 1180px)");

    const apply = () => {
      if (autoCollapseRef.current === null) {
        autoCollapseRef.current = true;
        setCollapsed(mq.matches);
      }
    };

    apply();
    const onChange = () => {
      // if user manually toggled after initial, do not force-collapse
      if (autoCollapseRef.current) setCollapsed(mq.matches);
    };

    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const nav: NavItem[] = useMemo(
    () => [
      {
        label: "All Products",
        href: "/store",
        hint: "Browse everything",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7h18M6 7l1 14h10l1-14M9 7V5a3 3 0 0 1 6 0v2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        label: "Beauty Products",
        href: "/store/beauty",
        hint: "Glow, skincare, cosmetics",
        badge: "Glow",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2c3.5 3.5 7 6.5 7 10.5A7 7 0 1 1 5 12.5C5 8.5 8.5 5.5 12 2Z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        ),
      },
      {
        label: "Mobile & Accessories",
        href: "/store/mobile",
        hint: "Cases, chargers, add-ons",
        badge: "Tech",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M11 19h2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        label: "Fashion Store",
        href: "/store/fashion",
        hint: "Streetwear & outfits",
        badge: "Style",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 6 12 3l4 3 3-1 2 4-3 2v10H6V11L3 9l2-4 3 1Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
    ],
    []
  );

  const quickLinks: NavItem[] = useMemo(
    () => [
      {
        label: "Wishlist",
        href: "/wishlist",
        hint: "Saved items",
        badge: wishlistCount > 0 ? String(wishlistCount) : undefined,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21s-7-4.6-9-9.5C1.7 8.5 3.6 6 6.5 6c1.9 0 3.1 1 3.8 2 0.7-1 1.9-2 3.8-2C16.9 6 18.8 8.5 21 11.5c-2 4.9-9 9.5-9 9.5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        label: "Cart",
        href: "/cart",
        hint: "Checkout items",
        badge: cartCount > 0 ? String(cartCount) : undefined,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6h15l-2 9H7L6 6Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M6 6 5 3H2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              fill="currentColor"
            />
          </svg>
        ),
      },
      {
        label: "Account",
        href: "/account",
        hint: "Orders & profile",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M4 21a8 8 0 0 1 16 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        label: "Checkout",
        href: "/checkout",
        hint: "Complete order",
        badge: "Fast",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 7V5a4 4 0 1 1 8 0v2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M6 7h12l1 14H5L6 7Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
    ],
    [cartCount, wishlistCount]
  );

  const Item = ({ item }: { item: NavItem }) => {
    const active = path === item.href;

    return (
      <Link
        href={item.href}
        onClick={() => closeSidebar()}
        className="pill"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "10px" : "10px 12px",

          /* ✅ Production: active state now premium commerce */
          background: active
            ? "linear-gradient(180deg, rgba(236,203,140,0.20), rgba(45,72,126,0.06))"
            : "rgba(255,255,255,0.92)",

          borderColor: active
            ? "rgba(214, 170, 92, 0.40)"
            : "rgba(12,14,20,0.10)",

          boxShadow: active ? "0 16px 40px rgba(12, 14, 20, 0.12)" : "none",
          transition:
            "transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <IconWrap active={active}>{item.icon}</IconWrap>

          {!collapsed ? (
            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ fontWeight: 1000, letterSpacing: 0.1 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {item.hint ?? (active ? "Active" : "Tap to open")}
              </div>
            </div>
          ) : null}
        </div>

        {!collapsed && item.badge ? <Badge text={item.badge} /> : null}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="kyDesktopSidebar">
        <SidebarShell
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          nav={nav}
          quickLinks={quickLinks}
          Item={Item}
        />
      </aside>

      {/* Mobile overlay */}
      <div
        className="kyMobileOverlay"
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
        style={{
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? "auto" : "none",
        }}
      />

      {/* Mobile drawer */}
      <aside
        className="kyMobileDrawer"
        aria-hidden={!sidebarOpen}
        style={{
          transform: sidebarOpen ? "translateX(0)" : "translateX(-110%)",
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

      <style>{`
        /* ======================================================
           ✅ FIXED DESKTOP SIDEBAR (ALWAYS VISIBLE)
           + COLLAPSE SUPPORT
           ====================================================== */
        .kyDesktopSidebar {
          display: block;
          position: fixed;
          top: calc(var(--headerH) + 12px);

          /* aligns sidebar with container */
          left: max(4vw, calc((100vw - 1200px)/2));

          width: var(--sidebarW);
          height: calc(100vh - (var(--headerH) + 34px));
          overflow: hidden;
          z-index: 60;

          /* ✅ feels more stable */
          will-change: transform;
        }

        /* ✅ premium overlay */
        .kyMobileOverlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 34, 64, 0.16);
          backdrop-filter: blur(12px);
          z-index: 70;
          transition: opacity .18s ease;
        }

        .kyMobileDrawer {
          position: fixed;
          top: calc(var(--headerH) + 10px);
          left: 12px;
          width: min(92vw, 392px);
          z-index: 80;
          transition: transform .22s ease;
        }

        @media (min-width: 981px) {
          .kyMobileOverlay, .kyMobileDrawer { display: none; }
        }

        @media (max-width: 980px) {
          .kyDesktopSidebar { display: none; }
        }
      `}</style>
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
  Item: ({ item }: { item: NavItem }) => JSX.Element;
  forceCloseButton?: boolean;
}) {
  const { closeSidebar } = useUI();

  return (
    <div
      className="glass"
      style={{
        overflow: "hidden",
        height: "100%",

        /* ✅ premium production shell */
        borderRadius: 28,
        border: "1px solid rgba(12,14,20,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(246,248,252,0.92))",
        boxShadow: "0 24px 90px rgba(12,14,20,0.12)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(12,14,20,0.08)",
          background:
            "radial-gradient(70% 100% at 50% 0%, rgba(214,170,92,0.14), rgba(0,0,0,0) 60%)",
        }}
      >
        <div style={{ display: "grid" }}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.2 }}>
            {collapsed ? "Menu" : "Sub-Stores"}
          </div>
          {!collapsed ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Choose your store
            </div>
          ) : null}
        </div>

        {/* ✅ Desktop: collapse uses chevron (NOT 3 bars)
            ✅ Mobile: close X */}
        {!forceCloseButton ? (
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="btn btnIcon"
            onClick={() => setCollapsed((s) => !s)}
            style={{
              minWidth: 44,
              height: 44,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(12,14,20,0.12)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,248,252,0.98))",
              boxShadow: "0 18px 50px rgba(12,14,20,0.12)",
            }}
          >
            <CollapseChevron collapsed={collapsed} />
          </button>
        ) : (
          <button
            aria-label="Close menu"
            className="btn btnIcon"
            onClick={closeSidebar}
            style={{
              minWidth: 44,
              height: 44,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(12,14,20,0.12)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,248,252,0.98))",
              boxShadow: "0 18px 50px rgba(12,14,20,0.12)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="rgba(20,34,64,0.92)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable content (inside sidebar only) */}
      <div
        style={{
          padding: collapsed ? 12 : 14,
          display: "grid",
          gap: 14,
          height: "calc(100% - 74px)",
          overflowY: "auto",
        }}
      >
        {/* STORES */}
        <div style={{ display: "grid", gap: 10 }}>
          <Divider label="STORES" collapsed={collapsed} />
          {nav.map((item) => (
            <Item key={item.href} item={item} />
          ))}
        </div>

        {/* Promo */}
        {!collapsed ? (
          <div
            style={{
              padding: 14,
              borderRadius: 24,
              border: "1px solid rgba(214, 170, 92, 0.24)",
              background:
                "radial-gradient(120% 120% at 20% 0%, rgba(236,203,140,0.30), rgba(255,255,255,0.92) 55%)",
              boxShadow: "0 22px 58px rgba(12, 14, 20, 0.10)",
            }}
          >
            <div style={{ fontWeight: 1000, display: "flex", gap: 8, alignItems: "center" }}>
              New Arrivals <span style={{ color: "rgba(214,170,92,0.95)" }}>✨</span>
            </div>
            <div
              style={{
                fontSize: 13,
                marginTop: 6,
                color: "var(--muted)",
                lineHeight: 1.5,
              }}
            >
              Fresh collections added weekly — beauty, fashion and accessories.
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              <Link
                href="/store"
                className="btn btnPrimary"
                style={{ flex: 1, textAlign: "center" }}
              >
                Shop Now
              </Link>

              <Link
                href="/wishlist"
                className="btn"
                style={{
                  flex: 1,
                  textAlign: "center",
                  borderColor: "rgba(45,72,126,0.22)",
                }}
              >
                Save Items
              </Link>
            </div>
          </div>
        ) : null}

        {/* QUICK LINKS */}
        <div style={{ display: "grid", gap: 10 }}>
          <Divider label="QUICK ACTIONS" collapsed={collapsed} />
          {quickLinks.map((item) => (
            <Item key={item.href} item={item} />
          ))}
        </div>

        {!collapsed ? (
          <div
            style={{
              borderTop: "1px solid rgba(12,14,20,0.08)",
              paddingTop: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 1000 }}>Support</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  24/7 chat • refund policy
                </div>
              </div>

              <span
                className="badge"
                style={{
                  borderColor: "rgba(45,72,126,0.22)",
                  background: "rgba(45,72,126,0.10)",
                  color: "rgba(20,34,64,0.88)",
                }}
              >
                Secure
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
