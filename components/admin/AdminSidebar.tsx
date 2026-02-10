"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";
import { FiHome, FiBox, FiCreditCard, FiShoppingCart, FiLogOut } from "react-icons/fi";

export type AdminSidebarProps = {
  isMobile?: boolean;
  onClose?: () => void;
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: FiHome },
  { label: "Orders", href: "/admin/orders", icon: FiShoppingCart },
  { label: "Payments", href: "/admin/payments", icon: FiCreditCard },
  { label: "Products", href: "/admin/products", icon: FiBox },
];

export default function AdminSidebar({ isMobile, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAdminAuth((s) => s.logout);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      onClose?.();
      router.replace("/admin/login");
    }
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Brand */}
      <div>
        <h2 className="text-lg font-bold text-white">Karabo Admin</h2>
        <p className="text-xs text-gray-400">Store control center</p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-sm transition ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-sm bg-slate-800 text-red-400 hover:bg-slate-700"
      >
        <FiLogOut size={18} />
        Log out
      </button>
    </div>
  );
}
