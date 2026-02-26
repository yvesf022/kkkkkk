"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function resolveImg(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API}${url.startsWith("/") ? "" : "/"}${url}`;
}

function optimizeImg(url: string | null | undefined, size: 300 | 500 | 1500 = 300): string | null {
  if (!url) return null;
  if (!url.includes("m.media-amazon.com")) return url;
  return url.replace(/_AC_S[LY]\d+_/g, `_AC_SL${size}_`);
}

interface HP {
  id: string;
  title: string;
  price: number;
  compare_price?: number | null;
  discount_pct?: number | null;
  brand?: string | null;
  category?: string | null;
  rating?: number | null;
  rating_number?: number | null;
  in_stock: boolean;
  main_image?: string | null;
  sales?: number | null;
}

interface Section {
  key: string;
  title: string;
  subtitle: string;
  badge: string | null;
  theme: string;
  view_all: string;
  products: HP[];
}

interface SubCat {
  key: string;
  label: string;
  href: string;
  image: string | null;
}
interface DeptCategory {
  key: string;
  title: string;
  href: string;
  image: string | null;
  subcategories: SubCat[];
}

const THEME_MAP: Record<string, { primary: string }> = {
  red:    { primary: "#e53e3e" },
  green:  { primary: "#0f3f2f" },
  gold:   { primary: "#b8860b" },
  forest: { primary: "#1b5e4a" },
  navy:   { primary: "#1a3a6b" },
  plum:   { primary: "#6b1f7c" },
  teal:   { primary: "#00695c" },
  rust:   { primary: "#a0390f" },
  slate:  { primary: "#2c3e50" },
  olive:  { primary: "#4a6741" },
  rose:   { primary: "#8e1a4a" },
  indigo: { primary: "#2d3561" },
  amber:  { primary: "#9a4400" },
  sage:   { primary: "#3d6b52" },
  stone:  { primary: "#4a3728" },
};

function safeViewAll(raw: string): string {
  try {
    const url = new URL(raw, "http://x");
    const params = new URLSearchParams();
    const q = url.searchParams.get("q");
    const sort = url.searchParams.get("sort");
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    return `/store${params.toString() ? "?" + params.toString() : ""}`;
  } catch { return "/store"; }
}

function useCountdown(targetHours = 6) {
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const end = Date.now() + targetHours * 3_600_000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      setTime({ h: Math.floor(diff / 3_600_000), m: Math.floor((diff % 3_600_000) / 60_000), s: Math.floor((diff % 60_000) / 1_000) });
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetHours]);
  return time;
}

