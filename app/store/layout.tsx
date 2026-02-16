"use client";

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

      {/* Main content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Trust badges */}
      <TrustBadges />

      {/* Global cart components */}
      <CartDrawer />
      <FloatingCartButton />
    </div>
  );
}
