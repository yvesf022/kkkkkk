import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";
import ClientShell from "@/components/layout/ClientShell";
import { KeepAliveProvider } from "@/components/KeepAliveProvider";
import WhatsAppButton from "@/components/WhatsAppWidget";
import ToastProvider from "@/components/ui/ToastProvider";

/* =====================================================
   VIEWPORT
===================================================== */

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f172a" },
  ],
  // Use actual device width so the page reflows into a proper mobile layout.
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

/* =====================================================
   FAVICON SVG
   Design: Rounded square, deep blue-to-green gradient
   (Lesotho flag inspired), elegant serif "K", gold
   diamond accent, subtle inner shine & depth ring.
===================================================== */

const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0033a0"/>
      <stop offset="100%" stop-color="#006b30"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#f0c040"/>
      <stop offset="100%" stop-color="#c8860a"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <clipPath id="clip">
      <rect width="64" height="64" rx="14"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>

  <!-- Top shine -->
  <rect width="64" height="64" rx="14" fill="url(#shine)" clip-path="url(#clip)"/>

  <!-- Border ring -->
  <rect x="1.5" y="1.5" width="61" height="61" rx="12.5"
        fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>

  <!-- Diagonal accent stripe -->
  <line x1="-4" y1="68" x2="68" y2="-4"
        stroke="rgba(255,255,255,0.05)" stroke-width="20"
        clip-path="url(#clip)"/>

  <!-- Serif K — the hero element -->
  <text
    x="33" y="46"
    text-anchor="middle"
    font-size="40"
    font-family="Georgia, 'Times New Roman', serif"
    font-weight="700"
    fill="#ffffff"
    letter-spacing="-1"
    filter="url(#shadow)"
  >K</text>

  <!-- Gold diamond — top right accent -->
  <g transform="translate(49.5, 12) rotate(45)" filter="url(#shadow)">
    <rect x="-4.5" y="-4.5" width="9" height="9" rx="1.2" fill="url(#gold)"/>
  </g>

  <!-- White dot — bottom left, balances composition -->
  <circle cx="11.5" cy="52.5" r="2.8" fill="rgba(255,255,255,0.3)"/>

  <!-- Tiny gold dot — bottom right corner detail -->
  <circle cx="53" cy="53" r="1.8" fill="rgba(240,192,64,0.5)"/>
</svg>`;

/* =====================================================
   GLOBAL METADATA
===================================================== */

export const metadata: Metadata = {
  metadataBase: new URL("https://kkkkkk-kappa.vercel.app/"),

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

  manifest: "/manifest.json",

  other: {
    "apple-mobile-web-app-capable":          "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title":            "Karabo's Store",
    "format-detection":                      "telephone=no",
    "msapplication-TileColor":               "#0f172a",
    "msapplication-TileImage":               "/icons/icon-144x144.png",
    "msapplication-config":                  "/browserconfig.xml",
    "msapplication-tap-highlight":           "no",
    "mobile-web-app-capable":                "yes",
  },

  icons: {
    icon: [
      /* ✅ Redesigned SVG favicon */
      {
        url:  "data:image/svg+xml," + encodeURIComponent(faviconSVG),
        type: "image/svg+xml",
      },
      { url: "/icons/icon-32x32.png",   sizes: "32x32",   type: "image/png" },
      { url: "/icons/icon-16x16.png",   sizes: "16x16",   type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png",          sizes: "180x180" },
      { url: "/icons/apple-touch-icon-152x152.png",  sizes: "152x152" },
      { url: "/icons/apple-touch-icon-144x144.png",  sizes: "144x144" },
      { url: "/icons/apple-touch-icon-120x120.png",  sizes: "120x120" },
      { url: "/icons/apple-touch-icon-76x76.png",    sizes: "76x76"   },
    ],
    shortcut: "/icons/icon-192x192.png",
  },

  openGraph: {
    title:       "Karabo's Store – Premium Boutique in Lesotho",
    description: "Premium fashion and beauty collections curated for elegance and confidence.",
    url:         "https://kkkkkk-kappa.vercel.app/",
    siteName:    "Karabo's Store",
    images: [
      {
        url:    "/og-image.jpg",
        width:  1200,
        height: 630,
        alt:    "Karabo's Store – Luxury Boutique in Lesotho",
      },
    ],
    locale: "en_US",
    type:   "website",
  },

  twitter: {
    card:        "summary_large_image",
    title:       "Karabo's Store – Premium Boutique",
    description: "Premium fashion and beauty collections in Lesotho.",
    images:      ["/og-image.jpg"],
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
      <head>
        {/* iPhone 14 Pro Max */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"  href="/splash/iphone14promax.png" />
        {/* iPhone 14 Pro */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"  href="/splash/iphone14pro.png" />
        {/* iPhone 14 / 13 / 12 */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"  href="/splash/iphone14.png" />
        {/* iPhone SE 3rd gen */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"  href="/splash/iphonese.png" />
        {/* iPad Pro 12.9" */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/ipadpro129.png" />
        {/* iPad Pro 11" */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"  href="/splash/ipadpro11.png" />
        {/* iPad 10th gen */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"  href="/splash/ipad10.png" />
      </head>

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