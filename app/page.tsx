"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatPrice(price: string | number) {
  if (typeof price === "string") return `M ${price.replace(/[^0-9.]/g, "")}`;
  return `M ${Number(price).toFixed(2)}`;
}

const INTERVAL = 10000; // 10 seconds

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Two hero slots for crossfade — "current" fades out, "next" fades in
  const [currentHero, setCurrentHero] = useState<ProductListItem[]>([]);
  const [nextHero, setNextHero]       = useState<ProductListItem[]>([]);
  const [fading, setFading]           = useState(false); // true = crossfade in progress
  const [progress, setProgress]       = useState(0);     // 0–100 for progress bar

  const poolRef      = useRef<ProductListItem[]>([]);
  const heroIndexRef = useRef(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── load products ──────────────────────────────────────────
  async function load() {
    setLoading(true);
    try {
      const first = await productsApi.list({ page: 1, per_page: 40 });
      const total: number = first?.total ?? 0;
      let all: ProductListItem[] = first?.results ?? [];

      if (total > 40) {
        const maxPage = Math.floor(total / 40);
        const rndPage = Math.floor(Math.random() * maxPage) + 2;
        try {
          const extra = await productsApi.list({ page: rndPage, per_page: 40 });
          all = [...all, ...(extra?.results ?? [])];
        } catch (_) {}
      }

      const shuffled = shuffle(all);
      poolRef.current      = shuffled;
      heroIndexRef.current = 0;

      setCurrentHero(shuffled.slice(0, 4));
      setProducts(shuffled.slice(4, 12));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // ── start rotation once pool is ready ─────────────────────
  useEffect(() => {
    if (poolRef.current.length < 8) return;
    startRotation();
    return () => stopRotation();
  }, [products]); // products set after pool — safe trigger

  function stopRotation() {
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (progressRef.current)  clearInterval(progressRef.current);
  }

  function startRotation() {
    stopRotation();
    setProgress(0);

    // Progress bar — ticks every 100ms
    let elapsed = 0;
    progressRef.current = setInterval(() => {
      elapsed += 100;
      setProgress(Math.min((elapsed / INTERVAL) * 100, 100));
    }, 100);

    // Main swap interval
    intervalRef.current = setInterval(() => {
      const pool = poolRef.current;
      if (pool.length < 8) return;

      // Pick next 4, never overlapping the featured section (indices 4–11)
      heroIndexRef.current = (heroIndexRef.current + 4) % Math.max(pool.length - 12, 4);
      const start = 12 + heroIndexRef.current;
      let slice = pool.slice(start, start + 4);
      if (slice.length < 4) slice = [...slice, ...pool.slice(0, 4 - slice.length)];

      // Crossfade: load next behind current, then swap
      setNextHero(slice);
      setFading(true);

      setTimeout(() => {
        setCurrentHero(slice);
        setNextHero([]);
        setFading(false);
      }, 900); // 900ms crossfade matches CSS transition

      // Reset progress bar
      elapsed = 0;
      setProgress(0);
    }, INTERVAL);
  }

  // ── hero card renderer ─────────────────────────────────────
  function HeroCard({ product, opacity, zIndex }: { product: ProductListItem; opacity: number; zIndex: number }) {
    return (
      <div
        onClick={() => router.push(`/store/product/${product.id}`)}
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          cursor: "pointer",
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          opacity,
          zIndex,
          transition: "opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s ease",
          transform: "translateY(0) scale(1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-10px) scale(1.04)";
          e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0) scale(1)";
          e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.25)";
        }}
      >
        <div style={{
          aspectRatio: "1",
          backgroundImage: product.main_image
            ? `url(${product.main_image})`
            : "linear-gradient(135deg, #1a1a2e, #16213e)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}>
          {/* Gradient overlay at bottom */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: "50%",
            background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)",
          }} />
          {/* Quick View pill */}
          <div style={{
            position: "absolute",
            top: 12, right: 12,
            padding: "5px 12px",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            color: "#0033a0",
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}>
            View
          </div>
        </div>
        <div style={{ padding: "14px 16px 16px" }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {product.title}
          </div>
          <div style={{
            fontSize: 17, fontWeight: 900,
            background: "linear-gradient(135deg, #0033a0, #009543)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            {formatPrice(product.price)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section style={{
        position: "relative",
        minHeight: "88vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0a0f2e 0%, #0033a0 45%, #005c2e 100%)",
      }}>

        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />

        {/* Glow orbs */}
        <div style={{ position: "absolute", top: "-10%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,149,67,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-5%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,51,160,0.25) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div className="container" style={{ position: "relative", zIndex: 1, width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))", gap: 64, alignItems: "center" }}>

            {/* ── LEFT CONTENT ── */}
            <div>
              {/* Badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 18px", marginBottom: 28,
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(12px)",
                borderRadius: 30,
                border: "1px solid rgba(255,255,255,0.2)",
                animation: "slideInLeft 0.8s ease-out",
              }}>
                <span style={{ fontSize: 18 }}>🇱🇸</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: 1.5, textTransform: "uppercase" }}>
                  Lesotho Premium Boutique
                </span>
              </div>

              <h1 style={{
                fontSize: "clamp(40px, 7vw, 70px)", fontWeight: 900, lineHeight: 1.08,
                marginBottom: 20, color: "#fff",
                textShadow: "0 4px 24px rgba(0,0,0,0.4)",
                animation: "slideInLeft 0.8s ease-out 0.15s backwards",
              }}>
                Discover Your
                <br />
                <span style={{
                  background: "linear-gradient(90deg, #fff 0%, #d4af37 60%, #f9d977 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>
                  Signature Style
                </span>
              </h1>

              <p style={{
                fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.8, marginBottom: 36,
                color: "rgba(255,255,255,0.8)", maxWidth: 520,
                animation: "slideInLeft 0.8s ease-out 0.3s backwards",
              }}>
                Curated fashion and beauty collections crafted for elegance, confidence, and the modern lifestyle. Experience luxury that celebrates African heritage.
              </p>

              {/* CTA buttons */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", animation: "slideInLeft 0.8s ease-out 0.45s backwards" }}>
                <button
                  onClick={() => router.push("/store")}
                  style={{ padding: "16px 36px", fontSize: 15, fontWeight: 800, color: "#0033a0", background: "#fff", border: "none", borderRadius: 50, cursor: "pointer", boxShadow: "0 8px 28px rgba(0,0,0,0.25)", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", letterSpacing: 0.5, textTransform: "uppercase" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px) scale(1.04)"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(0,0,0,0.35)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.25)"; }}
                >
                  Shop Now
                </button>
                <button
                  onClick={() => router.push("/store")}
                  style={{ padding: "16px 36px", fontSize: 15, fontWeight: 800, color: "#fff", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 50, cursor: "pointer", backdropFilter: "blur(10px)", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", letterSpacing: 0.5, textTransform: "uppercase" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.8)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; }}
                >
                  Explore Collection
                </button>
              </div>

              {/* Trust badges */}
              <div style={{ display: "flex", gap: 28, marginTop: 44, flexWrap: "wrap", animation: "fadeIn 1s ease-out 0.6s backwards" }}>
                {[["✦", "Premium Quality"], ["⚡", "Fast Delivery"], ["🔒", "Secure Checkout"]].map(([icon, label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, color: "#d4af37" }}>{icon}</span>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: CROSSFADE PRODUCT GRID ── */}
            {!loading && currentHero.length > 0 && (
              <div style={{ animation: "slideInRight 0.8s ease-out 0.3s backwards" }}>

                {/* Progress bar */}
                <div style={{ marginBottom: 16, height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #009543, #d4af37)",
                    borderRadius: 2,
                    transition: "width 0.1s linear",
                  }} />
                </div>

                {/* Card grid with crossfade layers */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                  {currentHero.map((product, idx) => (
                    <div key={`slot-${idx}`} style={{ position: "relative" }}>
                      {/* Current layer — fades OUT */}
                      <div style={{ position: "absolute", inset: 0, opacity: fading ? 0 : 1, transition: "opacity 0.9s cubic-bezier(0.4,0,0.2,1)", zIndex: 1 }}>
                        <HeroCard product={product} router={router} />
                      </div>
                      {/* Next layer — fades IN */}
                      <div style={{ opacity: fading ? 1 : 0, transition: "opacity 0.9s cubic-bezier(0.4,0,0.2,1)", zIndex: 2 }}>
                        {nextHero[idx]
                          ? <HeroCard product={nextHero[idx]} router={router} />
                          : <HeroCard product={product} router={router} />
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dot indicators */}
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
                  {Array.from({ length: Math.min(5, Math.floor((poolRef.current.length - 12) / 4) + 1) }).map((_, i) => (
                    <div key={i} style={{
                      width: i === (heroIndexRef.current / 4) % 5 ? 20 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: i === (heroIndexRef.current / 4) % 5 ? "#d4af37" : "rgba(255,255,255,0.3)",
                      transition: "all 0.4s ease",
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", animation: "bounce 2.5s ease-in-out infinite", opacity: 0.6 }}>
          <div style={{ width: 26, height: 42, border: "2px solid rgba(255,255,255,0.5)", borderRadius: 13, position: "relative", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 4, height: 8, background: "#fff", borderRadius: 2, marginTop: 7, animation: "scrollDown 2s ease-in-out infinite" }} />
          </div>
        </div>

        <style jsx>{`
          @keyframes slideInLeft  { from { opacity:0; transform:translateX(-50px); } to { opacity:1; transform:translateX(0); } }
          @keyframes slideInRight { from { opacity:0; transform:translateX(50px);  } to { opacity:1; transform:translateX(0); } }
          @keyframes fadeIn       { from { opacity:0; } to { opacity:1; } }
          @keyframes float        { 0%,100% { transform:translateY(0);    } 50% { transform:translateY(-18px); } }
          @keyframes bounce       { 0%,100% { transform:translateX(-50%) translateY(0);    } 50% { transform:translateX(-50%) translateY(-8px); } }
          @keyframes scrollDown   { 0% { opacity:1; transform:translateY(0);  } 100% { opacity:0; transform:translateY(16px); } }
        `}</style>
      </section>

      {/* ═══════════════════ FEATURED COLLECTION ═══════════════════ */}
      <section style={{ padding: "100px 0", background: "linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 60, flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#009543", textTransform: "uppercase", marginBottom: 10 }}>
                Handpicked For You
              </div>
              <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, color: "#0a0f2e", margin: 0 }}>
                Featured Collection
              </h2>
            </div>
            <button
              onClick={() => router.push("/store")}
              style={{ padding: "14px 32px", fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, #0033a0, #009543)", border: "none", borderRadius: 50, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,51,160,0.3)", transition: "all 0.3s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,51,160,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,51,160,0.3)"; }}
            >
              View All Products →
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading products...</div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>No products available.</div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Extracted hero card component ──────────────────────────
function HeroCard({ product, router }: { product: ProductListItem; router: ReturnType<typeof useRouter> }) {
  function formatPrice(price: string | number) {
    if (typeof price === "string") return `M ${price.replace(/[^0-9.]/g, "")}`;
    return `M ${Number(price).toFixed(2)}`;
  }

  return (
    <div
      onClick={() => router.push(`/store/product/${product.id}`)}
      style={{ background: "#fff", borderRadius: 20, overflow: "hidden", cursor: "pointer", boxShadow: "0 12px 40px rgba(0,0,0,0.2)", transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.35s ease" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-10px) scale(1.04)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.32)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.2)"; }}
    >
      <div style={{
        aspectRatio: "1",
        backgroundImage: product.main_image ? `url(${product.main_image})` : "linear-gradient(135deg, #1a1a2e, #16213e)",
        backgroundSize: "cover", backgroundPosition: "center", position: "relative",
      }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)" }} />
        <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)", borderRadius: 20, fontSize: 10, fontWeight: 800, color: "#0033a0", letterSpacing: 0.8, textTransform: "uppercase" }}>
          View
        </div>
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {product.title}
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, background: "linear-gradient(135deg, #0033a0, #009543)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          {formatPrice(product.price)}
        </div>
      </div>
    </div>
  );
}