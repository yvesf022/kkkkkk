import "@/styles/globals.css";

import type { Metadata } from "next";
import ClientShell from "@/components/layout/ClientShell";
import { KeepAliveProvider } from "@/components/KeepAliveProvider";
import WhatsAppButton from "@/components/WhatsAppWidget";

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
          
          {/* WhatsApp Chat Button */}
          <WhatsAppButton />
          {/* OR use advanced widget: <WhatsAppWidget /> */}
        </KeepAliveProvider>
      </body>
    </html>
  );
}