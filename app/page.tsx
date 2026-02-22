"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

interface HP {
  id: string; title: string; price: number; compare_price?: number | null;
  discount_pct?: number | null; brand?: string; category?: string;
  rating?: number | null; rating_number?: number | null;
  in_stock: boolean; main_image?: string | null;
}
interface Section {
  key: string; title: string; subtitle: string;
  badge: string | null; theme: string;
  view_all: string; products: HP[];
}

const SLIDES = [
  { headline: "Discover Your\nSignature Style",  sub: "Curated collections crafted for the discerning eye" },
  { headline: "New Arrivals\nJust Landed",        sub: "Fresh styles updated daily — be first" },
  { headline: "Luxury Finds\nAt Every Price",     sub: "Premium quality that never compromises" },
  { headline: "The Season's\nBest Picks",         sub: "Trending now across every category" },
];
const INTERVAL = 7000;

const THEME: Record<string, { accent: string; light: string }> = {
  red:    { accent: "#c62828", light: "rgba(198,40,40,0.06)"   },
  green:  { accent: "#0f3f2f", light: "rgba(15,63,47,0.06)"    },
  gold:   { accent: "#b8933f", light: "rgba(184,147,63,0.08)"  },
  forest: { accent: "#1b5e4a", light: "rgba(27,94,74,0.06)"    },
  navy:   { accent: "#1a237e", light: "rgba(26,35,126,0.06)"   },
  plum:   { accent: "#6a1b9a", light: "rgba(106,27,154,0.06)"  },
  teal:   { accent: "#00695c", light: "rgba(0,105,92,0.06)"    },
  rust:   { accent: "#bf360c", light: "rgba(191,54,12,0.06)"   },
  slate:  { accent: "#37474f", light: "rgba(55,71,79,0.06)"    },
  olive:  { accent: "#558b2f", light: "rgba(85,139,47,0.06)"   },
  rose:   { accent: "#ad1457", light: "rgba(173,20,87,0.06)"   },
  indigo: { accent: "#283593", light: "rgba(40,53,147,0.06)"   },
  amber:  { accent: "#e65100", light: "rgba(230,81,0,0.06)"    },
  sage:   { accent: "#33691e", light: "rgba(51,105,30,0.06)"   },
  stone:  { accent: "#4e342e", light: "rgba(78,52,46,0.06)"    },
};

