"use client";

import GuestCartGate from "@/components/auth/GuestCartGate";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestCartGate redirectPath="/store/checkout">
      {children}
    </GuestCartGate>
  );
}