// ═══════════════════════════════════════════════════════════════
//  SVG ICON LIBRARY — replaces all emojis
// ═══════════════════════════════════════════════════════════════
const Icons = {
  Skincare: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#fce7f3" />
      <ellipse cx="24" cy="26" rx="10" ry="12" fill="#f9a8d4" />
      <ellipse cx="24" cy="20" rx="7" ry="8" fill="#fbcfe8" />
      <circle cx="24" cy="14" r="4" fill="#f472b6" />
      <path d="M18 26 Q24 32 30 26" stroke="#ec4899" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#dbeafe" />
      <rect x="16" y="8" width="16" height="32" rx="3" fill="#3b82f6" />
      <rect x="17.5" y="10" width="13" height="22" rx="1.5" fill="#93c5fd" />
      <circle cx="24" cy="36" r="1.5" fill="#bfdbfe" />
      <rect x="21" y="9" width="6" height="1.5" rx="0.75" fill="#1d4ed8" />
    </svg>
  ),
  Wellness: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#d1fae5" />
      <path d="M24 12 L26 18 L32 18 L27 22 L29 28 L24 24 L19 28 L21 22 L16 18 L22 18 Z" fill="#10b981" />
      <circle cx="24" cy="32" r="4" fill="#34d399" />
      <path d="M20 34 L28 34" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  BodyCare: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#fef3c7" />
      <rect x="18" y="14" width="12" height="18" rx="6" fill="#f59e0b" />
      <ellipse cx="24" cy="13" rx="4" ry="2.5" fill="#fbbf24" />
      <path d="M22 22 Q24 26 26 22" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <circle cx="24" cy="34" r="2" fill="#fcd34d" />
    </svg>
  ),
  Sunscreen: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#fff7ed" />
      <circle cx="24" cy="24" r="8" fill="#fb923c" />
      <circle cx="24" cy="24" r="5" fill="#fed7aa" />
      {[0,45,90,135,180,225,270,315].map((deg, i) => (
        <line key={i}
          x1={24 + 10 * Math.cos((deg * Math.PI) / 180)}
          y1={24 + 10 * Math.sin((deg * Math.PI) / 180)}
          x2={24 + 13 * Math.cos((deg * Math.PI) / 180)}
          y2={24 + 13 * Math.sin((deg * Math.PI) / 180)}
          stroke="#fb923c" strokeWidth="2" strokeLinecap="round"
        />
      ))}
    </svg>
  ),
  Serum: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#ede9fe" />
      <rect x="20" y="16" width="8" height="18" rx="4" fill="#8b5cf6" />
      <rect x="21" y="12" width="6" height="5" rx="1" fill="#7c3aed" />
      <circle cx="24" cy="12" r="2" fill="#c4b5fd" />
      <path d="M22 24 Q24 28 26 24" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  NaturalOil: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#dcfce7" />
      <path d="M24 12 C20 16 16 20 16 26 C16 31.5 19.5 36 24 36 C28.5 36 32 31.5 32 26 C32 20 28 16 24 12Z" fill="#16a34a" />
      <path d="M24 18 C22 21 20 23 20 26 C20 28.8 21.8 31 24 31" stroke="#86efac" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  Gift: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#fce7f3" />
      <rect x="14" y="22" width="20" height="14" rx="2" fill="#ec4899" />
      <rect x="13" y="18" width="22" height="6" rx="2" fill="#f472b6" />
      <path d="M24 18 L24 36" stroke="#fce7f3" strokeWidth="2"/>
      <path d="M14 21 L34 21" stroke="#fce7f3" strokeWidth="1.5"/>
      <path d="M24 18 C24 18 20 14 22 12 C24 10 24 15 24 18Z" fill="#be185d"/>
      <path d="M24 18 C24 18 28 14 26 12 C24 10 24 15 24 18Z" fill="#be185d"/>
    </svg>
  ),
  EyeCare: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#e0f2fe" />
      <path d="M12 24 C16 18 20 15 24 15 C28 15 32 18 36 24 C32 30 28 33 24 33 C20 33 16 30 12 24Z" fill="#38bdf8" />
      <circle cx="24" cy="24" r="6" fill="#0284c7" />
      <circle cx="24" cy="24" r="3" fill="#0c4a6e" />
      <circle cx="22" cy="22" r="1.5" fill="#fff" />
    </svg>
  ),
  Cleanser: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#f0fdfa" />
      <rect x="18" y="16" width="12" height="20" rx="5" fill="#14b8a6" />
      <rect x="19" y="12" width="10" height="5" rx="1.5" fill="#0d9488" />
      <path d="M22 24 Q24 28 26 24" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <circle cx="28" cy="20" r="2" fill="#5eead4" />
      <circle cx="20" cy="30" r="1.5" fill="#5eead4" />
    </svg>
  ),
  Brightening: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#fefce8" />
      <circle cx="24" cy="24" r="8" fill="#eab308" />
      {[0,60,120,180,240,300].map((deg, i) => (
        <line key={i}
          x1={24 + 9.5 * Math.cos((deg * Math.PI) / 180)}
          y1={24 + 9.5 * Math.sin((deg * Math.PI) / 180)}
          x2={24 + 13 * Math.cos((deg * Math.PI) / 180)}
          y2={24 + 13 * Math.sin((deg * Math.PI) / 180)}
          stroke="#fde047" strokeWidth="2.5" strokeLinecap="round"
        />
      ))}
    </svg>
  ),
  AntiAging: () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="24" cy="24" r="20" fill="#fdf4ff" />
      <circle cx="24" cy="22" r="9" fill="#d946ef" />
      <path d="M18 20 Q24 16 30 20" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M20 24 Q24 28 28 24" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M22 34 Q24 38 26 34" stroke="#c026d3" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  // Trust bar icons
  Delivery: () => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <rect x="1" y="10" width="20" height="14" rx="2" fill="#0f3f2f"/>
      <path d="M21 14 L29 14 L31 20 L31 24 L21 24 Z" fill="#1b5e4a"/>
      <circle cx="7" cy="25" r="3" fill="#c8a75a" stroke="#fff" strokeWidth="1"/>
      <circle cx="25" cy="25" r="3" fill="#c8a75a" stroke="#fff" strokeWidth="1"/>
      <path d="M1 16 L21 16" stroke="#c8a75a" strokeWidth="1" strokeDasharray="3 2"/>
    </svg>
  ),
  Authentic: () => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <circle cx="16" cy="16" r="14" fill="#0f3f2f"/>
      <circle cx="16" cy="16" r="10" fill="#1b5e4a"/>
      <path d="M10 16 L14 20 L22 12" stroke="#c8a75a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Returns: () => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <path d="M6 16 A10 10 0 1 1 16 26" stroke="#0f3f2f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M6 10 L6 16 L12 16" stroke="#0f3f2f" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 10 L16 16 L20 20" stroke="#c8a75a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <rect x="7" y="15" width="18" height="13" rx="3" fill="#0f3f2f"/>
      <path d="M11 15 L11 10 A5 5 0 0 1 21 10 L21 15" stroke="#0f3f2f" strokeWidth="2.5" fill="none"/>
      <circle cx="16" cy="21" r="2.5" fill="#c8a75a"/>
      <path d="M16 21 L16 24" stroke="#c8a75a" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  GiftBox: () => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <rect x="4" y="14" width="24" height="16" rx="2" fill="#0f3f2f"/>
      <rect x="3" y="10" width="26" height="6" rx="2" fill="#1b5e4a"/>
      <path d="M16 10 L16 30" stroke="#c8a75a" strokeWidth="2"/>
      <path d="M4 13 L28 13" stroke="#c8a75a" strokeWidth="1.5"/>
      <path d="M16 10 C16 10 12 6 14 4 C16 2 16 7 16 10Z" fill="#c8a75a"/>
      <path d="M16 10 C16 10 20 6 18 4 C16 2 16 7 16 10Z" fill="#c8a75a"/>
    </svg>
  ),
  // Misc
  Cart: () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <path d="M6 2 L3 6 L3 20 A2 2 0 0 0 5 22 L19 22 A2 2 0 0 0 21 20 L21 6 L18 2 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 6 L21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 10 A4 4 0 0 1 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Heart: ({ filled }: { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" fill={filled ? "#e53e3e" : "none"} xmlns="http://www.w3.org/2000/svg" width="14" height="14">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={filled ? "#e53e3e" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg" width="10" height="10">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Lightning: () => (
    <svg viewBox="0 0 24 24" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M5 12 L19 12 M13 6 L19 12 L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
  Mail: () => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <rect x="2" y="6" width="28" height="20" rx="3" fill="rgba(255,255,255,0.2)"/>
      <path d="M2 9 L16 18 L30 9" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  ProductFallback: () => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <rect x="10" y="20" width="60" height="50" rx="6" fill="#e7e5e4"/>
      <rect x="24" y="8" width="32" height="20" rx="4" fill="#d6d3d1"/>
      <circle cx="40" cy="46" r="12" fill="#a8a29e"/>
      <path d="M33 46 L40 52 L47 46" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// Real product photos from Unsplash (free to use, no attribution required)
const NAV_CATS = [
  {
    label: "Skincare",
    href: "/store?category=moisturizer",
    img: "https://images.unsplash.com/photo-1591130901921-3f0652bb3915?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Skincare moisturizer bottles",
  },
  {
    label: "Phones",
    href: "/store?main_cat=phones",
    img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Smartphone",
  },
  {
    label: "Wellness",
    href: "/store?category=collagen",
    img: "https://images.unsplash.com/photo-1616750819456-5cdee9b85d22?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Wellness supplements",
  },
  {
    label: "Body Care",
    href: "/store?category=body_lotion",
    img: "https://images.unsplash.com/photo-1629380108599-ea06489d66f5?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Body lotion bottles",
  },
  {
    label: "Sunscreen",
    href: "/store?category=sunscreen",
    img: "https://images.unsplash.com/photo-1638609927040-8a7e97cd9d6a?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Sunscreen tube",
  },
  {
    label: "Serums",
    href: "/store?category=serum",
    img: "https://images.unsplash.com/photo-1679394270597-e90694d70350?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Face serum bottle",
  },
  {
    label: "Natural Oils",
    href: "/store?category=herbal_oils",
    img: "https://images.unsplash.com/photo-1613803745799-ba6c10aace85?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Natural oil bottles",
  },
  {
    label: "Gift Sets",
    href: "/store?sort=discount",
    img: "https://images.unsplash.com/photo-1567721913486-6585f069b332?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Luxury gift set",
  },
  {
    label: "Eye Care",
    href: "/store?category=eye_mask",
    img: "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Eye care product",
  },
  {
    label: "Cleansers",
    href: "/store?category=face_wash",
    img: "https://images.unsplash.com/photo-1571782742478-0816a4773a10?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Face cleanser tubes",
  },
  {
    label: "Brightening",
    href: "/store?category=skin_brightening",
    img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Brightening skincare product",
  },
  {
    label: "Anti-Aging",
    href: "/store?category=anti_wrinkles",
    img: "https://images.unsplash.com/photo-1670615119585-3585bc6a0fc6?fm=jpg&q=80&w=200&h=200&fit=crop",
    alt: "Anti-aging cream",
  },
];

// ═══════════════════════════════════════════════════════════════
//  SCROLL BUTTON
// ═══════════════════════════════════════════════════════════════
function ScrollBtn({ dir, onClick, extraStyle }: { dir: "l" | "r"; onClick: () => void; extraStyle?: React.CSSProperties }) {
  return (
    <button onClick={onClick} aria-label={dir === "l" ? "Scroll left" : "Scroll right"}
      style={{ position: "absolute", [dir === "l" ? "left" : "right"]: 0, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 38, height: 38, borderRadius: "50%", background: "white", border: "1px solid var(--gray-300)", boxShadow: "0 2px 12px rgba(0,0,0,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "auto", transition: "box-shadow 0.2s, transform 0.2s", ...extraStyle }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.18)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)"; }}
    >
      {dir === "l" ? <Icons.ChevronLeft /> : <Icons.ChevronRight />}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ANNOUNCEMENT BAR
// ═══════════════════════════════════════════════════════════════
function AnnouncementBar() {
  const msgs = [
    "Free delivery on orders over M500",
    "100% authentic products — guaranteed",
    "Secure payment & encrypted checkout",
    "Premium gift wrapping available",
    "Easy 7-day returns & exchanges",
    "Lesotho's finest luxury boutique",
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => { const id = setInterval(() => setIdx(i => (i + 1) % msgs.length), 3_500); return () => clearInterval(id); }, []);
  return (
    <div style={{ background: "linear-gradient(90deg, var(--primary-dark), var(--primary), var(--primary-light))", color: "white", height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, overflow: "hidden", position: "relative" }}>
      {msgs.map((m, i) => (
        <span key={i} style={{ position: "absolute", display: "flex", alignItems: "center", gap: 8, opacity: i === idx ? 1 : 0, transform: i === idx ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.5s ease, transform 0.5s ease", whiteSpace: "nowrap" }}>
          <svg width="6" height="6" viewBox="0 0 12 12" fill="#c8a75a"><circle cx="6" cy="6" r="6"/></svg>
          {m}
          <svg width="6" height="6" viewBox="0 0 12 12" fill="#c8a75a"><circle cx="6" cy="6" r="6"/></svg>
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CATEGORY NAV STRIP — real product photos from Unsplash
// ═══════════════════════════════════════════════════════════════
function CategoryNav() {
  return (
    <div style={{ background: "white", borderBottom: "1px solid var(--gray-200)", padding: "14px 0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 6 }}>
          {NAV_CATS.map(c => (
            <Link key={c.href} href={c.href}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "10px 6px", borderRadius: 12, textDecoration: "none", transition: "background 0.2s, transform 0.2s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "var(--gray-50)"; el.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.transform = "none"; }}
            >
              <div style={{ width: 64, height: 64, borderRadius: 16, overflow: "hidden", boxShadow: "0 3px 12px rgba(0,0,0,0.12)", border: "2px solid var(--gray-100)", flexShrink: 0 }}>
                <img
                  src={c.img}
                  alt={c.alt}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.35s ease" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.12)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-700)", textAlign: "center", lineHeight: 1.2, letterSpacing: 0.1 }}>{c.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HERO BANNER
// ═══════════════════════════════════════════════════════════════
const HERO_SLIDES = [
  { tag: "New Collection", headline: "Elevate Your\nStyle Game", sub: "Premium fashion curated for Lesotho's finest", cta: "Shop Now", ctaLink: "/store?main_cat=beauty", bg: "linear-gradient(135deg,#0a2a1f 0%,#0f3f2f 45%,#1b5e4a 100%)", accent: "#c8a75a" },
  { tag: "Flash Deals",    headline: "Up to 60% Off\nTop Brands",   sub: "Limited time — grab the best deals before they're gone", cta: "View Deals",  ctaLink: "/store?sort=discount",   bg: "linear-gradient(135deg,#7f1d1d,#b91c1c,#ef4444)", accent: "#fde68a" },
  { tag: "Beauty Picks",   headline: "Glow Up With\nPremium Skincare", sub: "Authentic beauty products from world-class brands", cta: "Shop Beauty", ctaLink: "/store?main_cat=beauty", bg: "linear-gradient(135deg,#4a1772,#7c3aed,#a855f7)", accent: "#fce7f3" },
];

function HeroBanner({ products }: { products: HP[] }) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [animIn, setAnimIn] = useState(true);
  const featured = products.slice(0, 4);

  const goTo = useCallback((i: number) => {
    setAnimIn(false);
    setTimeout(() => { setSlide(i); setAnimIn(true); }, 300);
  }, []);
  useEffect(() => {
    const id = setInterval(() => goTo((slide + 1) % HERO_SLIDES.length), 5_500);
    return () => clearInterval(id);
  }, [slide, goTo]);

  const s = HERO_SLIDES[slide];
  return (
    <div style={{ position: "relative", overflow: "hidden", background: s.bg, transition: "background 0.7s ease" }}>
      {/* Decorative blur circles */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(200,167,90,0.08)", filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -40, left: 100, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(30px)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, minHeight: 360, alignItems: "center", position: "relative", zIndex: 1 }}>
        {/* Left: Text */}
        <div style={{ padding: "44px 0", opacity: animIn ? 1 : 0, transform: animIn ? "none" : "translateX(-24px)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: s.accent, fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 20 }}>
            <svg width="6" height="6" viewBox="0 0 12 12" fill={s.accent}><circle cx="6" cy="6" r="6"/></svg>
            {s.tag}
          </div>
          <h1 style={{ color: "white", fontSize: "clamp(30px,4.5vw,54px)", fontWeight: 900, lineHeight: 1.08, marginBottom: 16, letterSpacing: -1.5, whiteSpace: "pre-line" }}>{s.headline}</h1>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginBottom: 32, lineHeight: 1.7, maxWidth: 380 }}>{s.sub}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={s.ctaLink}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: s.accent, color: "#1a1a1a", padding: "14px 30px", borderRadius: 9, fontWeight: 800, fontSize: 14, textDecoration: "none", letterSpacing: 0.3, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.3)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)"; }}
            >{s.cta} <Icons.ArrowRight /></Link>
            <Link href="/store" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", color: "white", padding: "14px 26px", borderRadius: 9, fontWeight: 600, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)", transition: "background 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.2)")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.12)")}
            >Browse All</Link>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 36 }}>
            {HERO_SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{ height: 4, width: i === slide ? 36 : 12, borderRadius: 2, background: i === slide ? s.accent : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", transition: "all 0.35s ease", padding: 0, minHeight: "auto" }} />
            ))}
          </div>
        </div>

        {/* Right: Real product mini-grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, padding: "24px 0", opacity: animIn ? 1 : 0, transform: animIn ? "none" : "translateX(24px)", transition: "opacity 0.5s 0.1s ease, transform 0.5s 0.1s ease" }}>
          {featured.length > 0
            ? featured.map(p => <HeroMiniCard key={p.id} p={p} onClick={() => router.push(`/store/product/${p.id}`)} />)
            : Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimbox" style={{ height: 156, borderRadius: 14 }} />)
          }
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 44, background: "var(--gray-50)", clipPath: "ellipse(55% 100% at 50% 100%)" }} />
    </div>
  );
}

function HeroMiniCard({ p, onClick }: { p: HP; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
  return (
    <div onClick={onClick} style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "transform 0.25s, box-shadow 0.25s", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "none"; el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"; }}
    >
      {disc && disc >= 5 && (
        <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "#e53e3e", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{disc}%</div>
      )}
      {resolveImg(p.main_image) && !err
        ? <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} onError={() => setErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
        : <div style={{ aspectRatio: "1/1", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.ProductFallback /></div>
      }
      <div style={{ padding: "10px 10px 12px" }}>
        {disc && disc >= 5 && <span style={{ fontSize: 9, fontWeight: 800, color: "#fde68a", display: "block", marginBottom: 3 }}>-{disc}% OFF</span>}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.88)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginTop: 6 }}>{formatCurrency(p.price)}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TRUST BAR — SVG icons
// ═══════════════════════════════════════════════════════════════
function TrustBar() {
  const items = [
    { Icon: Icons.Delivery,   title: "Free Delivery",  sub: "Orders over M500" },
    { Icon: Icons.Authentic,  title: "100% Authentic", sub: "Verified products" },
    { Icon: Icons.Returns,    title: "Easy Returns",   sub: "7-day hassle-free" },
    { Icon: Icons.Lock,       title: "Secure Payment", sub: "Encrypted checkout" },
    { Icon: Icons.GiftBox,    title: "Gift Packaging", sub: "Premium wrapping" },
  ];
  return (
    <div style={{ background: "white", borderTop: "1px solid var(--gray-200)", borderBottom: "1px solid var(--gray-200)", margin: "6px 0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
          {items.map((item, i) => (
            <div key={item.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 16px", borderRight: i < items.length - 1 ? "1px solid var(--gray-200)" : "none", transition: "background 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = "var(--gray-50)")}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "white")}
            >
              <div style={{ flexShrink: 0 }}><item.Icon /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-900)", lineHeight: 1.2 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 2 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PROMO BANNERS — real product images from Unsplash
// ═══════════════════════════════════════════════════════════════
function PromoBanners() {
  const banners = [
    {
      // Skincare: white & gold bottles — confirmed from unsplash page fetch
      img: "https://images.unsplash.com/photo-1591130901921-3f0652bb3915?fm=jpg&q=85&w=600&fit=crop",
      gradientOverlay: "linear-gradient(90deg, rgba(6,78,59,0.97) 0%, rgba(6,78,59,0.92) 52%, rgba(6,78,59,0.4) 75%, transparent 100%)",
      tag: "Beauty", title: "Skincare\nEssentials", sub: "Up to 40% off premium brands",
      href: "/store?main_cat=beauty", accent: "#c8a75a",
    },
    {
      // Phones: black smartphone
      img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?fm=jpg&q=85&w=600&fit=crop",
      gradientOverlay: "linear-gradient(90deg, rgba(30,58,138,0.97) 0%, rgba(30,58,138,0.92) 52%, rgba(30,58,138,0.4) 75%, transparent 100%)",
      tag: "Phones", title: "Latest\nSmartphones", sub: "Top brands at best prices",
      href: "/store?main_cat=phones", accent: "#93c5fd",
    },
    {
      // Wellness: essential oils / natural bottles
      img: "https://images.unsplash.com/photo-1613803745799-ba6c10aace85?fm=jpg&q=85&w=600&fit=crop",
      gradientOverlay: "linear-gradient(90deg, rgba(76,29,149,0.97) 0%, rgba(76,29,149,0.92) 52%, rgba(76,29,149,0.4) 75%, transparent 100%)",
      tag: "Wellness", title: "Health &\nWellness", sub: "Natural & organic products",
      href: "/store?q=wellness", accent: "#e9d5ff",
    },
  ];
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "14px clamp(16px,4vw,40px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {banners.map((b, i) => (
          <Link key={i} href={b.href}
            style={{
              borderRadius: 16, textDecoration: "none", overflow: "hidden",
              position: "relative", height: 180, display: "block",
              transition: "transform 0.28s cubic-bezier(.22,.9,.34,1), box-shadow 0.28s",
              boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 12px 36px rgba(0,0,0,0.22)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.14)"; }}
          >
            {/* Real product photo fills the card */}
            <img
              src={b.img}
              alt={b.tag}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center right", transition: "transform 0.5s ease" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            />
            {/* Gradient overlay so text stays legible */}
            <div style={{ position: "absolute", inset: 0, background: b.gradientOverlay, zIndex: 1 }} />
            {/* Text content */}
            <div style={{ position: "relative", zIndex: 2, padding: "24px 26px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: b.accent, display: "block", marginBottom: 8 }}>{b.tag}</span>
              <h3 style={{ color: "white", fontSize: 22, fontWeight: 900, lineHeight: 1.12, margin: "0 0 8px", whiteSpace: "pre-line", letterSpacing: -0.5, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{b.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, margin: "0 0 18px", lineHeight: 1.45 }}>{b.sub}</p>
              <span style={{ background: b.accent, color: "#1a1a1a", fontSize: 11, fontWeight: 800, padding: "8px 18px", borderRadius: 7, display: "inline-flex", alignItems: "center", gap: 5, width: "fit-content" }}>
                Shop Now <Icons.ArrowRight />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FLASH DEALS
// ═══════════════════════════════════════════════════════════════
function FlashDeals({ products }: { products: HP[] }) {
  const router    = useRouter();
  const countdown = useCountdown(6);
  const rowRef    = useRef<HTMLDivElement>(null);
  const flash     = products.filter(p => (p.discount_pct ?? 0) >= 10 || (p.compare_price && p.compare_price > p.price * 1.1));
  if (flash.length === 0) return null;
  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 700 : -700, behavior: "smooth" });

  return (
    <div style={{ background: "white", margin: "6px 0", padding: "20px 0 8px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, background: "#fef2f2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icons.Lightning />
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 900, color: "#e53e3e", margin: 0, letterSpacing: -0.5 }}>Flash Deals</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 600 }}>Ends in</span>
              {[countdown.h, countdown.m, countdown.s].map((val, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ background: "#e53e3e", color: "white", fontSize: 12, fontWeight: 800, padding: "4px 8px", borderRadius: 5, minWidth: 32, textAlign: "center", fontVariantNumeric: "tabular-nums", boxShadow: "0 2px 6px rgba(229,62,62,0.3)" }}>{String(val).padStart(2, "0")}</span>
                  {i < 2 && <span style={{ color: "#e53e3e", fontWeight: 800, fontSize: 14 }}>:</span>}
                </span>
              ))}
            </div>
          </div>
          <Link href="/store?sort=discount" style={{ fontSize: 12, fontWeight: 700, color: "#e53e3e", textDecoration: "none", border: "1.5px solid #e53e3e", padding: "7px 18px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "#e53e3e"; el.style.color = "white"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.color = "#e53e3e"; }}
          >See All Deals <Icons.ArrowRight /></Link>
        </div>
        <div style={{ position: "relative" }}>
          <ScrollBtn dir="l" onClick={() => scroll("l")} />
          <div ref={rowRef} style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", padding: "4px 2px 12px" }}>
            {flash.slice(0, 14).map(p => <FlashCard key={p.id} p={p} onClick={() => router.push(`/store/product/${p.id}`)} />)}
          </div>
          <ScrollBtn dir="r" onClick={() => scroll("r")} />
        </div>
      </div>
    </div>
  );
}

function FlashCard({ p, onClick }: { p: HP; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
  const sold = useRef(Math.floor(Math.random() * 40 + 10)).current;
  return (
    <div onClick={onClick}
      style={{ width: 168, flexShrink: 0, scrollSnapAlign: "start", background: "white", border: "1px solid var(--gray-200)", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s", position: "relative" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
    >
      {disc && disc >= 5 && (
        <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "#e53e3e", color: "white", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5 }}>-{disc}%</div>
      )}
      {resolveImg(p.main_image) && !err
        ? <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} onError={() => setErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
        : <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.ProductFallback /></div>
      }
      <div style={{ padding: "10px 10px 12px" }}>
        <div style={{ fontSize: 11, color: "var(--gray-700)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 8, minHeight: 30 }}>{p.title}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#e53e3e", marginBottom: 2 }}>{formatCurrency(p.price)}</div>
        {p.compare_price && p.compare_price > p.price && <div style={{ fontSize: 10, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>}
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 5, background: "#fee2e2", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${sold}%`, background: "linear-gradient(90deg,#e53e3e,#f87171)", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 9, color: "#e53e3e", fontWeight: 700, marginTop: 3, display: "block" }}>{sold}% claimed</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MARQUEE
// ═══════════════════════════════════════════════════════════════
function Marquee() {
  const items = ["Free Delivery on Orders over M500","100% Authentic Products","Secure & Encrypted Checkout","7-Day Easy Returns","Premium Gift Packaging","Lesotho's Finest Boutique","New Collections Weekly","Exclusive Member Rewards"];
  return (
    <div style={{ background: "var(--primary)", overflow: "hidden", height: 40, display: "flex", alignItems: "center" }}>
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", whiteSpace: "nowrap", animation: "marquee 30s linear infinite", willChange: "transform" }}>
        {[...items, ...items, ...items, ...items].map((t, i) => (
          <span key={i} style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.8)", padding: "0 28px", display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Star />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CATEGORY IMAGE GRID
// ═══════════════════════════════════════════════════════════════
function CategoryImageGrid() {
  const [depts, setDepts] = useState<DeptCategory[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/categories/departments`)
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => setDepts(Array.isArray(data) ? (data as DeptCategory[]) : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const beauty = depts.find(d => d.key === "beauty");
  const phones = depts.find(d => d.key === "phones");

  return (
    <div style={{ background: "var(--gray-50)" }}>
      {/* Beauty */}
      <div style={{ background: "white", margin: "6px 0", padding: "24px 0 20px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 4, height: 36, background: "var(--primary)", borderRadius: 2 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--primary)", marginBottom: 2 }}>Featured</div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--gray-900)", margin: 0, letterSpacing: -0.4 }}>Beauty &amp; Personal Care</h2>
              </div>
            </div>
            <Link href="/store?main_cat=beauty" style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, border: "1.5px solid var(--primary)", padding: "7px 16px", borderRadius: 20, transition: "background 0.2s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "var(--primary)"; el.style.color = "white"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.color = "var(--primary)"; }}
            >View All <Icons.ArrowRight /></Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 8 }}>
            {!loaded
              ? Array.from({ length: 16 }).map((_, i) => <div key={i} className="shimbox" style={{ height: 110, borderRadius: 10 }} />)
              : (beauty?.subcategories ?? []).slice(0, 16).map(sub => (
                  <Link key={sub.key} href={sub.href} style={{ textDecoration: "none" }}>
                    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--gray-200)", transition: "box-shadow 0.2s, transform 0.2s", background: "white" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-3px)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
                    >
                      {sub.image
                        ? <img src={optimizeImg(resolveImg(sub.image))!} alt={sub.label} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
                        : <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Skincare /></div>
                      }
                      <div style={{ padding: "6px 8px 8px", fontSize: 10, fontWeight: 600, color: "var(--gray-800)", textAlign: "center", lineHeight: 1.2 }}>{sub.label}</div>
                    </div>
                  </Link>
                ))
            }
          </div>
        </div>
      </div>

      {/* Phones */}
      <div style={{ background: "#0d1b2a", margin: "6px 0", padding: "24px 0 20px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 4, height: 36, background: "#3b82f6", borderRadius: 2 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#60a5fa", marginBottom: 2 }}>Electronics</div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "white", margin: 0, letterSpacing: -0.4 }}>Cell Phones &amp; Accessories</h2>
              </div>
            </div>
            <Link href="/store?main_cat=phones" style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", textDecoration: "none", border: "1.5px solid #3b82f6", padding: "7px 16px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4, transition: "background 0.2s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "#3b82f6"; el.style.color = "white"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.color = "#60a5fa"; }}
            >View All <Icons.ArrowRight /></Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min((phones?.subcategories?.length ?? 0) + 1, 8)},1fr)`, gap: 10 }}>
            {!loaded
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimbox" style={{ height: 120, borderRadius: 10 }} />)
              : [...(phones?.subcategories ?? []), { key: "__all", label: "All Phones", href: "/store?main_cat=phones", image: null } as SubCat].map(sub => (
                  <Link key={sub.key} href={sub.href} style={{ textDecoration: "none" }}>
                    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", transition: "background 0.2s, transform 0.2s" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(59,130,246,0.15)"; el.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,0.05)"; el.style.transform = "none"; }}
                    >
                      {sub.image
                        ? <img src={optimizeImg(resolveImg(sub.image))!} alt={sub.label} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
                        : <div style={{ aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Phone /></div>
                      }
                      <div style={{ padding: "6px 8px 8px", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 1.2 }}>{sub.label}</div>
                    </div>
                  </Link>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SECTION CARD
// ═══════════════════════════════════════════════════════════════
function SectionCard({ p, accentColor, onClick }: { p: HP; accentColor: string; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
  return (
    <div onClick={onClick}
      style={{ width: 172, flexShrink: 0, background: "white", border: "1px solid var(--gray-200)", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s", scrollSnapAlign: "start", position: "relative" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
    >
      {disc && disc >= 5 && <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: accentColor, color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{disc}%</div>}
      {!p.in_stock && <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.6)", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-600)", background: "white", border: "1px solid var(--gray-300)", padding: "4px 12px", borderRadius: 4 }}>Sold Out</span></div>}
      {resolveImg(p.main_image) && !err
        ? <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} onError={() => setErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", transition: "transform 0.35s" }} onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")} onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
        : <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.ProductFallback /></div>
      }
      <div style={{ padding: "10px 10px 12px" }}>
        {(p.brand || p.category) && <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: accentColor, marginBottom: 3 }}>{p.brand ?? p.category}</div>}
        <div style={{ fontSize: 12, color: "var(--gray-700)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 32, marginBottom: 6 }}>{p.title}</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gray-900)" }}>{formatCurrency(p.price)}</div>
            {p.compare_price && p.compare_price > p.price && <div style={{ fontSize: 10, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>}
          </div>
          {p.rating && p.rating >= 4 && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Icons.Star />
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-700)" }}>{p.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SECTION ROW
// ═══════════════════════════════════════════════════════════════
function SectionRow({ sec, onProductClick }: { sec: Section; onProductClick: (id: string) => void }) {
  const rowRef  = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const th   = THEME_MAP[sec.theme] ?? THEME_MAP.forest;
  const href = safeViewAll(sec.view_all);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.04 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 700 : -700, behavior: "smooth" });

  return (
    <div ref={wrapRef} style={{ background: "white", margin: "6px 0", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity 0.55s ease, transform 0.55s ease" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px clamp(16px,4vw,40px) 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 4, height: 36, background: th.primary, borderRadius: 2 }} />
            <div>
              {sec.badge && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "white", background: th.primary, padding: "2px 8px", borderRadius: 4, display: "inline-block", marginBottom: 4 }}>{sec.badge}</span>}
              <h2 style={{ fontSize: 17, fontWeight: 900, color: "var(--gray-900)", margin: 0, letterSpacing: -0.3 }}>{sec.title}</h2>
              {sec.subtitle && <p style={{ fontSize: 12, color: "var(--gray-500)", margin: "2px 0 0" }}>{sec.subtitle}</p>}
            </div>
          </div>
          <Link href={href}
            style={{ fontSize: 12, fontWeight: 700, color: th.primary, textDecoration: "none", border: `1.5px solid ${th.primary}`, padding: "7px 16px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4, transition: "background 0.2s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = th.primary; el.style.color = "white"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.color = th.primary; }}
          >View All <Icons.ArrowRight /></Link>
        </div>
      </div>
      <div style={{ position: "relative", maxWidth: 1400, margin: "0 auto" }}>
        <ScrollBtn dir="l" onClick={() => scroll("l")} extraStyle={{ left: "clamp(0px,2vw,20px)" }} />
        <div ref={rowRef} style={{ display: "flex", gap: 2, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", padding: "8px clamp(16px,4vw,40px) 20px" }}>
          {sec.products.map(p => <SectionCard key={p.id} p={p} accentColor={th.primary} onClick={() => onProductClick(p.id)} />)}
          <Link href={href} style={{ width: 136, flexShrink: 0, background: "var(--gray-50)", border: `2px dashed ${th.primary}40`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textDecoration: "none", padding: "20px 12px", scrollSnapAlign: "start", transition: "background 0.2s" }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--gray-100)")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--gray-50)")}
          >
            <div style={{ width: 46, height: 46, borderRadius: "50%", border: `2px solid ${th.primary}`, display: "flex", alignItems: "center", justifyContent: "center", color: th.primary }}>
              <Icons.ArrowRight />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.4 }}>See All<br/>{sec.title}</span>
          </Link>
        </div>
        <ScrollBtn dir="r" onClick={() => scroll("r")} extraStyle={{ right: "clamp(0px,2vw,20px)" }} />
      </div>
    </div>
  );
}

function SkeletonSection() {
  return (
    <div style={{ background: "white", margin: "6px 0", padding: "20px clamp(16px,4vw,40px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="shimbox" style={{ width: 4, height: 36, borderRadius: 2 }} />
          <div><div className="shimbox" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 6 }} /><div className="shimbox" style={{ width: 100, height: 10, borderRadius: 4 }} /></div>
        </div>
        <div className="shimbox" style={{ width: 80, height: 30, borderRadius: 20 }} />
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimbox" style={{ width: 172, height: 258, flexShrink: 0, borderRadius: 12 }} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  JUST FOR YOU
// ═══════════════════════════════════════════════════════════════
function JustForYou({ products }: { products: HP[] }) {
  const router  = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.04 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (products.length === 0) return null;
  const display = showAll ? products : products.slice(0, 20);

  return (
    <div ref={wrapRef} style={{ background: "white", margin: "6px 0", padding: "28px 0", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 4, height: 36, background: "var(--accent)", borderRadius: 2 }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--accent)", marginBottom: 2 }}>Curated For You</div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--gray-900)", margin: 0, letterSpacing: -0.4 }}>Just For You</h2>
            </div>
          </div>
          <Link href="/store" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none", border: "1.5px solid var(--accent)", padding: "7px 16px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4, transition: "background 0.2s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "var(--accent)"; el.style.color = "white"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.color = "var(--accent)"; }}
          >See All <Icons.ArrowRight /></Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(185px,1fr))", gap: 12 }}>
          {display.map((p, i) => {
            const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
            return <JFYCard key={p.id} p={p} disc={disc} delay={Math.min(i, 15) * 40} onClick={() => router.push(`/store/product/${p.id}`)} />;
          })}
        </div>
        {!showAll && products.length > 20 && (
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <button onClick={() => setShowAll(true)}
              style={{ background: "var(--primary)", color: "white", border: "none", padding: "14px 40px", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s, transform 0.2s", letterSpacing: 0.3 }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "var(--primary-dark)"; el.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "var(--primary)"; el.style.transform = "none"; }}
            >Load More Products</button>
          </div>
        )}
      </div>
    </div>
  );
}

function JFYCard({ p, disc, delay, onClick }: { p: HP; disc: number | null; delay: number; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div onClick={onClick}
      style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s", position: "relative", animationDelay: `${delay}ms` }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
    >
      {disc && disc >= 5 && <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "#e53e3e", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{disc}%</div>}
      {!p.in_stock && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.6)", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-600)", background: "white", border: "1px solid var(--gray-300)", padding: "4px 12px", borderRadius: 4 }}>Sold Out</span>
        </div>
      )}
      <button
        style={{ position: "absolute", top: 8, right: 8, zIndex: 4, width: 30, height: 30, borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "auto", padding: 0, transition: "transform 0.2s" }}
        onClick={e => { e.stopPropagation(); setSaved(!saved); }} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)")}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
      >
        <Icons.Heart filled={saved} />
      </button>
      {resolveImg(p.main_image) && !err
        ? <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} onError={() => setErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
        : <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.ProductFallback /></div>
      }
      <div style={{ padding: "10px 12px 14px" }}>
        {p.brand && <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: 0.8, marginBottom: 3 }}>{p.brand}</div>}
        <div style={{ fontSize: 12, color: "var(--gray-700)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 34, marginBottom: 8 }}>{p.title}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gray-900)" }}>{formatCurrency(p.price)}</div>
            {p.compare_price && p.compare_price > p.price && <div style={{ fontSize: 10, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>}
          </div>
          {p.rating && p.rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Icons.Star />
              <span style={{ fontSize: 10, color: "var(--gray-600)", fontWeight: 600 }}>{p.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  NEWSLETTER — no emojis, SVG mail icon
// ═══════════════════════════════════════════════════════════════
function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <div style={{ background: "linear-gradient(135deg,var(--primary-dark) 0%,var(--primary) 50%,var(--primary-light) 100%)", padding: "64px 0", margin: "6px 0", position: "relative", overflow: "hidden" }}>
      {/* Decorative blobs */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(200,167,90,0.07)", filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(30px)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Mail />
          </div>
        </div>
        <h2 style={{ color: "white", fontSize: 28, fontWeight: 900, margin: "0 0 10px", letterSpacing: -0.5 }}>Stay in the loop</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>Subscribe for exclusive deals, new arrivals, and curated style tips from Karabo&apos;s Store.</p>
        {done ? (
          <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12, padding: "18px 28px", color: "white", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#10b981"/><path d="M7 12 L10 15 L17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            You&apos;re subscribed! Watch your inbox for exclusive deals.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, maxWidth: 500, margin: "0 auto" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address"
              style={{ flex: 1, padding: "14px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.2)", fontSize: 14, fontFamily: "inherit", outline: "none", background: "rgba(255,255,255,0.95)", color: "#1a1a1a" }} />
            <button onClick={() => { if (email.includes("@")) setDone(true); }}
              style={{ background: "var(--accent)", color: "#1a1a1a", border: "none", padding: "14px 26px", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "transform 0.2s, box-shadow 0.2s", display: "flex", alignItems: "center", gap: 6 }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "none"; el.style.boxShadow = "none"; }}
            >Subscribe <Icons.ArrowRight /></button>
          </div>
        )}
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 16 }}>No spam, ever. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function HomePage() {
  const router = useRouter();

  const [heroProducts, setHeroProducts] = useState<HP[]>([]);
  const [heroLoad, setHeroLoad] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [secLoad, setSecLoad] = useState(true);
  const [jfyProducts, setJfyProducts] = useState<HP[]>([]);

  useEffect(() => {
    fetch(`${API}/api/products/random?count=20&with_images=true&diverse=true`)
      .then(r => r.ok ? r.json() : { products: [] })
      .then((d: { products?: HP[] }) => setHeroProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setHeroLoad(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.ok ? r.json() : { sections: [] })
      .then((d: { sections?: Section[] }) => setSections(d.sections ?? []))
      .catch(() => {})
      .finally(() => setSecLoad(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/products/random?count=40&with_images=true`)
      .then(r => r.ok ? r.json() : { products: [] })
      .then((d: { products?: HP[] }) => setJfyProducts(d.products ?? []))
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: "var(--gray-50)", minHeight: "100vh" }}>
      <style>{`
        .shimbox{background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      <AnnouncementBar />
      <CategoryNav />
      <HeroBanner products={heroLoad ? [] : heroProducts} />
      <TrustBar />
      <PromoBanners />
      <FlashDeals products={heroProducts} />
      <Marquee />
      <CategoryImageGrid />

      {secLoad ? (
        <><SkeletonSection /><SkeletonSection /><SkeletonSection /></>
      ) : sections.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "white", margin: "6px 0" }}>
          <p style={{ fontSize: 18, color: "var(--gray-400)", fontStyle: "italic" }}>Add products to your store — sections will appear automatically.</p>
        </div>
      ) : (
        sections.map(sec => <SectionRow key={sec.key} sec={sec} onProductClick={id => router.push(`/store/product/${id}`)} />)
      )}

      <JustForYou products={jfyProducts} />
      <Newsletter />
    </div>
  );
}