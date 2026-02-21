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
  // STRICT DESKTOP LOCK — layout is always 1024px wide.
  // width=1024 forces the browser to treat the viewport as 1024px regardless
  // of physical screen size. On a 390px phone the browser auto-scales to
  // 390/1024 ≈ 0.38 so the full layout fits with no horizontal scroll.
  // minimumScale = maximumScale = 1 with userScalable=false locks the view
  // completely — no pinch-zoom, no OS font scaling, identical on all devices.
  width: 1024,
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <stop offset="0%"   stop-color="#040d07"/>
      <stop offset="50%"  stop-color="#071610"/>
      <stop offset="100%" stop-color="#050e08"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#c8a03c" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#c8a03c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#f0d080"/>
      <stop offset="100%" stop-color="#c8860a"/>
    </linearGradient>
    <linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#0d3d26" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#050e08" stop-opacity="1"/>
    </linearGradient>
    <filter id="kshadow">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.5"/>
    </filter>
    <clipPath id="clip">
      <rect width="64" height="64" rx="14"/>
    </clipPath>
  </defs>

  <!-- Deep emerald background -->
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>

  <!-- Gold radial glow -->
  <rect width="64" height="64" rx="14" fill="url(#glow)" clip-path="url(#clip)"/>

  <!-- Thin gold border ring -->
  <rect x="1" y="1" width="62" height="62" rx="13"
        fill="none" stroke="rgba(200,160,60,0.3)" stroke-width="1" clip-path="url(#clip)"/>

  <!-- Lesotho mountain silhouette -->
  <g clip-path="url(#clip)">
    <path d="M0,64 L0,46 L10,34 L18,40 L28,24 L36,32 L44,20 L52,30 L58,22 L64,28 L64,64 Z"
          fill="url(#mtn)" opacity="0.7"/>
    <path d="M0,46 L10,34 L18,40 L28,24 L36,32 L44,20 L52,30 L58,22 L64,28"
          fill="none" stroke="rgba(200,160,60,0.2)" stroke-width="0.8"/>
  </g>

  <!-- Gold serif K -->
  <text
    x="32" y="44"
    text-anchor="middle"
    font-size="34"
    font-family="Georgia, Times New Roman, serif"
    font-weight="700"
    fill="#c8a03c"
    filter="url(#kshadow)"
  >K</text>

  <!-- Gold diamond top right -->
  <g transform="translate(51,11) rotate(45)" filter="url(#kshadow)">
    <rect x="-3.5" y="-3.5" width="7" height="7" rx="1" fill="url(#gold)"/>
  </g>

  <!-- Accent dot bottom left -->
  <circle cx="10" cy="55" r="2" fill="rgba(200,160,60,0.4)"/>
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
        url:    "/og-image.png",
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
    images:      ["/og-image.png"],
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

      {/* Dark background painted immediately before JS loads — prevents white flash behind splash */}
      <body style={{ background: "#050e08" }}>
        <KeepAliveProvider>
          <ClientShell>{children}</ClientShell>
          <ToastProvider />
          <WhatsAppButton />
        </KeepAliveProvider>
      </body>
    </html>
  );
}