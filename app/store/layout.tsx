"use client";

import StoreToolbar from "@/components/store/StoreToolbar";
import CartDrawer from "@/components/store/CartDrawer";
import FloatingCartButton from "@/components/store/FloatingCartButton";
import TrustBadges from "@/components/store/TrustBadges";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Top toolbar (search, filters, categories, etc.) */}
      <StoreToolbar />

      {/* Main content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Trust badges at bottom */}
      <TrustBadges />

      {/* Global floating components */}
      <CartDrawer />
      <FloatingCartButton />
    </div>
  );
}
