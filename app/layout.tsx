import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";
import ClientShell from "@/components/layout/ClientShell";
import { KeepAliveProvider } from "@/components/KeepAliveProvider";
import WhatsAppButton from "@/components/WhatsAppWidget";
import ToastProvider from "@/components/ui/ToastProvider";

/* =====================================================
   VIEWPORT — controls theme color bar on mobile
===================================================== */

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",   // ← critical for iPhone notch / Dynamic Island
};

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

  /* ── PWA manifest link ── */
  manifest: "/manifest.json",

  /* ── Apple / iOS PWA meta ──
     These control how the app behaves when saved to iOS Home Screen.
     Safari does NOT use the web manifest for these — they must be
     explicit <meta> tags, which Next.js emits via the `other` field.
  */
  other: {
    /* Makes the app launch full-screen (no Safari chrome) on iOS */
    "apple-mobile-web-app-capable": "yes",

    /* Status bar style: default | black | black-translucent
       black-translucent = content extends under the notch */
    "apple-mobile-web-app-status-bar-style": "black-translucent",

    /* App name shown below the icon on iOS */
    "apple-mobile-web-app-title": "Karabo",

    /* Disables automatic phone number detection formatting */
    "format-detection": "telephone=no",

    /* Microsoft Tile (Windows Start Menu pinning) */
    "msapplication-TileColor":          "#0f172a",
    "msapplication-TileImage":           "/icons/icon-144x144.png",
    "msapplication-config":              "/browserconfig.xml",
    "msapplication-tap-highlight":       "no",

    /* Mobile browser toolbar color (Android Chrome, Samsung Internet) */
    "mobile-web-app-capable": "yes",
  },

  /* ── Apple Touch Icons ──
     iOS uses these for the Home Screen icon — NOT the manifest icons.
     Provide multiple sizes for best results across devices.
  */
  icons: {
    /* Browser favicon (SVG + fallback) */
    icon: [
      {
        url: "data:image/svg+xml," + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#0033a0"/>
                <stop offset="100%" stop-color="#009543"/>
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#g)"/>
            <text x="50%" y="54%"
              text-anchor="middle" font-size="36"
              font-family="Arial, sans-serif" font-weight="900" fill="#fff">K</text>
          </svg>
        `),
        type: "image/svg+xml",
      },
      { url: "/icons/icon-32x32.png",  sizes: "32x32",  type: "image/png" },
      { url: "/icons/icon-16x16.png",  sizes: "16x16",  type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],

    /* Apple touch icons — used by iOS for Home Screen & bookmarks */
    apple: [
      { url: "/icons/apple-touch-icon.png",          sizes: "180x180" },
      { url: "/icons/apple-touch-icon-152x152.png",  sizes: "152x152" },
      { url: "/icons/apple-touch-icon-144x144.png",  sizes: "144x144" },
      { url: "/icons/apple-touch-icon-120x120.png",  sizes: "120x120" },
      { url: "/icons/apple-touch-icon-76x76.png",    sizes: "76x76"   },
    ],

    /* Windows shortcut icon */
    shortcut: "/icons/icon-192x192.png",
  },

  /* ── Open Graph ── */
  openGraph: {
    title: "Karabo's Store – Premium Boutique in Lesotho",
    description:
      "Premium fashion and beauty collections curated for elegance and confidence.",
    url:      "https://kkkkkk-kappa.vercel.app/",
    siteName: "Karabo's Store",
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

  /* ── Twitter Card ── */
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
      {/*
        Apple splash screens — shown while the app loads on iOS.
        Add these <link> tags for every iPhone/iPad screen size.
        Generate the actual images with a tool like:
        https://progressier.com/pwa-icons-and-ios-splash-screen-generator
      */}
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