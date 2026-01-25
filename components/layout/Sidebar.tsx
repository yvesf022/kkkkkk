"use client";

import Link from "next/link";
import { useUI } from "./uiStore";

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUI();

  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebarCard">
        <div className="sidebarHeader">
          <div>
            <div className="sidebarTitle">Sub-Stores</div>
            <div className="sidebarSubtitle">Choose your store</div>
          </div>

          <button
            className="sidebarClose"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            ‹
          </button>
        </div>

        <nav className="sidebarNav">
          <SidebarItem
            title="All Products"
            subtitle="Browse everything"
            href="/store"
          />

          <SidebarItem
            title="Beauty Products"
            subtitle="Glow, skincare, cosmetics"
            badge="Glow"
            href="/store/beauty"
          />

          <SidebarItem
            title="Mobile & Accessories"
            subtitle="Cases, chargers, add-ons"
            badge="Tech"
            href="/store/mobile"
          />

          <SidebarItem
            title="Fashion Store"
            subtitle="Streetwear & outfits"
            badge="Style"
            href="/store/fashion"
          />
        </nav>
      </div>
    </aside>
  );
}

function SidebarItem({
  title,
  subtitle,
  badge,
  href,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
}) {
  return (
    <Link href={href} className="sidebarItem">
      <div className="sidebarItemText">
        <div className="sidebarItemTitle">{title}</div>
        <div className="sidebarItemSubtitle">{subtitle}</div>
      </div>

      {badge && <span className="sidebarBadge">{badge}</span>}
    </Link>
  );
}
