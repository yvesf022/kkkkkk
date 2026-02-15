import "@/styles/globals.css";

import type { Metadata } from "next";
import ClientShell from "@/components/layout/ClientShell";
import { KeepAliveProvider } from "@/components/KeepAliveProvider";
import WhatsAppButton from "@/components/WhatsAppWidget";
import ToastProvider from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "Karabo Online Store",
  description: "Shop smarter with Karabo",

  icons: {
    icon: {
      url:
        "data:image/svg+xml," +
        encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#1e293b"/>
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#g)"/>
            <text x="50%" y="54%"
              text-anchor="middle"
              font-size="36"
              font-family="Arial, sans-serif"
              font-weight="900"
              fill="#ffffff">
              K
            </text>
          </svg>
        `),
    },
  },
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

          <ToastProvider />
          <WhatsAppButton />
        </KeepAliveProvider>
      </body>
    </html>
  );
}
