"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

interface HP {
  id: string; title: string; price: number; compare_price?: number | null;
  discount_pct?: number | null; brand?: string; category?: string;
  rating?: number | null; rating_number?: number | null;
  in_stock: boolean; main_image?: string | null; sales?: number;
}
interface Section {
  key: string; title: string; subtitle: string;
  badge: string | null; theme: string;
  view_all: string; products: HP[];
}

function safeViewAll(raw: string): string {
  try {
    const url = new URL(raw, "http://x");
    const search = url.searchParams.get("search");
    const category = url.searchParams.get("category");
    const q = url.searchParams.get("q");
    const sort = url.searchParams.get("sort");
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    return `/store${params.toString() ? "?" + params.toString() : ""}`;
  } catch { return "/store"; }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const THEME_MAP: Record<string, { primary: string; glow: string }> = {
  red:    { primary: "#c0392b", glow: "rgba(192,57,43,0.15)" },
  green:  { primary: "#0f3f2f", glow: "rgba(15,63,47,0.15)" },
  gold:   { primary: "#b8860b", glow: "rgba(184,134,11,0.15)" },
  forest: { primary: "#1b5e4a", glow: "rgba(27,94,74,0.15)" },
  navy:   { primary: "#1a3a6b", glow: "rgba(26,58,107,0.15)" },
  plum:   { primary: "#6b1f7c", glow: "rgba(107,31,124,0.15)" },
  teal:   { primary: "#00695c", glow: "rgba(0,105,92,0.15)" },
  rust:   { primary: "#a0390f", glow: "rgba(160,57,15,0.15)" },
  slate:  { primary: "#2c3e50", glow: "rgba(44,62,80,0.15)" },
  olive:  { primary: "#4a6741", glow: "rgba(74,103,65,0.15)" },
  rose:   { primary: "#8e1a4a", glow: "rgba(142,26,74,0.15)" },
  indigo: { primary: "#2d3561", glow: "rgba(45,53,97,0.15)" },
  amber:  { primary: "#9a4400", glow: "rgba(154,68,0,0.15)" },
  sage:   { primary: "#3d6b52", glow: "rgba(61,107,82,0.15)" },
  stone:  { primary: "#4a3728", glow: "rgba(74,55,40,0.15)" },
};

/* ══════════════════════════════════════════════
   HERO CARD — contained, no overflow
══════════════════════════════════════════════ */
function HeroCard({ p, size = "normal", onClick, index = 0, visible: isVisible }: {
  p: HP; size?: "large" | "normal"; onClick: () => void; index?: number; visible?: boolean;
}) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price
    ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);

  return (
    <div
      className={`hcard hcard-${size}`}
      onClick={onClick}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : "scale(0.97)",
        // ✅ FIX: staggered fade-in on each rotation, not just mount
        transition: `opacity 0.55s ease ${index * 80}ms, transform 0.55s ease ${index * 80}ms`,
      }}
    >
      {/* ✅ FIX: hcard-inner is position:relative with overflow:hidden to contain everything */}
      <div className="hcard-inner">
        {p.main_image && !err ? (
          <div className="hcard-img-box">
            <img
              src={p.main_image}
              alt={p.title}
              className="hcard-img"
              onError={() => setErr(true)}
              loading="eager"
            />
          </div>
        ) : (
          <div className="hcard-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Gradient overlay — always present so text is always legible */}
        <div className="hcard-gradient" />

        {/* Badges */}
        {disc && disc >= 5 && (
          <div className="hcard-badges">
            <span className="badge-off">-{disc}%</span>
          </div>
        )}

        {/* Bottom info — absolutely positioned inside hcard-inner */}
        <div className="hcard-info">
          {(p.category || p.brand) && (
            <div className="hcard-cat">{p.brand ?? p.category}</div>
          )}
          <div className="hcard-title">{p.title}</div>
          <div className="hcard-price-row">
            <span className="hcard-price">{formatCurrency(p.price)}</span>
            {p.compare_price && p.compare_price > p.price && (
              <span className="hcard-old">{formatCurrency(p.compare_price)}</span>
            )}
            {p.rating && p.rating >= 4 && (
              <span className="hcard-star">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#f5c842" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {p.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Hover CTA */}
        <div className="hcard-cta">
          <span>View Product</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SECTION PRODUCT CARD
══════════════════════════════════════════════ */
function SectionCard({ p, idx, accentColor, onClick }: {
  p: HP; idx: number; accentColor: string; onClick: () => void;
}) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price
    ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);

  return (
    <div
      className="scard"
      onClick={onClick}
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      <div className="scard-img-wrap">
        {p.main_image && !err ? (
          <img
            src={p.main_image}
            alt={p.title}
            className="scard-img"
            onError={() => setErr(true)}
            loading="lazy"
          />
        ) : (
          <div className="scard-no-img">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}
        {disc && disc >= 5 && (
          <div className="scard-badge" style={{ background: "#c0392b" }}>-{disc}%</div>
        )}
        {!p.in_stock && (
          <div className="scard-soldout">Sold Out</div>
        )}
        <div className="scard-hover-overlay">
          <div className="scard-view-btn" style={{ background: accentColor }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Quick View
          </div>
        </div>
      </div>

      <div className="scard-info">
        {(p.brand || p.category) && (
          <div className="scard-brand" style={{ color: accentColor }}>{p.brand ?? p.category}</div>
        )}
        <div className="scard-title">{p.title}</div>
        <div className="scard-footer">
          <div className="scard-prices">
            <span className="scard-price">{formatCurrency(p.price)}</span>
            {p.compare_price && p.compare_price > p.price && (
              <span className="scard-compare">{formatCurrency(p.compare_price)}</span>
            )}
          </div>
          {p.rating && p.rating > 0 && (
            <div className="scard-rating">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="9" height="9" viewBox="0 0 24 24"
                  fill={i < Math.round(p.rating!) ? "#c8a75a" : "#e0e0e0"} stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SECTION ROW
══════════════════════════════════════════════ */
function SectionRow({ sec, onProductClick }: {
  sec: Section; onProductClick: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const th = THEME_MAP[sec.theme] ?? THEME_MAP.forest;
  const href = safeViewAll(sec.view_all);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.04 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scroll = (dir: "l" | "r") =>
    rowRef.current?.scrollBy({ left: dir === "r" ? 680 : -680, behavior: "smooth" });

  return (
    <div
      ref={ref}
      className="section-block"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(28px)",
        transition: "opacity 0.55s ease, transform 0.55s ease",
      }}
    >
      <div className="section-head">
        <div className="section-head-left">
          <div className="section-accent-bar" style={{ background: th.primary }} />
          <div>
            {sec.badge && (
              <span className="section-badge" style={{ background: th.primary }}>{sec.badge}</span>
            )}
            <div className="section-title">{sec.title}</div>
            <div className="section-sub">{sec.subtitle}</div>
          </div>
        </div>
        <Link href={href} className="view-all-link" style={{ color: th.primary, borderColor: th.primary }}>
          View All
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>

      <div className="section-scroll-wrap">
        <button className="scroll-btn scroll-btn-l" onClick={() => scroll("l")} aria-label="Scroll left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <div ref={rowRef} className="section-scroll">
          {sec.products.map((p, i) => (
            <SectionCard
              key={p.id} p={p} idx={i}
              accentColor={th.primary}
              onClick={() => onProductClick(p.id)}
            />
          ))}
          <Link href={href} className="see-more-card" style={{ borderColor: `${th.primary}40` }}>
            <div className="see-more-circle" style={{ borderColor: th.primary, color: th.primary }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span className="see-more-label">See All<br/>{sec.title}</span>
          </Link>
        </div>

        <button className="scroll-btn scroll-btn-r" onClick={() => scroll("r")} aria-label="Scroll right">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SKELETON SECTION
══════════════════════════════════════════════ */
function SkeletonSection() {
  return (
    <div className="section-block">
      <div className="section-head">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="shimbox" style={{ width: 4, height: 44, borderRadius: 2 }} />
          <div>
            <div className="shimbox" style={{ width: 180, height: 18, borderRadius: 4, marginBottom: 6 }} />
            <div className="shimbox" style={{ width: 120, height: 12, borderRadius: 4 }} />
          </div>
        </div>
        <div className="shimbox" style={{ width: 90, height: 34, borderRadius: 50 }} />
      </div>
      <div style={{ display: "flex", gap: 2, padding: "12px 20px", overflow: "hidden" }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="shimbox" style={{ width: 190, height: 290, flexShrink: 0, borderRadius: 0 }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   HERO SKELETON — matches exact grid layout
══════════════════════════════════════════════ */
function HeroSkeleton() {
  return (
    <>
      {/* large card */}
      <div className="shimbox hcard hcard-large" />
      {/* 4 small cards */}
      <div className="shimbox hcard hcard-normal" />
      <div className="shimbox hcard hcard-normal" />
      <div className="shimbox hcard hcard-normal" />
      <div className="shimbox hcard hcard-normal" />
    </>
  );
}

/* ══════════════════════════════════════════════
   CATEGORY STRIP — loaded dynamically from sections
══════════════════════════════════════════════ */
function CategoryStrip({ sections }: { sections: Section[] }) {
  const cats: { label: string; href: string }[] = [
    { label: "All Products", href: "/store" },
    { label: "Flash Deals", href: "/store?sort=discount" },
    { label: "New Arrivals", href: "/store?sort=newest" },
    { label: "Best Sellers", href: "/store?sort=popular" },
    ...sections
      .filter(s => !["flash_deals","new_arrivals","best_sellers","top_rated"].includes(s.key))
      .map(s => ({
        label: s.title,
        href: safeViewAll(s.view_all),
      })),
  ];

  return (
    <div className="cat-strip">
      <div className="cat-strip-inner">
        {cats.slice(0, 18).map((c, i) => (
          <Link key={i} href={c.href} className="cat-pill">
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TRUST BAR
══════════════════════════════════════════════ */
function TrustBar() {
  const items = [
    {
      title: "Free Delivery", sub: "Orders over M500",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    },
    {
      title: "Authentic Products", sub: "100% verified",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
    },
    {
      title: "Easy Returns", sub: "7-day hassle-free",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 .7-3.6"/></svg>,
    },
    {
      title: "Secure Payment", sub: "Encrypted checkout",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    },
    {
      title: "Gift Packaging", sub: "Premium wrapping",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
    },
  ];

  return (
    <div className="trust-bar">
      {items.map((item) => (
        <div key={item.title} className="trust-item">
          <div className="trust-icon-wrap">{item.icon}</div>
          <div className="trust-text">
            <div className="trust-title">{item.title}</div>
            <div className="trust-sub">{item.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   HERO BANNER
══════════════════════════════════════════════ */
function HeroBanner() {
  return (
    <div className="hero-banner">
      <div className="hero-banner-inner">
        <div className="hero-banner-text">
          <div className="hero-banner-eyebrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#c8a75a" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Karabo Luxury Boutique
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#c8a75a" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div className="hero-banner-headline">Discover Premium Products</div>
          <div className="hero-banner-sub">Curated selections · Unbeatable prices · Authentic always</div>
        </div>
        <Link href="/store" className="hero-shop-btn">
          Shop All Products
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MARQUEE
══════════════════════════════════════════════ */
function Marquee() {
  const items = [
    "Free Delivery on Orders over M500", "100% Authentic Products",
    "Secure & Encrypted Checkout", "7-Day Easy Returns",
    "Premium Gift Packaging", "Lesotho's Finest Boutique",
    "New Collections Weekly", "Exclusive Member Rewards",
  ];
  return (
    <div className="marquee-bar">
      <div className="marquee-track">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="marquee-item">
            <svg width="5" height="5" viewBox="0 0 10 10" fill="#c8a75a" stroke="none">
              <polygon points="5 0 6.12 3.38 9.51 3.45 6.97 5.56 7.94 9 5 7.02 2.06 9 3.03 5.56 0.49 3.45 3.88 3.38"/>
            </svg>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
// ✅ FIX: 6 seconds for a luxurious, calm transition pace
const ROTATE_MS = 6000;

export default function HomePage() {
  const router = useRouter();
  const [pool, setPool]         = useState<HP[]>([]);
  const [offset, setOffset]     = useState(0);
  // ✅ FIX: cardsVisible drives the fade — separate from fading so we can
  //         fade out, swap products, then fade back in cleanly
  const [cardsVisible, setCardsVisible] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [heroLoad, setHeroLoad] = useState(true);
  const [secLoad, setSecLoad]   = useState(true);
  const rotateRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch random hero products with diverse=true so categories are mixed ── */
  useEffect(() => {
    // Exclude all electronics/phone categories — they have plain white bg images
    // that look awkward in a hero grid and were specifically requested to be removed
    const EXCLUDE_KEYWORDS = [
      "phone","smartphone","mobile","iphone","samsung galaxy","redmi","tecno","infinix","itel","oppo","vivo","oneplus","nokia",
      "tablet","ipad","kindle",
      "laptop","notebook","macbook","chromebook","desktop","pc ",
      "charger","cable","power bank","powerbank","adapter",
      "earphone","earbuds","airpods","earpods","headphone","speaker","soundbar",
      "smartwatch","smart watch","fitness tracker","smart band",
      "camera","dslr","mirrorless","gopro",
      "television","smart tv","led tv","monitor","projector",
      "playstation","xbox","nintendo","game console","gaming",
    ];
    function isHeroWorthy(p: HP): boolean {
      if (!p.main_image) return false;
      const haystack = [p.category, p.title, (p as any).main_category]
        .filter(Boolean).join(" ").toLowerCase();
      return !EXCLUDE_KEYWORDS.some(kw => haystack.includes(kw));
    }

    async function fetchPool() {
      try {
        // diverse=true ensures one product per category before filling remaining slots
        const res = await fetch(`${API}/api/products/random?count=120&with_images=true&diverse=true`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const filtered = (data.products ?? []).filter(isHeroWorthy);
        // If too few after filtering, relax and just require images
        setPool(filtered.length >= 5 ? filtered : (data.products ?? []).filter((p: HP) => p.main_image));
      } catch {
        try {
          const res = await fetch(`${API}/api/products?per_page=120&in_stock=true`);
          const data = await res.json();
          const all = (data.results ?? []).filter((p: HP) => p.main_image);
          const filtered = all.filter(isHeroWorthy);
          setPool(shuffle(filtered.length >= 5 ? filtered : all));
        } catch {}
      } finally {
        setHeroLoad(false);
      }
    }
    fetchPool();
  }, []);

  /* ── Auto-rotate with clean fade transition ── */
  useEffect(() => {
    if (pool.length < 5) return;
    rotateRef.current = setInterval(() => {
      // Step 1: fade out
      setCardsVisible(false);
      setTimeout(() => {
        // Step 2: swap to next group
        setOffset(prev => {
          const next = prev + 5;
          return next + 5 > pool.length ? 0 : next;
        });
        // Step 3: fade in
        setTimeout(() => setCardsVisible(true), 60);
      }, 450); // wait for fade-out to complete
    }, ROTATE_MS);
    return () => { if (rotateRef.current) clearInterval(rotateRef.current); };
  }, [pool.length]);

  /* ── Fetch sections — categories are automatic from available products ── */
  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.json())
      .then(d => setSections(d.sections ?? []))
      .catch(() => setSections([]))
      .finally(() => setSecLoad(false));
  }, []);

  // ✅ FIX: visible is always exactly 5 unique products (from diverse pool)
  const visible   = pool.length >= 5 ? pool.slice(offset, offset + 5) : [];
  const heroBig   = visible[0] as HP | undefined;
  const heroSmall = visible.slice(1, 5) as HP[];
  const totalDots = Math.min(Math.ceil(pool.length / 5), 12);

  return (
    <div className="page-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --primary:#0f3f2f;--primary-dark:#0a2a1f;--primary-light:#1b5e4a;
          --gold:#c8a75a;--gold-light:#d4b976;
          --text:#1a1a1a;--text-muted:#64655e;--text-light:#9e9d97;
          --border:#e5e3de;--bg:#f7f6f3;--white:#ffffff;
          --shadow-sm:0 1px 4px rgba(0,0,0,0.07);
          --shadow-md:0 4px 16px rgba(0,0,0,0.08);
          --shadow-lg:0 8px 32px rgba(0,0,0,0.10);
        }
        ::-webkit-scrollbar{width:4px;height:3px}
        ::-webkit-scrollbar-thumb{background:var(--primary);border-radius:4px}
        ::-webkit-scrollbar-track{background:transparent}

        @keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}

        .shimbox{
          background:linear-gradient(90deg,#ebebea 0%,#d9d8d5 50%,#ebebea 100%);
          background-size:200% 100%;animation:shimmer 1.6s ease-in-out infinite;
        }

        .page-root{
          min-height:100vh;
          background:var(--bg);
          font-family:'DM Sans',system-ui,sans-serif;
          color:var(--text);
        }

        /* ── HERO BANNER ─────────────────── */
        .hero-banner{
          background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 60%,#061a10 100%);
          position:relative;overflow:hidden;
        }
        .hero-banner::before{
          content:'';position:absolute;inset:0;
          background:radial-gradient(ellipse at 70% 50%,rgba(200,167,90,0.12) 0%,transparent 60%);
          pointer-events:none;
        }
        .hero-banner-inner{
          max-width:1500px;margin:0 auto;
          padding:18px clamp(16px,3vw,40px);
          display:flex;align-items:center;justify-content:space-between;
          gap:20px;flex-wrap:wrap;position:relative;z-index:1;
        }
        .hero-banner-text{display:flex;flex-direction:column;gap:4px;}
        .hero-banner-eyebrow{
          display:flex;align-items:center;gap:7px;
          font-size:11px;font-weight:500;color:var(--gold);
          letter-spacing:1.5px;text-transform:uppercase;
        }
        .hero-banner-headline{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(20px,3vw,28px);font-weight:600;
          color:#fff;letter-spacing:-0.3px;line-height:1.2;
        }
        .hero-banner-sub{
          font-size:12px;color:rgba(255,255,255,0.6);
          font-weight:400;letter-spacing:0.2px;
        }
        .hero-shop-btn{
          display:inline-flex;align-items:center;gap:8px;
          background:var(--gold);color:#fff;
          padding:11px 24px;border-radius:4px;
          font-size:13px;font-weight:700;
          text-decoration:none;letter-spacing:0.3px;
          white-space:nowrap;flex-shrink:0;
          transition:all 0.2s ease;
          box-shadow:0 2px 12px rgba(200,167,90,0.4);
        }
        .hero-shop-btn:hover{
          background:#b8973e;transform:translateY(-1px);
          box-shadow:0 4px 20px rgba(200,167,90,0.5);
        }
        .hero-shop-btn svg{transition:transform 0.2s ease;}
        .hero-shop-btn:hover svg{transform:translateX(3px);}

        /* ════════════════════════════════════
           HERO GRID
           ✅ FIX: Self-contained grid — fixed height, overflow hidden,
           no content can escape or obstruct other elements.
           5 cards: 1 large (spans 2 rows) + 4 small in 2×2 right panel
        ════════════════════════════════════ */
        .hero-grid{
          display:grid;
          grid-template-columns:2fr 1fr 1fr;
          grid-template-rows:220px 180px;
          gap:2px;
          background:#e5e3de;
          height:403px;
          overflow:hidden;
        }
        @media(max-width:1100px){
          .hero-grid{
            grid-template-columns:1fr 1fr;
            grid-template-rows:240px 180px;
            height:423px;
          }
        }
        @media(max-width:640px){
          .hero-grid{
            grid-template-columns:1fr 1fr;
            grid-template-rows:200px 160px 160px;
            height:523px;
          }
        }

        /* Every card fills its grid cell exactly */
        .hcard{
          position:relative;
          overflow:hidden;
          cursor:pointer;
          background:#ffffff;
          width:100%;
          height:100%;
          display:block;
        }
        /* Large card spans full left column (both rows) */
        .hcard-large{
          grid-column:1;
          grid-row:1 / span 2;
        }
        @media(max-width:1100px){
          .hcard-large{grid-column:span 2;grid-row:1;}
        }
        @media(max-width:640px){
          .hcard-large{grid-column:span 2;grid-row:1;}
        }
        .hcard-normal{
          grid-column:auto;
          grid-row:auto;
        }

        /* hcard-inner fills 100% and is the stacking context */
        .hcard-inner{
          position:relative;
          width:100%;
          height:100%;
          overflow:hidden;
          background:#ffffff;
        }
        /* image wrapper — centres product in white box, no cropping ever */
        .hcard-img-box{
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:10px;
          transition:transform 0.6s cubic-bezier(0.2,0.8,0.3,1);
        }
        .hcard:hover .hcard-img-box{transform:scale(1.04);}
        .hcard-img{
          width:100%;
          height:100%;
          object-fit:contain;
          object-position:center;
          display:block;
        }
        .hcard-empty{
          width:100%;height:100%;
          display:flex;align-items:center;justify-content:center;
          background:#f4f3f0;
        }
        .hcard-gradient{
          position:absolute;inset:0;
          background:linear-gradient(to top,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.35) 28%,transparent 52%);
          z-index:2;
          pointer-events:none;
        }
        .hcard-badges{
          position:absolute;top:10px;left:10px;z-index:4;
        }
        .badge-off{
          display:inline-flex;align-items:center;gap:4px;
          background:#c0392b;color:#fff;
          font-size:9px;font-weight:800;
          padding:3px 8px;border-radius:2px;
          letter-spacing:0.3px;
        }
        .hcard-info{
          position:absolute;bottom:0;left:0;right:0;
          padding:12px 14px;z-index:3;
        }
        .hcard-cat{
          font-size:9px;font-weight:600;color:rgba(255,255,255,0.45);
          text-transform:uppercase;letter-spacing:1.5px;
          display:block;margin-bottom:3px;
        }
        .hcard-title{
          font-size:12px;font-weight:600;color:#fff;
          line-height:1.3;margin-bottom:6px;
          display:-webkit-box;-webkit-line-clamp:2;
          -webkit-box-orient:vertical;overflow:hidden;
        }
        .hcard-large .hcard-title{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(14px,2vw,20px);font-weight:600;
          -webkit-line-clamp:3;
        }
        .hcard-price-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
        .hcard-price{font-size:13px;font-weight:800;color:var(--gold);}
        .hcard-large .hcard-price{font-size:16px;}
        .hcard-old{font-size:10px;color:rgba(255,255,255,0.3);text-decoration:line-through;}
        .hcard-star{
          display:inline-flex;align-items:center;gap:3px;
          font-size:10px;color:#f5c842;margin-left:auto;font-weight:600;
        }
        .hcard-cta{
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;gap:7px;
          background:rgba(0,0,0,0.5);
          color:#fff;font-size:12px;font-weight:700;
          letter-spacing:0.5px;
          opacity:0;transition:opacity 0.22s ease;
          z-index:5;
        }
        .hcard:hover .hcard-cta{opacity:1;}

        /* ── HERO DOTS ───────────────────── */
        .hero-dots{
          display:flex;align-items:center;justify-content:center;
          gap:6px;padding:11px 0;background:var(--white);
          border-bottom:1px solid var(--border);
        }
        .hero-dot{
          border:none;cursor:pointer;border-radius:3px;
          background:var(--border);transition:all 0.3s ease;padding:0;
          height:4px;
        }
        .hero-dot.active{background:var(--primary);}

        /* ── MARQUEE ─────────────────────── */
        .marquee-bar{
          background:linear-gradient(90deg,var(--primary),var(--primary-light));
          overflow:hidden;padding:0;
        }
        .marquee-track{
          display:flex;width:300%;
          animation:marquee 36s linear infinite;
        }
        .marquee-item{
          display:inline-flex;align-items:center;gap:9px;
          padding:9px 24px;white-space:nowrap;flex-shrink:0;
          font-size:10px;font-weight:600;letter-spacing:1px;
          text-transform:uppercase;color:rgba(255,255,255,0.9);
        }

        /* ── TRUST BAR ───────────────────── */
        .trust-bar{
          background:var(--white);
          border-top:1px solid var(--border);
          border-bottom:3px solid var(--border);
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
        }
        .trust-item{
          display:flex;align-items:center;gap:12px;
          padding:18px 20px;
          border-right:1px solid var(--border);
        }
        .trust-item:last-child{border-right:none;}
        .trust-icon-wrap{color:var(--primary);flex-shrink:0;}
        .trust-title{font-size:12px;font-weight:700;color:var(--text);margin-bottom:1px;}
        .trust-sub{font-size:11px;color:var(--text-muted);}

        /* ── CATEGORY STRIP ──────────────── */
        .cat-strip{
          background:var(--white);
          border-bottom:1px solid var(--border);
          overflow-x:auto;padding:0 clamp(12px,3vw,40px);
        }
        .cat-strip::-webkit-scrollbar{height:0;}
        .cat-strip-inner{
          display:flex;gap:6px;padding:12px 0;
          white-space:nowrap;align-items:center;
        }
        .cat-pill{
          display:inline-flex;align-items:center;gap:5px;
          padding:7px 16px;border-radius:3px;
          border:1px solid var(--border);
          background:var(--white);
          font-size:12px;font-weight:500;
          color:var(--text-muted);
          text-decoration:none;flex-shrink:0;
          transition:all 0.18s ease;letter-spacing:0.1px;
        }
        .cat-pill:hover{
          border-color:var(--primary);
          color:var(--primary);background:#f0f7f4;
        }

        /* ── SECTIONS ────────────────────── */
        .sections-wrap{padding-bottom:clamp(32px,5vw,64px);}
        .section-block{background:var(--white);margin-bottom:6px;}
        .section-head{
          display:flex;align-items:center;justify-content:space-between;
          padding:18px clamp(16px,3vw,28px) 14px;
          border-bottom:1px solid var(--border);
        }
        .section-head-left{display:flex;align-items:center;gap:14px;}
        .section-accent-bar{width:4px;height:42px;border-radius:2px;flex-shrink:0;}
        .section-badge{
          display:inline-block;
          font-size:8px;font-weight:800;
          padding:3px 9px;border-radius:2px;
          color:#fff;letter-spacing:1px;text-transform:uppercase;
          margin-bottom:4px;
        }
        .section-title{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(18px,2.5vw,24px);font-weight:600;
          color:var(--text);letter-spacing:-0.3px;line-height:1.2;
        }
        .section-sub{font-size:11px;color:var(--text-muted);margin-top:2px;}
        .view-all-link{
          display:inline-flex;align-items:center;gap:6px;
          font-size:12px;font-weight:700;
          text-decoration:none;
          padding:8px 18px;border-radius:3px;border:1.5px solid;
          transition:all 0.18s ease;white-space:nowrap;
          letter-spacing:0.3px;text-transform:uppercase;
        }
        .view-all-link:hover{color:#fff !important;background:currentColor;}

        .section-scroll-wrap{position:relative;}
        .section-scroll{
          display:flex;gap:2px;overflow-x:auto;
          padding:12px clamp(16px,3vw,28px);
          scroll-behavior:smooth;
          background:var(--bg);
        }
        .section-scroll::-webkit-scrollbar{height:0;}

        .scroll-btn{
          position:absolute;top:50%;transform:translateY(-50%);
          width:32px;height:52px;
          background:var(--white);
          border:1px solid var(--border);
          box-shadow:var(--shadow-md);
          border-radius:2px;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;z-index:10;color:var(--text-muted);
          transition:all 0.18s ease;
        }
        .scroll-btn:hover{background:var(--primary);color:#fff;border-color:var(--primary);}
        .scroll-btn-l{left:0;}
        .scroll-btn-r{right:0;}

        /* ── SECTION CARDS ───────────────── */
        .scard{
          width:190px;flex-shrink:0;
          background:var(--white);
          cursor:pointer;
          border:1px solid transparent;
          transition:all 0.22s ease;
          animation:scaleIn 0.45s ease both;
          position:relative;
        }
        .scard:hover{
          border-color:rgba(15,63,47,0.25);
          box-shadow:0 6px 24px rgba(15,63,47,0.10);
          z-index:2;transform:translateY(-2px);
        }
        .scard-img-wrap{
          position:relative;height:190px;
          background:#f4f3f0;overflow:hidden;
        }
        .scard-img{
          width:100%;height:100%;object-fit:cover;display:block;
          transition:transform 0.45s ease;
        }
        .scard:hover .scard-img{transform:scale(1.07);}
        .scard-no-img{
          width:100%;height:100%;
          display:flex;align-items:center;justify-content:center;
          background:#ece9e4;
        }
        .scard-badge{
          position:absolute;top:8px;left:8px;
          font-size:9px;font-weight:800;
          color:#fff;padding:2px 8px;border-radius:2px;
          z-index:3;letter-spacing:0.3px;
        }
        .scard-soldout{
          position:absolute;top:8px;right:8px;
          font-size:9px;font-weight:600;
          background:rgba(0,0,0,0.6);color:#fff;
          padding:2px 7px;border-radius:2px;z-index:3;
        }
        .scard-hover-overlay{
          position:absolute;inset:0;
          display:flex;align-items:flex-end;justify-content:center;
          padding-bottom:12px;z-index:4;
          opacity:0;transition:opacity 0.22s ease;
        }
        .scard:hover .scard-hover-overlay{opacity:1;}
        .scard-view-btn{
          display:inline-flex;align-items:center;gap:6px;
          color:#fff;font-size:10px;font-weight:700;
          padding:7px 16px;border-radius:2px;
          letter-spacing:0.4px;text-transform:uppercase;
          transform:translateY(6px);transition:transform 0.22s ease;
        }
        .scard:hover .scard-view-btn{transform:translateY(0);}
        .scard-info{padding:10px 12px 14px;}
        .scard-brand{
          font-size:9px;font-weight:700;
          text-transform:uppercase;letter-spacing:0.7px;margin-bottom:4px;
        }
        .scard-title{
          font-size:12px;color:var(--text);line-height:1.4;
          margin-bottom:8px;font-weight:400;
          display:-webkit-box;-webkit-line-clamp:2;
          -webkit-box-orient:vertical;overflow:hidden;min-height:33px;
        }
        .scard-footer{
          display:flex;align-items:flex-end;
          justify-content:space-between;gap:6px;
        }
        .scard-prices{display:flex;flex-direction:column;gap:1px;}
        .scard-price{font-size:14px;font-weight:800;color:var(--text);}
        .scard-compare{font-size:10px;color:var(--text-light);text-decoration:line-through;}
        .scard-rating{display:flex;gap:1px;align-items:center;}

        /* ── SEE MORE CARD ───────────────── */
        .see-more-card{
          width:140px;flex-shrink:0;
          background:var(--white);
          border:2px dashed #d6d4cf;
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          gap:12px;text-decoration:none;
          padding:24px 16px;
          transition:all 0.2s ease;cursor:pointer;
        }
        .see-more-card:hover{background:var(--bg);}
        .see-more-circle{
          width:44px;height:44px;border-radius:50%;
          border:2px solid;
          display:flex;align-items:center;justify-content:center;
        }
        .see-more-label{
          font-size:10px;font-weight:700;
          text-align:center;line-height:1.5;
          text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);
        }

        /* ── EMPTY ───────────────────────── */
        .empty-sections{
          text-align:center;padding:80px 20px;
          background:var(--white);margin:6px 0;
        }
        .empty-sections p{
          font-family:'Cormorant Garamond',serif;
          font-size:20px;color:var(--text-muted);
        }
      `}</style>

      {/* HERO BANNER */}
      <HeroBanner />

      {/* ✅ HERO GRID — self-contained, 5 products, no chaos */}
      <div className="hero-grid">
        {heroLoad ? (
          <HeroSkeleton />
        ) : visible.length >= 5 ? (
          <>
            <HeroCard
              p={heroBig!}
              size="large"
              index={0}
              visible={cardsVisible}
              onClick={() => router.push(`/store/product/${heroBig!.id}`)}
            />
            {heroSmall.map((p, i) => (
              <HeroCard
                key={p.id}
                p={p}
                size="normal"
                index={i + 1}
                visible={cardsVisible}
                onClick={() => router.push(`/store/product/${p.id}`)}
              />
            ))}
          </>
        ) : pool.length > 0 && pool.length < 5 ? (
          /* Fewer than 5 products — show what we have */
          <>
            {pool.map((p, i) => (
              <HeroCard
                key={p.id}
                p={p}
                size={i === 0 ? "large" : "normal"}
                index={i}
                visible={cardsVisible}
                onClick={() => router.push(`/store/product/${p.id}`)}
              />
            ))}
          </>
        ) : (
          /* Pool is still loading or empty */
          <HeroSkeleton />
        )}
      </div>

      {/* ROTATION DOTS */}
      {!heroLoad && pool.length >= 5 && (
        <div className="hero-dots">
          {Array.from({ length: totalDots }).map((_, i) => (
            <button
              key={i}
              className={`hero-dot ${i === Math.floor(offset / 5) ? "active" : ""}`}
              style={{ width: i === Math.floor(offset / 5) ? 24 : 8 }}
              onClick={() => {
                setCardsVisible(false);
                setTimeout(() => {
                  setOffset(i * 5);
                  setTimeout(() => setCardsVisible(true), 60);
                }, 400);
              }}
              aria-label={`Group ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* MARQUEE */}
      <Marquee />

      {/* TRUST BAR */}
      <TrustBar />

      {/* CATEGORY STRIP — automatic from backend sections */}
      {!secLoad && sections.length > 0 && (
        <CategoryStrip sections={sections} />
      )}

      {/* SECTIONS — auto-generated from available products */}
      <div className="sections-wrap">
        {secLoad ? (
          <>
            <SkeletonSection />
            <SkeletonSection />
            <SkeletonSection />
          </>
        ) : sections.length === 0 ? (
          <div className="empty-sections">
            <p>Add products to your store — sections will appear automatically.</p>
          </div>
        ) : (
          sections.map(sec => (
            <SectionRow
              key={sec.key}
              sec={sec}
              onProductClick={id => router.push(`/store/product/${id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}