function safeViewAll(raw: string): string {
  try {
    const url = new URL(raw, "http://x");
    const search = url.searchParams.get("search");
    if (search) return `/products?search=${encodeURIComponent(search)}`;
    return "/products";
  } catch { return "/products"; }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ══════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();

  const [heroProds, setHeroProds] = useState<ProductListItem[]>([]);
  const [slideIdx,  setSlideIdx]  = useState(0);
  const [animating, setAnimating] = useState(false);
  const [imgAnim,   setImgAnim]   = useState<"idle"|"exit"|"enter">("idle");
  const [heroLoad,  setHeroLoad]  = useState(true);
  const [progress,  setProgress]  = useState(0);

  const [sections,  setSections]  = useState<Section[]>([]);
  const [secLoad,   setSecLoad]   = useState(true);

  const timerRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const t0Ref       = useRef(Date.now());

  useEffect(() => {
    productsApi.list({ page: 1, per_page: 40 })
      .then(r => { setHeroProds(shuffle((r as any)?.results ?? []) as ProductListItem[]); })
      .finally(() => setHeroLoad(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.json())
      .then(d => setSections(d.sections ?? []))
      .catch(() => setSections([]))
      .finally(() => setSecLoad(false));
  }, []);

  const startProgress = useCallback(() => {
    clearInterval(progressRef.current!);
    t0Ref.current = Date.now(); setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - t0Ref.current) / INTERVAL) * 100, 100));
    }, 40);
  }, []);

  const goTo = useCallback((idx: number) => {
    if (animating || idx === slideIdx || heroProds.length < 4) return;
    setAnimating(true);
    setImgAnim("exit");
    setTimeout(() => {
      setSlideIdx(idx);
      setImgAnim("enter");
      setTimeout(() => { setImgAnim("idle"); setAnimating(false); }, 650);
    }, 380);
  }, [animating, slideIdx, heroProds.length]);

  const advance = useCallback((d: "next"|"prev" = "next") => {
    const next = d === "next"
      ? (slideIdx + 1) % SLIDES.length
      : (slideIdx - 1 + SLIDES.length) % SLIDES.length;
    goTo(next);
  }, [slideIdx, goTo]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current!);
    startProgress();
    timerRef.current = setInterval(() => {
      startProgress();
      setSlideIdx(p => {
        const next = (p + 1) % SLIDES.length;
        // trigger image animation
        setImgAnim("exit");
        setTimeout(() => { setImgAnim("enter"); setTimeout(() => setImgAnim("idle"), 650); }, 380);
        return next;
      });
    }, INTERVAL);
  }, [startProgress]);

  useEffect(() => {
    if (heroProds.length < 4) return;
    resetTimer();
    return () => { clearInterval(timerRef.current!); clearInterval(progressRef.current!); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroProds.length]);

  const pool     = heroProds.slice(0, Math.max(heroProds.length, SLIDES.length * 4));
  const featured = pool[slideIdx % Math.max(pool.length, 1)] ?? pool[0];
  const thumbs   = [1, 2, 3].map(o => pool[(slideIdx + o) % Math.max(pool.length, 1)]).filter(Boolean);
  const slide    = SLIDES[slideIdx];
  const disc     = featured && (featured as any).compare_price && (featured as any).compare_price > featured.price
    ? Math.round((((featured as any).compare_price - featured.price) / (featured as any).compare_price) * 100)
    : null;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f7f5f2", minHeight: "100vh" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:rgba(184,147,63,.3);border-radius:3px}

        @keyframes imgExit  { from{opacity:1;transform:scale(1.0)} to{opacity:0;transform:scale(1.04)} }
        @keyframes imgEnter { from{opacity:0;transform:scale(1.07)} to{opacity:1;transform:scale(1.0)} }
        @keyframes txtIn    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes marquee  { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
        @keyframes shimmer  { from{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes floatA   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(18px,-14px)} }
        @keyframes floatB   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-14px,12px)} }
        @keyframes thumbIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes mCardIn  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }

        .shimbox{background:linear-gradient(90deg,#ece9e2 0%,#dedad2 50%,#ece9e2 100%);background-size:200% 100%;animation:shimmer 1.6s ease infinite;}

        .hero-img        { position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;cursor:pointer; }
        .hero-img.exit   { animation:imgExit  .38s cubic-bezier(.4,0,.6,1) both; }
        .hero-img.enter  { animation:imgEnter .65s cubic-bezier(.2,.8,.3,1) both; }

        .hero-txt        { animation:txtIn .55s ease both; }

        /* thumbnail strip */
        .thumb-item { cursor:pointer;border-radius:10px;overflow:hidden;
          border:2px solid transparent;transition:border-color .2s ease,transform .2s ease;flex:1;height:56px; }
        .thumb-item.active { border-color:rgba(184,147,63,.85); }
        .thumb-item:not(.active):hover { border-color:rgba(255,255,255,.22);transform:scaleY(1.04); }
        .thumb-item img { width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s ease; }
        .thumb-item:hover img { transform:scale(1.08); }

        /* nav arrow */
        .nav-arrow { width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.16);
          background:rgba(255,255,255,.05);backdrop-filter:blur(8px);
          display:flex;align-items:center;justify-content:center;cursor:pointer;
          color:rgba(255,255,255,.65);transition:all .2s ease;flex-shrink:0; }
        .nav-arrow:hover { background:rgba(184,147,63,.18);border-color:rgba(184,147,63,.5);color:#b8933f; }

        /* section cards */
        .mcard { position:relative;border-radius:16px;overflow:hidden;cursor:pointer;
          background:#fff;border:1px solid rgba(0,0,0,.07);
          transition:all .38s cubic-bezier(.2,.8,.3,1);flex-shrink:0; }
        .mcard:hover { transform:translateY(-8px);box-shadow:0 24px 56px rgba(0,0,0,.14); }
        .mcard:hover .mcard-img { transform:scale(1.06); }
        .mcard-img { transition:transform .55s ease;width:100%;height:100%;object-fit:cover;display:block; }
        .mcard:hover .mcard-reveal { opacity:1;transform:translateY(0); }
        .mcard-reveal { position:absolute;bottom:0;left:0;right:0;padding:20px 16px 18px;
          background:linear-gradient(transparent,rgba(8,16,10,.86) 35%,rgba(4,8,6,.96));
          transform:translateY(8px);opacity:.85;transition:all .35s ease; }

        .scrollrow { display:flex;gap:16px;overflow-x:auto;padding-bottom:16px;scroll-behavior:smooth; }
        .scrollrow::-webkit-scrollbar{ height:2px }
        .scrollrow::-webkit-scrollbar-thumb{ background:rgba(184,147,63,.35);border-radius:2px }
        .arrowbtn { transition:all .18s ease !important; }
        .arrowbtn:hover { background:#0f3f2f!important;color:#fff!important;border-color:#0f3f2f!important; }
        .viewall-link { transition:all .2s ease; }
        .viewall-link:hover { background:#0f3f2f!important;color:#fff!important;border-color:#0f3f2f!important; }
        .end-card { flex-shrink:0;border-radius:16px;border:1.5px dashed rgba(184,147,63,.35);
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:12px;text-decoration:none;padding:24px 20px;transition:all .25s ease; }
        .end-card:hover { border-color:rgba(184,147,63,.7);background:rgba(184,147,63,.04)!important; }
        .trust-item { transition:transform .25s ease; }
        .trust-item:hover { transform:translateY(-3px); }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          HERO — FULL-BLEED EDITORIAL SPLIT
          · Right side: dominant product image fills 55% of hero
          · Left panel: headline copy + CTA buttons + bottom nav row
          · Nav row: "01/04" counter | ‹ › arrows | 3 thumbnail chips
          · Progress: 2px gold line at very bottom — invisible but functional
      ══════════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        height: "clamp(560px, 72vh, 800px)",
        background: "linear-gradient(160deg,#04090d 0%,#071a10 45%,#04090d 100%)",
        display: "flex",
      }}>
        {/* ambient orbs */}
        <div style={{ position:"absolute",top:"-10%",left:"30%",width:560,height:560,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(184,147,63,.07) 0%,transparent 70%)",
          animation:"floatA 18s ease-in-out infinite",zIndex:0,pointerEvents:"none" }} />
        <div style={{ position:"absolute",bottom:"-20%",right:"0",width:700,height:700,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(15,63,47,.18) 0%,transparent 70%)",
          animation:"floatB 22s ease-in-out infinite",zIndex:0,pointerEvents:"none" }} />

        {/* noise grain */}
        <div style={{ position:"absolute",inset:0,zIndex:0,pointerEvents:"none",opacity:.55,
          backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundSize:"180px 180px" }} />

        {/* ─── LEFT PANEL (45%) ─────────────────────────────── */}
        <div style={{
          position: "relative", zIndex: 2,
          width: "45%", flexShrink: 0,
          display: "flex", flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(40px,5vw,80px) clamp(28px,4vw,64px)",
        }}>
          {/* brand pill */}
          <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:26,
            padding:"5px 14px",borderRadius:30,alignSelf:"flex-start",
            background:"rgba(184,147,63,.1)",border:"1px solid rgba(184,147,63,.18)" }}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:"#b8933f",
              boxShadow:"0 0 8px rgba(184,147,63,.7)" }} />
            <span style={{ fontSize:9,fontWeight:600,color:"#b8933f",letterSpacing:"2.8px",
              textTransform:"uppercase",fontFamily:"'DM Sans',system-ui,sans-serif" }}>
              Karabo Boutique
            </span>
          </div>

          {/* headline + sub + CTAs */}
          {!heroLoad && slide ? (
            <div key={slideIdx} className="hero-txt" style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"center" }}>
              <h1 style={{
                fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(36px,5.2vw,70px)",fontWeight:500,
                color:"#fff",lineHeight:1.05,marginBottom:14,
                whiteSpace:"pre-line",letterSpacing:"-0.025em",
              }}>{slide.headline}</h1>
              <p style={{
                fontFamily:"'DM Sans',system-ui,sans-serif",
                fontSize:"clamp(12px,1.3vw,14px)",color:"rgba(255,255,255,.45)",
                lineHeight:1.85,marginBottom:28,fontWeight:300,maxWidth:320,
              }}>{slide.sub}</p>
              <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                <Link href="/products" style={{
                  padding:"11px 26px",borderRadius:50,
                  background:"#b8933f",color:"#04090d",
                  fontWeight:600,fontSize:11,textDecoration:"none",
                  fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:"1px",
                  textTransform:"uppercase",boxShadow:"0 4px 24px rgba(184,147,63,.35)",
                  transition:"all .2s",whiteSpace:"nowrap",
                }}>Shop Now</Link>
                <Link href="/products" style={{
                  padding:"11px 26px",borderRadius:50,
                  border:"1px solid rgba(255,255,255,.13)",
                  color:"rgba(255,255,255,.6)",fontWeight:400,fontSize:11,
                  textDecoration:"none",fontFamily:"'DM Sans',system-ui,sans-serif",
                  letterSpacing:"1px",textTransform:"uppercase",whiteSpace:"nowrap",
                }}>Explore All</Link>
              </div>
            </div>
          ) : (
            <div style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"center" }}>
              <div style={{ height:54,width:"82%",borderRadius:8,marginBottom:10 }} className="shimbox" />
              <div style={{ height:54,width:"62%",borderRadius:8,marginBottom:18 }} className="shimbox" />
              <div style={{ height:12,width:"78%",borderRadius:5,marginBottom:7 }} className="shimbox" />
              <div style={{ height:12,width:"58%",borderRadius:5,marginBottom:28 }} className="shimbox" />
              <div style={{ display:"flex",gap:10 }}>
                <div style={{ height:40,width:120,borderRadius:20 }} className="shimbox" />
                <div style={{ height:40,width:110,borderRadius:20 }} className="shimbox" />
              </div>
            </div>
          )}

          {/* ── BOTTOM NAV ROW ── */}
          <div style={{ display:"flex",alignItems:"center",gap:12,marginTop:32 }}>

            {/* slide counter — Cormorant, elegant numerals */}
            <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              userSelect:"none",flexShrink:0,lineHeight:1 }}>
              <span style={{ fontSize:20,fontWeight:600,color:"rgba(255,255,255,.82)" }}>
                {String(slideIdx + 1).padStart(2,"0")}
              </span>
              <span style={{ fontSize:11,color:"rgba(255,255,255,.25)",margin:"0 4px" }}>/</span>
              <span style={{ fontSize:11,color:"rgba(255,255,255,.25)" }}>
                {String(SLIDES.length).padStart(2,"0")}
              </span>
            </div>

            {/* arrows */}
            <div style={{ display:"flex",gap:5,flexShrink:0 }}>
              {(["prev","next"] as const).map(d => (
                <button key={d} className="nav-arrow"
                  onClick={() => { advance(d); resetTimer(); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {d === "prev"
                      ? <path d="M15 18l-6-6 6-6"/>
                      : <path d="M9 18l6-6-6-6"/>}
                  </svg>
                </button>
              ))}
            </div>

            {/* divider */}
            <div style={{ width:1,height:32,background:"rgba(255,255,255,.1)",flexShrink:0 }} />

            {/* thumbnail filmstrip — 3 chips */}
            <div style={{ display:"flex",gap:6,flex:1,overflow:"hidden" }}>
              {heroLoad
                ? [0,1,2].map(i => (
                    <div key={i} className="thumb-item" style={{ background:"rgba(255,255,255,.06)" }} />
                  ))
                : thumbs.map((p, i) => {
                    const targetIdx = (slideIdx + 1 + i) % SLIDES.length;
                    const isActive  = false; // these are "upcoming", not active
                    return (
                      <div key={`thumb-${slideIdx}-${i}`}
                        className={`thumb-item${isActive ? " active" : ""}`}
                        style={{ animation:`thumbIn .4s ease ${i*.07}s both` }}
                        onClick={() => { goTo(targetIdx); resetTimer(); }}>
                        {(p as any).main_image
                          ? <img src={(p as any).main_image} alt={p.title} />
                          : <div style={{ width:"100%",height:"100%",
                              background:"rgba(255,255,255,.06)",
                              display:"flex",alignItems:"center",justifyContent:"center" }}>
                              <span style={{ color:"rgba(255,255,255,.15)",fontSize:13,
                                fontFamily:"'Cormorant Garamond',serif" }}>K</span>
                            </div>
                        }
                        {/* subtle dim overlay */}
                        <div style={{ position:"absolute",inset:0,pointerEvents:"none",
                          background:"rgba(4,9,13,.32)" }} />
                        {/* hover label — slide number */}
                        <div style={{ position:"absolute",bottom:3,right:5,
                          fontSize:8,fontWeight:600,color:"rgba(255,255,255,.5)",
                          fontFamily:"'DM Sans',system-ui,sans-serif",
                          letterSpacing:".5px" }}>
                          {String(targetIdx + 1).padStart(2,"0")}
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL — dominant product image (55%) ──── */}
        <div style={{ position:"relative",zIndex:1,flex:1,overflow:"hidden" }}>

          {heroLoad ? (
            <div style={{ position:"absolute",inset:0 }} className="shimbox" />
          ) : featured && (featured as any).main_image ? (
            <img
              src={(featured as any).main_image}
              alt={featured.title}
              className={`hero-img ${imgAnim}`}
              onClick={() => router.push(`/products/${featured.id}`)}
            />
          ) : (
            <div style={{ position:"absolute",inset:0,
              background:"rgba(15,26,58,.8)",
              display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={{ color:"rgba(255,255,255,.06)",
                fontSize:"clamp(100px,16vw,200px)",
                fontFamily:"'Cormorant Garamond',serif",fontWeight:300 }}>K</span>
            </div>
          )}

          {/* vignettes */}
          <div style={{ position:"absolute",inset:0,pointerEvents:"none",
            background:"linear-gradient(90deg,rgba(4,9,13,1) 0%,rgba(4,9,13,.35) 14%,transparent 32%)" }} />
          <div style={{ position:"absolute",inset:0,pointerEvents:"none",
            background:"linear-gradient(180deg,rgba(4,9,13,.15) 0%,transparent 35%,transparent 50%,rgba(4,9,13,.75) 100%)" }} />

          {/* ── product info overlay — bottom-right of image panel ── */}
          {!heroLoad && featured && (
            <div
              onClick={() => router.push(`/products/${featured.id}`)}
              style={{
                position:"absolute",bottom:0,left:0,right:0,
                padding:"clamp(16px,2.5vw,32px) clamp(20px,3vw,40px) clamp(20px,3vw,36px)",
                cursor:"pointer",
              }}>
              {/* category breadcrumb */}
              <div style={{ fontSize:9,fontWeight:500,letterSpacing:"2.5px",
                textTransform:"uppercase",color:"rgba(255,255,255,.4)",
                fontFamily:"'DM Sans',system-ui,sans-serif",marginBottom:7 }}>
                {(featured as any).category ?? (featured as any).brand ?? "Featured"}
              </div>

              {/* product title */}
              <div style={{
                fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(18px,2.6vw,30px)",fontWeight:500,color:"#fff",
                lineHeight:1.2,marginBottom:12,
                overflow:"hidden",display:"-webkit-box",
                WebkitLineClamp:2,WebkitBoxOrient:"vertical",
              }}>{featured.title}</div>

              {/* price + badges */}
              <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
                <span style={{ fontSize:"clamp(17px,2.2vw,24px)",fontWeight:700,
                  color:"#b8933f",fontFamily:"'DM Sans',system-ui,sans-serif" }}>
                  {formatCurrency(featured.price)}
                </span>
                {(featured as any).compare_price && (featured as any).compare_price > featured.price && (
                  <span style={{ fontSize:11,color:"rgba(255,255,255,.28)",
                    textDecoration:"line-through",fontFamily:"'DM Sans',system-ui,sans-serif" }}>
                    {formatCurrency((featured as any).compare_price)}
                  </span>
                )}
                {disc && (
                  <span style={{ background:"#c62828",color:"#fff",fontSize:9,fontWeight:800,
                    padding:"3px 9px",borderRadius:20,fontFamily:"'DM Sans',system-ui,sans-serif",
                    letterSpacing:".5px" }}>
                    −{disc}% OFF
                  </span>
                )}
                <span style={{ marginLeft:"auto",fontSize:10,color:"rgba(255,255,255,.32)",
                  fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:".3px",
                  whiteSpace:"nowrap" }}>
                  View product →
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── PROGRESS LINE — 2px gold razor at bottom ── */}
        <div style={{ position:"absolute",bottom:0,left:0,right:0,height:2,
          background:"rgba(255,255,255,.05)",zIndex:10,pointerEvents:"none" }}>
          <div style={{
            height:"100%",width:`${progress}%`,
            background:"linear-gradient(90deg,#b8933f,#d4b45a)",
            transition:"width 40ms linear",
          }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          MARQUEE BAR
      ══════════════════════════════════════════════════════════ */}
      <div style={{ background:"#0f3f2f",overflow:"hidden" }}>
        <div style={{ display:"flex",animation:"marquee 32s linear infinite",width:"300%" }}>
          {[0,1,2].map(gi => (
            <div key={gi} style={{ display:"flex",flex:"0 0 33.333%",justifyContent:"space-around" }}>
              {["Free Delivery on Orders over M500","100% Authentic Products","Secure & Easy Checkout",
                "7-Day Easy Returns","Premium Gift Packaging","Lesotho's Finest Boutique"].map((t,i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:8,
                  padding:"10px 24px",whiteSpace:"nowrap" }}>
                  <div style={{ width:3,height:3,borderRadius:"50%",background:"#b8933f",flexShrink:0 }} />
                  <span style={{ fontSize:10,fontWeight:400,color:"rgba(255,255,255,.7)",
                    letterSpacing:".8px",fontFamily:"'DM Sans',system-ui,sans-serif",
                    textTransform:"uppercase" }}>{t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTIONS
      ══════════════════════════════════════════════════════════ */}
      <div style={{ paddingTop:"clamp(40px,5vw,64px)",paddingBottom:"clamp(56px,7vw,96px)" }}>
        {secLoad ? (
          <div style={{ maxWidth:1400,margin:"0 auto",padding:"0 clamp(16px,4vw,48px)" }}>
            {[0,1,2].map(si => (
              <div key={si} style={{ marginBottom:56 }}>
                <div style={{ height:18,width:180,borderRadius:6,marginBottom:20 }} className="shimbox" />
                <div style={{ display:"flex",gap:16,overflow:"hidden" }}>
                  {Array.from({length:5}).map((_,i) => (
                    <div key={i} style={{ flexShrink:0,width:210,borderRadius:16,height:300 }} className="shimbox" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div style={{ textAlign:"center",padding:"100px 20px",color:"#9ca3af",
            fontFamily:"'DM Sans',system-ui,sans-serif" }}>
            <p>Add products to your store — sections will appear automatically.</p>
          </div>
        ) : (
          sections.map((sec, i) => (
            <SectionRow key={sec.key} sec={sec} delay={i * 0.04}
              onProductClick={id => router.push(`/products/${id}`)} />
          ))
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TRUST BLOCK
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background:"#fff",borderTop:"1px solid #ede9e2" }}>
        <div style={{ maxWidth:1400,margin:"0 auto",
          padding:"clamp(40px,5vw,72px) clamp(20px,4vw,56px)",
          display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
          gap:"clamp(24px,3vw,48px)" }}>
          {[
            { icon:<TIcon t="delivery"/>, t:"Free Delivery",  d:"On all orders above M500" },
            { icon:<TIcon t="auth"/>,     t:"100% Authentic", d:"Every product verified & certified" },
            { icon:<TIcon t="returns"/>,  t:"Easy Returns",   d:"7-day hassle-free returns" },
            { icon:<TIcon t="secure"/>,   t:"Secure Payment", d:"Fully encrypted transactions" },
          ].map(b => (
            <div key={b.t} className="trust-item" style={{ textAlign:"center",padding:"24px 16px",
              borderRadius:16,cursor:"default" }}>
              <div style={{ display:"flex",justifyContent:"center",marginBottom:16,color:"#0f3f2f" }}>{b.icon}</div>
              <div style={{ fontSize:13,fontWeight:600,color:"#0f172a",marginBottom:6,
                fontFamily:"'DM Sans',system-ui,sans-serif" }}>{b.t}</div>
              <div style={{ fontSize:12,color:"#9ca3af",fontFamily:"'DM Sans',system-ui,sans-serif",
                lineHeight:1.6,fontWeight:300 }}>{b.d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION ROW
══════════════════════════════════════════════════════════════════ */
function SectionRow({ sec, delay, onProductClick }: {
  sec: Section; delay: number; onProductClick: (id:string)=>void;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const th   = THEME[sec.theme] ?? THEME.forest;
  const href = safeViewAll(sec.view_all);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.06 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scroll = (dir: "l"|"r") =>
    rowRef.current?.scrollBy({ left: dir==="r" ? 240 : -240, behavior:"smooth" });

  return (
    <div ref={ref} style={{
      marginBottom:"clamp(40px,5vw,64px)",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(32px)",
      transition:`opacity .6s ease ${delay}s, transform .6s ease ${delay}s`,
    }}>
      <div style={{ maxWidth:1400,margin:"0 auto",padding:"0 clamp(16px,4vw,48px)" }}>
        <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",
          marginBottom:16,flexWrap:"wrap",gap:12 }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:4 }}>
              {sec.badge && (
                <span style={{ fontSize:8,fontWeight:800,padding:"3px 10px",borderRadius:20,
                  background:th.accent,color:"#fff",letterSpacing:"1.2px",
                  fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:"uppercase" }}>
                  {sec.badge}
                </span>
              )}
              <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(22px,3vw,32px)",fontWeight:500,
                color:"#0f172a",margin:0,letterSpacing:"-0.02em" }}>
                {sec.title}
              </h2>
            </div>
            <p style={{ fontSize:11,color:"#9ca3af",margin:0,
              fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:300,letterSpacing:".3px" }}>
              {sec.subtitle}
            </p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            {(["l","r"] as const).map(d => (
              <button key={d} className="arrowbtn" onClick={()=>scroll(d)} style={{
                width:32,height:32,borderRadius:"50%",border:"1px solid #ddd6cc",
                background:"#fff",cursor:"pointer",display:"flex",
                alignItems:"center",justifyContent:"center",color:"#9ca3af",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {d==="l" ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
                </svg>
              </button>
            ))}
            <Link href={href} className="viewall-link" style={{
              fontSize:10,fontWeight:600,color:th.accent,textDecoration:"none",
              padding:"7px 16px",border:`1px solid ${th.accent}`,borderRadius:20,
              fontFamily:"'DM Sans',system-ui,sans-serif",whiteSpace:"nowrap",
              letterSpacing:".6px",textTransform:"uppercase",
            }}>View all</Link>
          </div>
        </div>
        <div style={{ height:1,marginBottom:20,
          background:`linear-gradient(90deg,${th.accent} 0%,rgba(0,0,0,.04) 50%,transparent 100%)` }} />
        <div ref={rowRef} className="scrollrow">
          {sec.products.map((p, i) => (
            <MagazineCard key={p.id} p={p} idx={i} theme={th} onClick={() => onProductClick(p.id)} />
          ))}
          <Link href={href} className="end-card" style={{ width:180,color:th.accent,background:"transparent" }}>
            <div style={{ width:40,height:40,borderRadius:"50%",
              border:`1.5px solid ${th.accent}`,display:"flex",
              alignItems:"center",justifyContent:"center",opacity:.7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span style={{ fontSize:10,fontWeight:600,textAlign:"center",
              fontFamily:"'DM Sans',system-ui,sans-serif",lineHeight:1.5,
              letterSpacing:".6px",textTransform:"uppercase",opacity:.8 }}>
              See all<br/>{sec.title}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAGAZINE CARD
══════════════════════════════════════════════════════════════════ */
function MagazineCard({ p, idx, theme, onClick }: {
  p: HP; idx: number; theme: typeof THEME[string]; onClick:()=>void;
}) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct && p.discount_pct > 0 ? p.discount_pct
    : (p.compare_price && p.compare_price > p.price
        ? Math.round(((p.compare_price - p.price)/p.compare_price)*100) : null);

  return (
    <div className="mcard" onClick={onClick}
      style={{ width:200, animation:`mCardIn .45s ease ${idx*.04}s both` }}>
      <div style={{ position:"relative",height:240,background:"#f0ede8",overflow:"hidden" }}>
        {p.main_image && !err
          ? <img src={p.main_image} alt={p.title} className="mcard-img"
              onError={()=>setErr(true)}
              style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} />
          : <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#ccc5b9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
        }
        <div style={{ position:"absolute",top:10,left:10,right:10,
          display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          {disc && disc > 0
            ? <div style={{ background:"#c62828",color:"#fff",fontSize:8,fontWeight:800,
                padding:"3px 8px",borderRadius:20,fontFamily:"'DM Sans',system-ui,sans-serif",
                letterSpacing:.5 }}>−{disc}%</div>
            : <div />}
          {!p.in_stock && (
            <div style={{ background:"rgba(0,0,0,.55)",backdropFilter:"blur(4px)",color:"#fff",
              fontSize:8,fontWeight:600,padding:"3px 8px",borderRadius:20,
              fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:.5 }}>Sold out</div>
          )}
        </div>
        <div className="mcard-reveal">
          <div style={{ fontSize:9,fontWeight:500,color:"rgba(255,255,255,.5)",
            fontFamily:"'DM Sans',system-ui,sans-serif",marginBottom:4,letterSpacing:".5px",
            textTransform:"uppercase" }}>{p.category ?? p.brand ?? ""}</div>
          <div style={{ fontSize:13,fontWeight:400,color:"#fff",
            fontFamily:"'Cormorant Garamond',Georgia,serif",lineHeight:1.3,
            overflow:"hidden",display:"-webkit-box",
            WebkitLineClamp:2,WebkitBoxOrient:"vertical",marginBottom:10 }}>
            {p.title}
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:7 }}>
              <span style={{ fontSize:14,fontWeight:700,color:"#b8933f",
                fontFamily:"'DM Sans',system-ui,sans-serif" }}>
                {formatCurrency(p.price)}
              </span>
              {p.compare_price && p.compare_price > p.price && (
                <span style={{ fontSize:9,color:"rgba(255,255,255,.3)",textDecoration:"line-through",
                  fontFamily:"'DM Sans',system-ui,sans-serif" }}>
                  {formatCurrency(p.compare_price)}
                </span>
              )}
            </div>
            {p.rating && p.rating > 0 && (
              <div style={{ display:"flex",alignItems:"center",gap:3 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#b8933f">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span style={{ fontSize:9,color:"rgba(255,255,255,.55)",
                  fontFamily:"'DM Sans',system-ui,sans-serif" }}>
                  {p.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding:"12px 14px 14px" }}>
        <div style={{ fontSize:10,fontWeight:400,color:"#b0a99f",
          fontFamily:"'DM Sans',system-ui,sans-serif",marginBottom:3,letterSpacing:".4px",
          textTransform:"uppercase" }}>{p.brand ?? p.category ?? ""}</div>
        <div style={{ fontSize:13,fontWeight:400,color:"#1c1917",
          fontFamily:"'Cormorant Garamond',Georgia,serif",lineHeight:1.35,
          overflow:"hidden",display:"-webkit-box",
          WebkitLineClamp:2,WebkitBoxOrient:"vertical",marginBottom:8 }}>
          {p.title}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <span style={{ fontSize:14,fontWeight:700,color:"#0f3f2f",
            fontFamily:"'DM Sans',system-ui,sans-serif" }}>
            {formatCurrency(p.price)}
          </span>
          {p.compare_price && p.compare_price > p.price && (
            <span style={{ fontSize:10,color:"#b0a99f",textDecoration:"line-through",
              fontFamily:"'DM Sans',system-ui,sans-serif" }}>
              {formatCurrency(p.compare_price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TRUST ICONS
══════════════════════════════════════════════════════════════════ */
function TIcon({ t }: { t:string }) {
  const icons: Record<string,React.ReactNode> = {
    delivery:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    auth:    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
    returns: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M3 8C5.5 4 10 2 14 2c5.5 0 10 4.5 10 10s-4.5 10-10 10c-4 0-7.5-2-9.5-5"/></svg>,
    secure:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  };
  return <>{icons[t]??null}</>;
}