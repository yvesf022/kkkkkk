import "@/styles/globals.css";

import type { Metadata } from "next";
import ClientShell from "@/components/layout/ClientShell";
import { KeepAliveProvider } from "@/components/KeepAliveProvider";
import WhatsAppButton from "@/components/WhatsAppWidget";
import ToastProvider from "@/components/ui/ToastProvider";

/* =====================================================
   GLOBAL METADATA (WhatsApp + SEO + Social)
===================================================== */

export const metadata: Metadata = {
  metadataBase: new URL("https://kkkkkk-kappa.vercel.app/"), // 🔴 CHANGE THIS

  title: {
    default: "Karabo's Store – Premium Boutique in Lesotho",
    template: "%s | Karabo's Store",
  },

  description:
    "Discover premium fashion and beauty collections at Karabo's Store. A modern Lesotho boutique crafted for elegance, confidence and lifestyle.",

  keywords: [
    "Karabo Store",
    "Lesotho boutique",
    "Lesotho fashion",
    "Lesotho beauty products",
    "Premium boutique Lesotho",
  ],

  authors: [{ name: "Karabo's Store" }],

  openGraph: {
    title: "Karabo's Store – Premium Boutique in Lesotho",
    description:
      "Premium fashion and beauty collections curated for elegance and confidence.",
    url: "https://yourdomain.com", // 🔴 CHANGE THIS
    siteName: "Karabo's Store",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Karabo's Store – Luxury Boutique in Lesotho",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Karabo's Store – Premium Boutique",
    description:
      "Premium fashion and beauty collections in Lesotho.",
    images: ["/og-image.jpg"],
  },

  icons: {
    icon: {
      url:
        "data:image/svg+xml," +
        encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#0033a0"/>
                <stop offset="100%" stop-color="#009543"/>
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

/* =====================================================
   ROOT LAYOUT
===================================================== */

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
