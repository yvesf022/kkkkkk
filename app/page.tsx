"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { productsApi, categoriesApi } from "@/lib/api";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

/* ================================================================
   TYPES
================================================================ */
type HeroSlide = { products: ProductListItem[]; headline: string; sub: string };

/* ================================================================
   HELPERS
================================================================ */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const HEADLINES = [
  { headline: "Discover Your\nSignature Style", sub: "Curated collections crafted for elegance" },
  { headline: "New Arrivals\nJust Landed", sub: "Fresh styles updated daily" },
  { headline: "The Season's\nBest Picks", sub: "Trending now across all categories" },
  { headline: "Luxury Finds\nAt Every Price", sub: "Premium quality within reach" },
];

const INTERVAL = 7000;

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function HomePage() {
  const router = useRouter();

  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]);
  const [featured, setFeatured] = useState<ProductListItem[]>([]);
  const [trending, setTrending] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Hero state
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  // Individual card animation states [card0..card3]
  const [cardStates, setCardStates] = useState<("idle" | "exit" | "enter")[]>(["idle","idle","idle","idle"]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  /* ---- Load products ---- */
  useEffect(() => {
    async function load() {
      try {
        const first = await productsApi.list({ page: 1, per_page: 40 });
        const total: number = (first as any)?.total ?? 0;
        let all: ProductListItem[] = (first as any)?.results ?? [];

        if (total > 40) {
          const maxPage = Math.min(Math.ceil(total / 40), 5);
          const rndPage = Math.floor(Math.random() * (maxPage - 1)) + 2;
          try {
            const extra = await productsApi.list({ page: rndPage, per_page: 40 });
            all = [...all, ...((extra as any)?.results ?? [])];
          } catch {}
        }

        const s = shuffle(all);
        setAllProducts(s);
        setFeatured(s.slice(0, 8));
        setTrending(s.slice(8, 16));

        // Build 5 slides
        const built: HeroSlide[] = HEADLINES.map((h, i) => ({
          products: s.slice(i * 4, i * 4 + 4),
          ...h,
        })).filter((sl) => sl.products.length === 4);

        setSlides(built);
        setCardStates(["idle","idle","idle","idle"]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ---- Auto-advance slides ---- */
  const advanceSlide = useCallback((dir: "next" | "prev" = "next") => {
    if (animating || slides.length < 2) return;
    setAnimating(true);
    setDirection(dir);

    // Staggered exit: each card exits 80ms after previous
    setCardStates(["exit","idle","idle","idle"]);
    setTimeout(() => setCardStates(["exit","exit","idle","idle"]), 80);
    setTimeout(() => setCardStates(["exit","exit","exit","idle"]), 160);
    setTimeout(() => setCardStates(["exit","exit","exit","exit"]), 240);

    // After exit, switch slide
    setTimeout(() => {
      setSlideIndex((prev) => dir === "next"
        ? (prev + 1) % slides.length
        : (prev - 1 + slides.length) % slides.length
      );
      // Staggered enter
      setCardStates(["enter","idle","idle","idle"]);
      setTimeout(() => setCardStates(["enter","enter","idle","idle"]), 100);
      setTimeout(() => setCardStates(["enter","enter","enter","idle"]), 200);
      setTimeout(() => setCardStates(["enter","enter","enter","enter"]), 300);
      setTimeout(() => {
        setCardStates(["idle","idle","idle","idle"]);
        setAnimating(false);
      }, 700);
    }, 500);
  }, [animating, slides.length]);

  /* ---- Timer ---- */
  useEffect(() => {
    if (slides.length < 2) return;

    startTimeRef.current = Date.now();
    setProgress(0);

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min((elapsed / INTERVAL) * 100, 100));
    }, 50);

    timerRef.current = setInterval(() => {
      startTimeRef.current = Date.now();
      setProgress(0);
      advanceSlide("next");
    }, INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [slides.length, advanceSlide]);

  /* ---- Manual nav ---- */
  function goToSlide(i: number) {
    if (i === slideIndex || animating) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    startTimeRef.current = Date.now();
    setProgress(0);
    advanceSlide(i > slideIndex ? "next" : "prev");
  }

  const currentSlide = slides[slideIndex];

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: "#fafaf8" }}>

      {/* ============================================================
          HERO — CINEMATIC FULL BLEED
      ============================================================ */}
      <section style={{
        position: "relative",
        minHeight: "clamp(420px, 55vh, 620px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "linear-gradient(160deg, #08091a 0%, #0a1845 35%, #003520 100%)",
      }}>

        {/* Animated grain overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
          opacity: 0.6,
        }} />

        {/* Glowing orbs */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{
            position: "absolute", top: "10%", left: "5%",
            width: "clamp(300px, 40vw, 600px)", height: "clamp(300px, 40vw, 600px)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,51,160,0.35) 0%, transparent 70%)",
            filter: "blur(40px)",
            animation: "orbFloat1 12s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: "5%", right: "10%",
            width: "clamp(200px, 30vw, 450px)", height: "clamp(200px, 30vw, 450px)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,149,67,0.3) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "orbFloat2 15s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", top: "40%", right: "20%",
            width: "clamp(150px, 20vw, 300px)", height: "clamp(150px, 20vw, 300px)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)",
            filter: "blur(30px)",
            animation: "orbFloat3 10s ease-in-out infinite",
          }} />
        </div>

        {/* Decorative diagonal rule */}
        <div style={{
          position: "absolute", top: 0, right: "38%",
          width: 1, height: "100%",
          background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.06) 60%, transparent)",
          pointerEvents: "none",
        }} />

        {/* Main content */}
        <div style={{
          position: "relative", zIndex: 2,
          flex: 1, display: "flex", alignItems: "center",
          padding: "clamp(32px, 5vw, 56px) clamp(20px, 5vw, 80px) clamp(28px, 4vw, 48px)",
          maxWidth: 1440, margin: "0 auto", width: "100%",
          gap: "clamp(32px, 5vw, 80px)",
        }}>

          {/* LEFT: Copy */}
          <div style={{ flex: "0 0 auto", maxWidth: 520, width: "100%" }}>
            {/* Eyebrow */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 28,
              padding: "6px 14px", borderRadius: 99,
              border: "1px solid rgba(212,175,55,0.4)",
              background: "rgba(212,175,55,0.08)",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4af37", boxShadow: "0 0 8px #d4af37" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#d4af37", letterSpacing: 2, textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>
                Karabo Online Store
              </span>
            </div>

            {/* Headline — animates on slide change */}
            <h1 style={{
              fontSize: "clamp(38px, 6.5vw, 76px)",
              fontWeight: 400,
              lineHeight: 1.08,
              marginBottom: 24,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              whiteSpace: "pre-line",
              transition: "opacity 0.5s ease",
            }}>
              {currentSlide?.headline ?? "Discover Your\nSignature Style"}
            </h1>

            {/* Gold rule */}
            <div style={{ width: 48, height: 2, background: "linear-gradient(90deg, #d4af37, #f9d977)", marginBottom: 24, borderRadius: 99 }} />

            <p style={{
              fontSize: "clamp(15px, 1.8vw, 18px)",
              lineHeight: 1.7,
              marginBottom: 40,
              color: "rgba(255,255,255,0.72)",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 300,
            }}>
              {currentSlide?.sub ?? "Curated fashion and beauty collections crafted for elegance and confidence."}
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link href="/store" style={{
                padding: "15px 36px", borderRadius: 50,
                background: "linear-gradient(135deg, #d4af37, #f9d977)",
                color: "#08091a", fontWeight: 700, fontSize: 14,
                textDecoration: "none", fontFamily: "system-ui, sans-serif",
                letterSpacing: 0.5, transition: "transform 0.2s, box-shadow 0.2s",
                display: "inline-block", boxShadow: "0 4px 20px rgba(212,175,55,0.4)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(212,175,55,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,175,55,0.4)"; }}
              >
                Shop Now
              </Link>
              <Link href="/store" style={{
                padding: "15px 36px", borderRadius: 50,
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff", fontWeight: 600, fontSize: 14,
                textDecoration: "none", fontFamily: "system-ui, sans-serif",
                letterSpacing: 0.5, transition: "all 0.2s", display: "inline-block",
                background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
              >
                View All
              </Link>
            </div>

            {/* Slide dots + progress */}
            {slides.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 48 }}>
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    style={{
                      background: "none", border: "none", padding: 0, cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <div style={{
                      width: i === slideIndex ? 32 : 8,
                      height: 4, borderRadius: 99,
                      background: i === slideIndex ? "#d4af37" : "rgba(255,255,255,0.25)",
                      transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                      overflow: "hidden",
                    }}>
                      {i === slideIndex && (
                        <div style={{
                          position: "absolute", left: 0, top: 0, height: "100%",
                          width: `${progress}%`,
                          background: "rgba(255,255,255,0.5)",
                          transition: "width 0.05s linear",
                          borderRadius: 99,
                        }} />
                      )}
                    </div>
                  </button>
                ))}

                {/* Slide counter */}
                <span style={{ marginLeft: 8, fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "system-ui, sans-serif", letterSpacing: 1 }}>
                  {String(slideIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT: Product cards grid */}
          {!loading && currentSlide && (
            <div style={{ flex: 1, maxWidth: 580, minWidth: 0 }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "clamp(10px, 1.5vw, 18px)",
              }}>
                {currentSlide.products.map((product, idx) => (
                  <HeroCard
                    key={`${slideIndex}-${idx}`}
                    product={product}
                    state={cardStates[idx]}
                    delay={idx}
                    direction={direction}
                    onClick={() => router.push(`/store/product/${product.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom chevron */}
        <div style={{
          position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          animation: "bounceDown 2s ease-in-out infinite", zIndex: 2,
        }}>
          <div style={{ width: 1, height: 32, background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.4))" }} />
          <div style={{ width: 10, height: 10, border: "1px solid rgba(255,255,255,0.4)", borderTop: "none", borderLeft: "none", transform: "rotate(45deg)", marginTop: -6 }} />
        </div>
      </section>

      {/* ============================================================
          MARQUEE TICKER
      ============================================================ */}
      <div style={{
        background: "#d4af37",
        overflow: "hidden",
        whiteSpace: "nowrap",
        padding: "10px 0",
        position: "relative",
        zIndex: 3,
      }}>
        <div style={{
          display: "inline-flex", gap: 0,
          animation: "marquee 30s linear infinite",
        }}>
          {[...Array(3)].map((_, i) => (
            <span key={i} style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#08091a" }}>
              {["Free Delivery on All Orders", "New Collections Daily", "Premium Quality Products", "Secure Checkout", "Easy Returns", "Shop with Confidence"].map((t, j) => (
                <span key={j}>&nbsp;&nbsp;◆&nbsp;&nbsp;{t}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ============================================================
          FEATURED COLLECTION
      ============================================================ */}
      <section style={{ padding: "clamp(60px, 8vw, 100px) clamp(20px, 5vw, 80px)", background: "#fafaf8" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <SectionHeader label="Featured" title="Curated Picks" />

          {loading ? (
            <SkeletonGrid count={8} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: "clamp(14px, 2vw, 24px)" }}>
              {featured.map((p, i) => (
                <div key={p.id} style={{ animation: `fadeSlideUp 0.5s ease both`, animationDelay: `${i * 60}ms` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link href="/store" style={viewAllBtn}>Browse All Products →</Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          PROMO BANNER
      ============================================================ */}
      <section style={{
        margin: "0 clamp(20px, 5vw, 80px)",
        borderRadius: 28,
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(135deg, #0a1845 0%, #0033a0 50%, #005c2e 100%)",
        padding: "clamp(40px, 6vw, 80px) clamp(28px, 5vw, 72px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 32,
        marginBottom: "clamp(60px, 8vw, 100px)",
      }}>
        {/* Glow */}
        <div style={{ position: "absolute", top: -60, right: "30%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#d4af37", marginBottom: 12, fontFamily: "system-ui, sans-serif" }}>
            New Season
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 400, color: "#fff", lineHeight: 1.15, marginBottom: 8 }}>
            Style That Speaks
            <br /><em style={{ fontStyle: "italic", color: "#d4af37" }}>For Itself</em>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontFamily: "system-ui, sans-serif", fontWeight: 300 }}>
            Explore hundreds of new arrivals this season.
          </p>
        </div>

        <Link href="/store" style={{
          position: "relative", zIndex: 1,
          padding: "16px 40px", borderRadius: 50,
          background: "#d4af37", color: "#08091a",
          fontWeight: 800, fontSize: 14, textDecoration: "none",
          fontFamily: "system-ui, sans-serif", letterSpacing: 0.5,
          display: "inline-block", flexShrink: 0,
        }}>
          Shop the Collection
        </Link>
      </section>

      {/* ============================================================
          TRENDING
      ============================================================ */}
      {trending.length > 0 && (
        <section style={{ padding: "clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px)", background: "#fff" }}>
          <div style={{ maxWidth: 1440, margin: "0 auto" }}>
            <SectionHeader label="Trending" title="Most Popular" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: "clamp(12px, 1.5vw, 20px)" }}>
              {trending.map((p, i) => (
                <div key={p.id} style={{ animation: `fadeSlideUp 0.5s ease both`, animationDelay: `${i * 50}ms` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 48 }}>
              <Link href="/store" style={viewAllBtn}>View All Products →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          TRUST BADGES
      ============================================================ */}
      <section style={{ padding: "clamp(48px, 6vw, 72px) clamp(20px, 5vw, 80px)", background: "#fafaf8", borderTop: "1px solid #e8e4df" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
          {[
            { icon: "🚚", title: "Free Delivery", desc: "On all orders, no minimum" },
            { icon: "🔒", title: "Secure Payment", desc: "100% protected transactions" },
            { icon: "↩️", title: "Easy Returns", desc: "Hassle-free 30-day returns" },
            { icon: "💎", title: "Premium Quality", desc: "Curated for excellence" },
          ].map((b) => (
            <div key={b.title} style={{ textAlign: "center", padding: "24px 16px" }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>{b.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>{b.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CSS KEYFRAMES */}
      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(-25px, -30px) scale(1.08); }
          70% { transform: translate(20px, 10px) scale(0.96); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -25px); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        @keyframes bounceDown {
          0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.6; }
          50% { transform: translateX(-50%) translateY(8px); opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardExitNext {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-24px) scale(0.95); }
        }
        @keyframes cardExitPrev {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(24px) scale(0.95); }
        }
        @keyframes cardEnterNext {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cardEnterPrev {
          from { opacity: 0; transform: translateY(-24px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ================================================================
   HERO CARD
================================================================ */
function HeroCard({ product, state, delay, direction, onClick }: {
  product: ProductListItem;
  state: "idle" | "exit" | "enter";
  delay: number;
  direction: "next" | "prev";
  onClick: () => void;
}) {
  const animations: Record<string, string> = {
    exit: direction === "next" ? "cardExitNext" : "cardExitPrev",
    enter: direction === "next" ? "cardEnterNext" : "cardEnterPrev",
    idle: "none",
  };

  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        animation: `${animations[state]} 0.48s cubic-bezier(0.4,0,0.2,1) both`,
        animationDelay: state !== "idle" ? `${delay * 80}ms` : "0ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-6px) scale(1.03)"; e.currentTarget.style.boxShadow = "0 24px 56px rgba(0,0,0,0.5)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.4)"; }}
    >
      {/* Image */}
      <div style={{ position: "relative", paddingTop: "100%", background: "#0f1a3a" }}>
        {product.main_image ? (
          <img
            src={product.main_image}
            alt={product.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.3 }}>📦</div>
        )}
        {/* Gradient overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }} />
        {discount && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "#d4af37", color: "#08091a", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 99, fontFamily: "system-ui, sans-serif", letterSpacing: 0.5 }}>
            -{discount}%
          </div>
        )}
      </div>
      {/* Text */}
      <div style={{ padding: "clamp(10px, 1.5vw, 14px)" }}>
        <div style={{ fontSize: "clamp(11px, 1.2vw, 13px)", fontWeight: 600, color: "rgba(255,255,255,0.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>
          {product.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "clamp(13px, 1.4vw, 16px)", fontWeight: 900, color: "#d4af37" }}>
            {formatCurrency(product.price)}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "line-through", fontFamily: "system-ui, sans-serif" }}>
              {formatCurrency(product.compare_price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SECTION HEADER
================================================================ */
function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div style={{ marginBottom: "clamp(28px, 4vw, 44px)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#9b7e2e", marginBottom: 8, fontFamily: "system-ui, sans-serif" }}>
          — {label}
        </div>
        <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 400, color: "#0f172a", lineHeight: 1.1, margin: 0 }}>
          {title}
        </h2>
      </div>
    </div>
  );
}

/* ================================================================
   SKELETON
================================================================ */
function SkeletonGrid({ count }: { count: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "#f1f0ee" }}>
          <div style={{ paddingTop: "100%", background: "linear-gradient(90deg, #f1f0ee 0%, #e4e2de 50%, #f1f0ee 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s ease-in-out infinite", animationDelay: `${i * 80}ms` }} />
          <div style={{ padding: 14 }}>
            <div style={{ height: 14, borderRadius: 8, background: "#e4e2de", marginBottom: 8 }} />
            <div style={{ height: 18, width: "50%", borderRadius: 8, background: "#e4e2de" }} />
          </div>
          <style>{`@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   STYLES
================================================================ */
const viewAllBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "13px 32px",
  borderRadius: 50,
  border: "1.5px solid #0f172a",
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 14,
  textDecoration: "none",
  fontFamily: "system-ui, sans-serif",
  letterSpacing: 0.3,
  transition: "all 0.2s ease",
};