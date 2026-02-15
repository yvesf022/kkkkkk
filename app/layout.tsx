import "@/styles/globals.css";

import type { Metadata } from "next";
import ClientShell from "@/components/layout/ClientShell";
import { KeepAliveProvider } from "@/components/KeepAliveProvider";
import WhatsAppButton from "@/components/WhatsAppWidget";
import ToastProvider from "@/components/ui/ToastProvider"; // ✅ ADD THIS

export const metadata: Metadata = {
  title: "Karabo Online Store",
  description: "Shop smarter with Karabo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <KeepAliveProvider>
          <ClientShell>{children}</ClientShell>

          {/* GLOBAL TOAST SYSTEM */}
          <ToastProvider />

          {/* WhatsApp Chat Button */}
          <WhatsAppButton />
        </KeepAliveProvider>
      </body>
    </html>
  );
}
