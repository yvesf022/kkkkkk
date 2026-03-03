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
  // width=1024 renders the full desktop layout.
  // ClientShell.tsx calculates the correct initialScale at runtime
  // so the whole page fits the screen without needing to zoom out.
  width: 1024,
  initialScale: 1,
  minimumScale: 0.1,
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

const icon144DataUrl = "data:image/png;base64,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";

/* =====================================================
   GLOBAL METADATA
===================================================== */

export const metadata: Metadata = {
  // ✅ FIXED: Use real production domain, not Vercel dev URL
  metadataBase: new URL("https://www.karabostore.com"),

  title: {
    // ✅ IMPROVED: More descriptive, includes key product categories
    default: "Karabo's Store – Premium Beauty & Skincare in Lesotho",
    template: "%s | Karabo's Store Lesotho",
  },

  // ✅ IMPROVED: Richer description with specific products & local signals
  description:
    "Shop premium skincare, serums, face oils, sunscreens and body care at Karabo's Store — Lesotho's finest beauty boutique. Free delivery on orders over M500. 100% authentic products.",

  // ✅ IMPROVED: Expanded keyword list targeting Lesotho shoppers
  keywords: [
    "Karabo Store",
    "Karabo's Store Lesotho",
    "online shopping Lesotho",
    "buy skincare Lesotho",
    "beauty products Lesotho",
    "buy sunscreen Lesotho",
    "face serum Maseru",
    "skincare boutique Lesotho",
    "collagen supplements Lesotho",
    "body lotion Lesotho",
    "face serum Lesotho",
    "premium boutique Lesotho",
    "free delivery Lesotho",
    "online store Maseru",
    "Lesotho ecommerce",
    "gift sets Lesotho",
    "skincare delivery Lesotho",
    "buy online Lesotho",
  ],

  authors: [{ name: "Karabo's Store", url: "https://www.karabostore.com" }],

  // ✅ NEW: Tell Google your site is indexable
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  // ✅ NEW: Canonical URL prevents duplicate content penalties
  alternates: {
    canonical: "https://www.karabostore.com",
  },

  // ✅ NEW: Geo signals help Google understand you serve Lesotho
  other: {
    "geo.region":                            "LS",
    "geo.placename":                         "Lesotho",
    "apple-mobile-web-app-capable":          "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title":            "Karabo's Store",
    "format-detection":                      "telephone=no",
    "msapplication-TileColor":               "#0f172a",
    "msapplication-TileImage":               icon144DataUrl,
    "msapplication-config":                  "/browserconfig.xml",
    "msapplication-tap-highlight":           "no",
    "mobile-web-app-capable":                "yes",
  },

  manifest: "/manifest.json",

  icons: {
    icon: [
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

  // ✅ FIXED: URL updated to real domain
  openGraph: {
    title:       "Karabo's Store – Premium Beauty & Skincare in Lesotho",
    description: "Shop skincare, serums, oils, sunscreens & wellness essentials at Lesotho's finest beauty boutique. Free delivery on orders over M500.",
    url:         "https://www.karabostore.com",
    siteName:    "Karabo's Store",
    images: [
      {
        url:    "/og-image.png",
        width:  1200,
        height: 630,
        alt:    "Karabo's Store – Premium Online Boutique in Lesotho",
      },
    ],
    locale:   "en_LS", // ✅ FIXED: Lesotho locale, not en_US
    type:     "website",
    countryName: "Lesotho",
  },

  // ✅ IMPROVED: More descriptive Twitter card
  twitter: {
    card:        "summary_large_image",
    title:       "Karabo's Store – Premium Beauty & Skincare in Lesotho",
    description: "Lesotho's finest beauty boutique. Skincare, serums, oils & more. Free delivery on M500+.",
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
    <html lang="en-LS">  {/* ✅ FIXED: Lesotho locale */}
      <head>
        {/*
          ⚡ PWA: Capture beforeinstallprompt IMMEDIATELY — the browser fires
          it very early, before React even mounts, so a useEffect listener
          always misses it. We stash it on window so InstallPrompt can read it.
        */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__karabo_deferredPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__karabo_deferredPrompt = e;
            window.dispatchEvent(new Event('karabo-install-ready'));
          }, { once: true });
        `}} />

        {/* ✅ NEW: JSON-LD — tells Google exactly what your business is */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "OnlineStore",
              "name": "Karabo's Store",
              "url": "https://www.karabostore.com",
              "logo": "https://www.karabostore.com/icons/icon-512x512.png",
              "description": "Lesotho's finest beauty boutique. Shop premium skincare, serums, oils, sunscreens and body care with free delivery on M500+.",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "LS",
                "addressRegion": "Maseru"
              },
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Karabo's Store Products",
                "itemListElement": [
                  { "@type": "OfferCatalog", "name": "Beauty & Skincare" },
                  { "@type": "OfferCatalog", "name": "Sunscreen & SPF" },
                  { "@type": "OfferCatalog", "name": "Serums & Face Oils" },
                  { "@type": "OfferCatalog", "name": "Health & Wellness" }
                ]
              }
            })
          }}
        />
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