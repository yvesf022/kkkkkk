"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

/* ─── API base ──────────────────────────────────────────────────── */
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

/* ─── Types ─────────────────────────────────────────────────────── */
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

/* ─── Hero slides ───────────────────────────────────────────────── */
const SLIDES = [
  { headline: "Discover Your\nSignature Style",   sub: "Curated collections crafted for the discerning eye" },
  { headline: "New Arrivals\nJust Landed",         sub: "Fresh styles updated daily — be the first to wear them" },
  { headline: "Luxury Finds\nAt Every Price",      sub: "Premium quality that doesn't compromise" },
  { headline: "The Season's\nBest Picks",          sub: "Trending now across all categories" },
];
const INTERVAL = 7000;

/* ─── Theme palette ─────────────────────────────────────────────── */
const THEME: Record<string, { accent: string; light: string; badge: string }> = {
  red:    { accent: "#c62828", light: "rgba(198,40,40,0.06)",  badge: "#c62828" },
  green:  { accent: "#0f3f2f", light: "rgba(15,63,47,0.06)",   badge: "#0f3f2f" },
  gold:   { accent: "#b8933f", light: "rgba(184,147,63,0.08)", badge: "#b8933f" },
  forest: { accent: "#1b5e4a", light: "rgba(27,94,74,0.06)",   badge: "#1b5e4a" },
  navy:   { accent: "#1a237e", light: "rgba(26,35,126,0.06)",  badge: "#1a237e" },
  plum:   { accent: "#6a1b9a", light: "rgba(106,27,154,0.06)", badge: "#6a1b9a" },
  teal:   { accent: "#00695c", light: "rgba(0,105,92,0.06)",   badge: "#00695c" },
  rust:   { accent: "#bf360c", light: "rgba(191,54,12,0.06)",  badge: "#bf360c" },
  slate:  { accent: "#37474f", light: "rgba(55,71,79,0.06)",   badge: "#37474f" },
  olive:  { accent: "#558b2f", light: "rgba(85,139,47,0.06)",  badge: "#558b2f" },
  rose:   { accent: "#ad1457", light: "rgba(173,20,87,0.06)",  badge: "#ad1457" },
  indigo: { accent: "#283593", light: "rgba(40,53,147,0.06)",  badge: "#283593" },
  amber:  { accent: "#e65100", light: "rgba(230,81,0,0.06)",   badge: "#e65100" },
  sage:   { accent: "#33691e", light: "rgba(51,105,30,0.06)",  badge: "#33691e" },
  stone:  { accent: "#4e342e", light: "rgba(78,52,46,0.06)",   badge: "#4e342e" },
};

/* Safe view_all URL — strips broken sort params, keeps only valid ones */
function safeViewAll(raw: string): string {
  try {
    const url = new URL(raw, "http://x");
    const search = url.searchParams.get("search");
    if (search) return `/products?search=${encodeURIComponent(search)}`;
    return "/products";
  } catch {
    return "/products";
  }
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
  const [dir,       setDir]       = useState<"next"|"prev">("next");
  const [heroLoad,  setHeroLoad]  = useState(true);
  const [progress,  setProgress]  = useState(0);
  const [featAnim,  setFeatAnim]  = useState<"idle"|"exit"|"enter">("idle");

  const [sections,  setSections]  = useState<Section[]>([]);
  const [secLoad,   setSecLoad]   = useState(true);

  const timerRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const t0Ref       = useRef(Date.now());

  useEffect(() => {
    productsApi.list({ page: 1, per_page: 40 })
      .then(r => {
        const all = shuffle((r as any)?.results ?? []);
        setHeroProds(all as ProductListItem[]);
      })
      .finally(() => setHeroLoad(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.json())
      .then(d => setSections(d.sections ?? []))
      .catch(() => setSections([]))
      .finally(() => setSecLoad(false));
  }, []);

  const advance = useCallback((d: "next"|"prev" = "next") => {
    if (animating || heroProds.length < 4) return;
    setAnimating(true); setDir(d);
    setFeatAnim("exit");
    setTimeout(() => {
      setSlideIdx(p => d === "next" ? (p+1)%SLIDES.length : (p-1+SLIDES.length)%SLIDES.length);
      setFeatAnim("enter");
      setTimeout(() => { setFeatAnim("idle"); setAnimating(false); }, 700);
    }, 450);
  }, [animating, heroProds.length]);

  useEffect(() => {
    if (heroProds.length < 4) return;
    t0Ref.current = Date.now(); setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - t0Ref.current) / INTERVAL) * 100, 100));
    }, 40);
    timerRef.current = setInterval(() => {
      t0Ref.current = Date.now(); setProgress(0); advance("next");
    }, INTERVAL);
    return () => { clearInterval(timerRef.current!); clearInterval(progressRef.current!); };
  }, [heroProds.length, advance]);

  /* Featured product = first of the current window */
  const heroWindow = heroProds.slice(slideIdx * 4, slideIdx * 4 + 4);
  const featured   = heroWindow[0] ?? heroProds[0];
  const side3      = heroWindow.slice(1, 4);
  const slide      = SLIDES[slideIdx];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f7f5f2", minHeight: "100vh" }}>

      {/* ── CSS ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(184,147,63,.3);border-radius:3px}

        @keyframes fadeSlideUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:none} }
        @keyframes featExit      { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(1.03)} }
        @keyframes featEnter     { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
        @keyframes marquee       { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
        @keyframes shimmer       { from{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes float1        { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-16px)} }
        @keyframes float2        { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-18px,14px)} }
        @keyframes revealLeft    { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:none} }
        @keyframes sideCardIn    { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
        @keyframes pulseRing     { 0%{transform:scale(.95);opacity:.7} 70%{transform:scale(1.08);opacity:0} 100%{opacity:0} }

        .shimbox{background:linear-gradient(90deg,#ece9e2 0%,#dedad2 50%,#ece9e2 100%);background-size:200% 100%;animation:shimmer 1.6s ease infinite;}

        /* Featured hero card */
        .feat-card { animation: none; transition: transform .5s ease, box-shadow .5s ease; }
        .feat-card.exit { animation: featExit .45s cubic-bezier(.4,0,.6,1) both; }
        .feat-card.enter { animation: featEnter .65s cubic-bezier(.2,.8,.3,1) both; }
        .feat-card:hover .feat-img { transform: scale(1.04); }
        .feat-img { transition: transform .7s cubic-bezier(.2,.8,.3,1); }

        /* Side cards */
        .scard { cursor:pointer; border-radius:12px; overflow:hidden; display:flex; background:#fff;
          border:1px solid rgba(0,0,0,.06); transition:all .28s ease; position:relative; }
        .scard:hover { transform:translateX(4px); box-shadow:0 8px 32px rgba(0,0,0,.1); }
        .scard:hover .scard-img { transform:scale(1.06); }
        .scard-img { transition:transform .4s ease; }

        /* Magazine product cards */
        .mcard { position:relative; border-radius:16px; overflow:hidden; cursor:pointer;
          background:#fff; border:1px solid rgba(0,0,0,.07);
          transition:all .38s cubic-bezier(.2,.8,.3,1); flex-shrink:0; }
        .mcard:hover { transform:translateY(-8px); box-shadow:0 24px 56px rgba(0,0,0,.14); }
        .mcard:hover .mcard-img { transform:scale(1.06); }
        .mcard-img { transition:transform .55s ease; width:100%; height:100%; object-fit:cover; display:block; }
        .mcard:hover .mcard-reveal { opacity:1; transform:translateY(0); }
        .mcard-reveal { position:absolute; bottom:0; left:0; right:0; padding:20px 16px 18px;
          background:linear-gradient(transparent,rgba(8,16,10,.85) 35%,rgba(4,8,6,.95));
          transform:translateY(8px); opacity:.85; transition:all .35s ease; }

        /* Scrollrow */
        .scrollrow { display:flex; gap:16px; overflow-x:auto; padding-bottom:16px; scroll-behavior:smooth; }
        .scrollrow::-webkit-scrollbar{ height:2px }
        .scrollrow::-webkit-scrollbar-thumb{ background:rgba(184,147,63,.35);border-radius:2px }

        /* Arrow buttons */
        .arrowbtn { transition:all .18s ease !important; }
        .arrowbtn:hover { background:#0f3f2f!important; color:#fff!important; border-color:#0f3f2f!important; }

        /* View all link */
        .viewall-link { transition:all .2s ease; }
        .viewall-link:hover { background:#0f3f2f!important; color:#fff!important; border-color:#0f3f2f!important; }

        /* End-of-row card */
        .end-card { flex-shrink:0; border-radius:16px; border:1.5px dashed rgba(184,147,63,.35);
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:12px; text-decoration:none; padding:24px 20px; transition:all .25s ease; }
        .end-card:hover { border-color:rgba(184,147,63,.7); background:rgba(184,147,63,.04)!important; }

        /* Trust icons hover */
        .trust-item { transition:transform .25s ease; }
        .trust-item:hover { transform:translateY(-3px); }

        /* Dot nav */
        .dot-nav { width:7px; height:7px; border-radius:4px; border:none; cursor:pointer;
          padding:0; transition:all .35s ease; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          HERO — CINEMATIC EDITORIAL LAYOUT
      ══════════════════════════════════════════════════════════ */}
      <section style={{
        position:"relative", overflow:"hidden",
        background:"linear-gradient(150deg,#04090d 0%,#071520 35%,#050e08 70%,#020608 100%)",
        minHeight:"clamp(520px,62vh,720px)",
        display:"flex", flexDirection:"column",
      }}>
        {/* grain overlay */}
        <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",
          backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.032'/%3E%3C/svg%3E")`,
          backgroundSize:"180px 180px", opacity:.8}} />

        {/* ambient orbs */}
        <div style={{position:"absolute",top:"-5%",left:"25%",width:500,height:500,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(184,147,63,.09) 0%,transparent 70%)",
          animation:"float1 16s ease-in-out infinite",zIndex:0,pointerEvents:"none"}} />
        <div style={{position:"absolute",bottom:"-15%",right:"10%",width:650,height:650,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(15,63,47,.22) 0%,transparent 70%)",
          animation:"float2 20s ease-in-out infinite",zIndex:0,pointerEvents:"none"}} />

        {/* vertical gold rule */}
        <div style={{position:"absolute",top:0,left:"50%",width:1,height:"100%",
          background:"linear-gradient(180deg,transparent,rgba(184,147,63,.12) 25%,rgba(184,147,63,.06) 75%,transparent)",
          zIndex:0,pointerEvents:"none"}} />

        {/* content grid */}
        <div style={{
          position:"relative",zIndex:1,flex:1,
          maxWidth:1400,margin:"0 auto",width:"100%",
          padding:"clamp(36px,5vw,72px) clamp(20px,4vw,56px)",
          display:"grid",
          gridTemplateColumns:"minmax(0,1fr) minmax(0,1.35fr)",
          gap:"clamp(28px,4vw,64px)",
          alignItems:"center",
        }}>

          {/* LEFT: copy + featured product */}
          <div>
            {/* text block */}
            {!heroLoad && slide ? (
              <div key={slideIdx} style={{animation:"revealLeft .55s ease both",marginBottom:32}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:9,marginBottom:22,
                  padding:"5px 14px",borderRadius:30,
                  background:"rgba(184,147,63,.1)",border:"1px solid rgba(184,147,63,.2)"}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:"#b8933f",display:"block",
                    boxShadow:"0 0 8px rgba(184,147,63,.6)"}} />
                  <span style={{fontSize:9,fontWeight:600,color:"#b8933f",letterSpacing:"2.8px",
                    textTransform:"uppercase",fontFamily:"'DM Sans',system-ui,sans-serif"}}>Karabo Boutique</span>
                </div>
                <h1 style={{
                  fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:"clamp(32px,5vw,62px)",fontWeight:500,
                  color:"#fff",lineHeight:1.07,margin:"0 0 14px",
                  whiteSpace:"pre-line",letterSpacing:"-0.02em",
                }}>
                  {slide.headline}
                </h1>
                <p style={{
                  fontFamily:"'DM Sans',system-ui,sans-serif",
                  fontSize:"clamp(13px,1.5vw,15px)",color:"rgba(255,255,255,.5)",
                  margin:"0 0 28px",lineHeight:1.75,fontWeight:300,
                }}>
                  {slide.sub}
                </p>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:32}}>
                  <Link href="/products" style={{
                    padding:"12px 26px",borderRadius:50,
                    background:"#b8933f",color:"#04090d",
                    fontWeight:600,fontSize:12,textDecoration:"none",
                    fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:".8px",
                    transition:"all .2s",boxShadow:"0 4px 24px rgba(184,147,63,.3)",
                    textTransform:"uppercase",
                  }}>Shop Now</Link>
                  <Link href="/products" style={{
                    padding:"12px 26px",borderRadius:50,
                    border:"1px solid rgba(255,255,255,.15)",
                    color:"rgba(255,255,255,.75)",fontWeight:400,fontSize:12,
                    textDecoration:"none",fontFamily:"'DM Sans',system-ui,sans-serif",
                    letterSpacing:".8px",textTransform:"uppercase",
                    transition:"all .2s",
                  }}>Explore All</Link>
                </div>
                {/* dot navigation */}
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {SLIDES.map((_,i) => (
                    <button key={i} className="dot-nav" onClick={() => {
                      if (i===slideIdx||animating) return;
                      clearInterval(timerRef.current!); clearInterval(progressRef.current!);
                      t0Ref.current=Date.now(); setProgress(0);
                      advance(i>slideIdx?"next":"prev");
                    }} style={{
                      width: i===slideIdx ? 26 : 7,
                      background: i===slideIdx ? "#b8933f" : "rgba(255,255,255,.2)",
                      position:"relative", overflow:"hidden",
                    }}>
                      {i===slideIdx && (
                        <span style={{
                          position:"absolute",top:0,left:0,height:"100%",
                          width:`${progress}%`, background:"rgba(255,255,255,.35)",
                          transition:"width 40ms linear",
                        }} />
                      )}
                    </button>
                  ))}
                  {/* nav arrows */}
                  {([["prev","←"],["next","→"]] as const).map(([d,icon])=>(
                    <button key={d} onClick={() => advance(d)} style={{
                      marginLeft:4,width:30,height:30,borderRadius:"50%",
                      border:"1px solid rgba(255,255,255,.15)",background:"transparent",
                      color:"rgba(255,255,255,.55)",cursor:"pointer",fontSize:13,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all .2s",fontFamily:"system-ui",
                    }} onMouseEnter={e=>{(e.target as any).style.background="rgba(184,147,63,.15)";(e.target as any).style.borderColor="rgba(184,147,63,.4)";(e.target as any).style.color="#b8933f";}}
                       onMouseLeave={e=>{(e.target as any).style.background="transparent";(e.target as any).style.borderColor="rgba(255,255,255,.15)";(e.target as any).style.color="rgba(255,255,255,.55)";}}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{marginBottom:32}}>
                <div style={{height:14,width:120,borderRadius:7,marginBottom:22}} className="shimbox" />
                <div style={{height:52,width:"85%",borderRadius:8,marginBottom:8}} className="shimbox" />
                <div style={{height:52,width:"65%",borderRadius:8,marginBottom:20}} className="shimbox" />
              </div>
            )}

            {/* FEATURED PRODUCT — large cinematic card */}
            {heroLoad ? (
              <div style={{borderRadius:20,overflow:"hidden",height:260}} className="shimbox" />
            ) : featured ? (
              <div
                className={`feat-card ${featAnim}`}
                onClick={() => router.push(`/products/${featured.id}`)}
                style={{
                  borderRadius:20,overflow:"hidden",cursor:"pointer",
                  position:"relative",
                  boxShadow:"0 24px 64px rgba(0,0,0,.5)",
                  height:"clamp(220px,22vw,300px)",
                }}
              >
                {/* image */}
                {(featured as any).main_image ? (
                  <img
                    src={(featured as any).main_image}
                    alt={featured.title}
                    className="feat-img"
                    style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}
                  />
                ) : (
                  <div style={{position:"absolute",inset:0,background:"rgba(15,26,58,.8)",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:"rgba(255,255,255,.2)",fontSize:40,fontFamily:"'Cormorant Garamond',serif"}}>K</span>
                  </div>
                )}

                {/* gradient overlay */}
                <div style={{position:"absolute",inset:0,
                  background:"linear-gradient(135deg,rgba(4,9,13,.7) 0%,transparent 50%,rgba(4,9,13,.4) 100%)"}} />

                {/* discount badge */}
                {(featured as any).compare_price && (featured as any).compare_price > featured.price && (
                  <div style={{position:"absolute",top:14,right:14,
                    background:"#b8933f",color:"#04090d",fontSize:10,fontWeight:700,
                    padding:"4px 10px",borderRadius:20,fontFamily:"'DM Sans',system-ui,sans-serif",
                    letterSpacing:.5}}>
                    -{Math.round(((((featured as any).compare_price - featured.price) / (featured as any).compare_price)) * 100)}% OFF
                  </div>
                )}

                {/* info overlay */}
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px 20px 18px",
                  background:"linear-gradient(transparent,rgba(4,9,13,.9))"}}>
                  <div style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,.45)",
                    fontFamily:"'DM Sans',system-ui,sans-serif",marginBottom:4,letterSpacing:.5,
                    textTransform:"uppercase"}}>{(featured as any).category ?? "Featured"}</div>
                  <div style={{fontSize:"clamp(13px,1.5vw,16px)",fontWeight:500,color:"#fff",
                    fontFamily:"'Cormorant Garamond',Georgia,serif",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:8}}>
                    {featured.title}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:"clamp(14px,1.6vw,18px)",fontWeight:700,color:"#b8933f",
                      fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                      {formatCurrency(featured.price)}
                    </span>
                    {(featured as any).compare_price && (featured as any).compare_price > featured.price && (
                      <span style={{fontSize:11,color:"rgba(255,255,255,.3)",textDecoration:"line-through",
                        fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                        {formatCurrency((featured as any).compare_price)}
                      </span>
                    )}
                    <span style={{marginLeft:"auto",fontSize:10,color:"rgba(255,255,255,.45)",
                      fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:.3}}>
                      View product →
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT: 3 side trend cards */}
          <div style={{display:"flex",flexDirection:"column",gap:"clamp(10px,1.5vw,16px)"}}>
            {/* "Trending Now" label */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{width:18,height:1,background:"rgba(184,147,63,.4)"}} />
              <span style={{fontSize:9,fontWeight:600,color:"rgba(184,147,63,.7)",letterSpacing:"2.5px",
                textTransform:"uppercase",fontFamily:"'DM Sans',system-ui,sans-serif"}}>Trending Now</span>
              <div style={{flex:1,height:1,background:"rgba(184,147,63,.15)"}} />
            </div>

            {heroLoad ? (
              Array.from({length:3}).map((_,i)=>(
                <div key={i} style={{borderRadius:12,overflow:"hidden",height:140}} className="shimbox" />
              ))
            ) : (
              side3.map((p, i) => {
                const disc = (p as any).compare_price && (p as any).compare_price > p.price
                  ? Math.round((((p as any).compare_price - p.price)/(p as any).compare_price)*100) : null;
                return (
                  <div key={`${slideIdx}-side-${i}`} className="scard"
                    onClick={() => router.push(`/products/${p.id}`)}
                    style={{animation:`sideCardIn .5s ease ${i*.08+.1}s both`,height:140}}>
                    {/* image */}
                    <div style={{width:140,flexShrink:0,position:"relative",overflow:"hidden",
                      background:"rgba(15,26,58,.8)"}}>
                      {(p as any).main_image && (
                        <img src={(p as any).main_image} alt={p.title} className="scard-img"
                          style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
                      )}
                      {disc && (
                        <div style={{position:"absolute",top:8,left:8,background:"#c62828",
                          color:"#fff",fontSize:8,fontWeight:800,padding:"2px 7px",
                          borderRadius:20,fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:.4}}>
                          -{disc}%
                        </div>
                      )}
                    </div>
                    {/* info */}
                    <div style={{flex:1,padding:"16px 18px",display:"flex",flexDirection:"column",
                      justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:9,fontWeight:500,color:"#9ca3af",marginBottom:6,
                          fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:.5,
                          textTransform:"uppercase"}}>{(p as any).category ?? (p as any).brand ?? "Product"}</div>
                        <div style={{fontSize:"clamp(13px,1.4vw,15px)",fontWeight:500,color:"#111",
                          fontFamily:"'Cormorant Garamond',Georgia,serif",lineHeight:1.35,
                          overflow:"hidden",display:"-webkit-box",
                          WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                          {p.title}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                        <span style={{fontSize:15,fontWeight:700,color:"#0f3f2f",
                          fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                          {formatCurrency(p.price)}
                        </span>
                        {(p as any).compare_price && (p as any).compare_price > p.price && (
                          <span style={{fontSize:10,color:"#9ca3af",textDecoration:"line-through",
                            fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                            {formatCurrency((p as any).compare_price)}
                          </span>
                        )}
                        {(p as any).rating && (p as any).rating > 0 && (
                          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:3}}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="#b8933f">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            <span style={{fontSize:10,color:"#6b7280",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                              {((p as any).rating as number).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Shop all CTA */}
            <Link href="/products" style={{
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4,
              padding:"13px 0",borderRadius:12,textDecoration:"none",
              border:"1px solid rgba(184,147,63,.25)",
              color:"rgba(184,147,63,.8)",fontSize:11,fontWeight:600,letterSpacing:".8px",
              fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:"uppercase",
              transition:"all .2s",background:"rgba(184,147,63,.04)",
            }} onMouseEnter={e=>{(e.currentTarget as any).style.background="rgba(184,147,63,.1)";(e.currentTarget as any).style.borderColor="rgba(184,147,63,.5)";}}
               onMouseLeave={e=>{(e.currentTarget as any).style.background="rgba(184,147,63,.04)";(e.currentTarget as any).style.borderColor="rgba(184,147,63,.25)";}}>
              Explore all products
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>

        {/* scroll cue */}
        <div style={{position:"absolute",bottom:18,left:"50%",transform:"translateX(-50%)",zIndex:2}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          MARQUEE TRUST BAR
      ══════════════════════════════════════════════════════════ */}
      <div style={{background:"#0f3f2f",overflow:"hidden",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{display:"flex",animation:"marquee 32s linear infinite",width:"300%"}}>
          {[0,1,2].map(gi => (
            <div key={gi} style={{display:"flex",flex:"0 0 33.333%",justifyContent:"space-around"}}>
              {["Free Delivery on Orders over M500","100% Authentic Products","Secure & Easy Checkout",
                "7-Day Easy Returns","Premium Gift Packaging","Lesotho's Finest Boutique"].map((t,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 24px",whiteSpace:"nowrap"}}>
                  <div style={{width:3,height:3,borderRadius:"50%",background:"#b8933f",flexShrink:0}} />
                  <span style={{fontSize:10,fontWeight:400,color:"rgba(255,255,255,.7)",
                    letterSpacing:".8px",fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:"uppercase"}}>{t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTIONS — MAGAZINE EDITORIAL LAYOUT
      ══════════════════════════════════════════════════════════ */}
      <div style={{paddingTop:"clamp(40px,5vw,64px)",paddingBottom:"clamp(56px,7vw,96px)"}}>
        {secLoad ? (
          <div style={{maxWidth:1400,margin:"0 auto",padding:"0 clamp(16px,4vw,48px)"}}>
            {[0,1,2].map(si => (
              <div key={si} style={{marginBottom:56}}>
                <div style={{height:18,width:180,borderRadius:6,marginBottom:8}} className="shimbox" />
                <div style={{height:1,marginBottom:20,background:"#e8e4dc"}} />
                <div style={{display:"flex",gap:16,overflow:"hidden"}}>
                  {Array.from({length:5}).map((_,i) => (
                    <div key={i} style={{flexShrink:0,width:210,borderRadius:16,overflow:"hidden",height:300}} className="shimbox" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div style={{textAlign:"center",padding:"100px 20px",color:"#9ca3af",
            fontFamily:"'DM Sans',system-ui,sans-serif"}}>
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
      <section style={{background:"#fff",borderTop:"1px solid #ede9e2"}}>
        <div style={{maxWidth:1400,margin:"0 auto",
          padding:"clamp(40px,5vw,72px) clamp(20px,4vw,56px)",
          display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
          gap:"clamp(24px,3vw,48px)"}}>
          {[
            { icon:<TIcon t="delivery"/>, t:"Free Delivery", d:"On all orders above M500" },
            { icon:<TIcon t="auth"/>,     t:"100% Authentic", d:"Every product verified & certified" },
            { icon:<TIcon t="returns"/>,  t:"Easy Returns",   d:"7-day hassle-free returns" },
            { icon:<TIcon t="secure"/>,   t:"Secure Payment", d:"Fully encrypted transactions" },
          ].map(b => (
            <div key={b.t} className="trust-item" style={{textAlign:"center",padding:"24px 16px",
              borderRadius:16,border:"1px solid transparent",transition:"all .25s ease",cursor:"default"}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:16,color:"#0f3f2f"}}>{b.icon}</div>
              <div style={{fontSize:13,fontWeight:600,color:"#0f172a",marginBottom:6,
                fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:".2px"}}>{b.t}</div>
              <div style={{fontSize:12,color:"#9ca3af",fontFamily:"'DM Sans',system-ui,sans-serif",lineHeight:1.6,fontWeight:300}}>{b.d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION ROW — MAGAZINE EDITORIAL CARDS
══════════════════════════════════════════════════════════════════ */
function SectionRow({ sec, delay, onProductClick }: {
  sec: Section; delay: number; onProductClick: (id:string)=>void;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const th = THEME[sec.theme] ?? THEME.forest;
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

  const scroll = (dir: "l"|"r") => {
    rowRef.current?.scrollBy({ left: dir==="r" ? 240 : -240, behavior:"smooth" });
  };

  return (
    <div ref={ref} style={{
      marginBottom:"clamp(40px,5vw,64px)",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(32px)",
      transition:`opacity .6s ease ${delay}s, transform .6s ease ${delay}s`,
    }}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"0 clamp(16px,4vw,48px)"}}>

        {/* section header */}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",
          marginBottom:16,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
              {sec.badge && (
                <span style={{
                  fontSize:8,fontWeight:800,padding:"3px 10px",borderRadius:20,
                  background:th.accent,color:"#fff",letterSpacing:"1.2px",
                  fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:"uppercase",
                }}>{sec.badge}</span>
              )}
              <h2 style={{
                fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(22px,3vw,32px)",fontWeight:500,
                color:"#0f172a",margin:0,letterSpacing:"-0.02em",
              }}>{sec.title}</h2>
            </div>
            <p style={{fontSize:11,color:"#9ca3af",margin:0,fontFamily:"'DM Sans',system-ui,sans-serif",
              fontWeight:300,letterSpacing:".3px"}}>{sec.subtitle}</p>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {(["l","r"] as const).map(d => (
              <button key={d} className="arrowbtn" onClick={()=>scroll(d)} style={{
                width:32,height:32,borderRadius:"50%",
                border:"1px solid #ddd6cc",background:"#fff",
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                color:"#9ca3af",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

        {/* thin accent rule */}
        <div style={{height:1,marginBottom:20,
          background:`linear-gradient(90deg,${th.accent} 0%,rgba(0,0,0,.04) 50%,transparent 100%)`}} />

        {/* scrollable row of magazine cards */}
        <div ref={rowRef} className="scrollrow">
          {sec.products.map((p, i) => (
            <MagazineCard key={p.id} p={p} idx={i} theme={th} onClick={() => onProductClick(p.id)} />
          ))}

          {/* end card */}
          <Link href={href} className="end-card" style={{
            width:180,color:th.accent,background:"transparent",
          }}>
            <div style={{width:40,height:40,borderRadius:"50%",
              border:`1.5px solid ${th.accent}`,display:"flex",
              alignItems:"center",justifyContent:"center",opacity:.7}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span style={{fontSize:10,fontWeight:600,textAlign:"center",
              fontFamily:"'DM Sans',system-ui,sans-serif",lineHeight:1.5,
              letterSpacing:".6px",textTransform:"uppercase",opacity:.8}}>
              See all<br/>{sec.title}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAGAZINE CARD — tall portrait, editorial hover reveal
══════════════════════════════════════════════════════════════════ */
function MagazineCard({ p, idx, theme, onClick }: {
  p: HP; idx: number; theme: typeof THEME[string]; onClick:()=>void;
}) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct && p.discount_pct > 0 ? p.discount_pct
    : (p.compare_price && p.compare_price > p.price
        ? Math.round(((p.compare_price - p.price)/p.compare_price)*100) : null);

  return (
    <div className="mcard" onClick={onClick} style={{
      width:200,
      animation:`fadeSlideUp .45s ease ${idx*.04}s both`,
    }}>
      {/* image area — tall portrait */}
      <div style={{position:"relative",height:240,background:"#f0ede8",overflow:"hidden"}}>
        {p.main_image && !err
          ? <img src={p.main_image} alt={p.title} className="mcard-img"
              onError={()=>setErr(true)}
              style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
          : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
              justifyContent:"center",flexDirection:"column",gap:6}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc5b9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
              </svg>
            </div>
        }

        {/* top badges */}
        <div style={{position:"absolute",top:10,left:10,right:10,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          {disc && disc > 0 ? (
            <div style={{background:"#c62828",color:"#fff",fontSize:8,fontWeight:800,
              padding:"3px 8px",borderRadius:20,fontFamily:"'DM Sans',system-ui,sans-serif",
              letterSpacing:.5}}>−{disc}%</div>
          ) : <div />}
          {!p.in_stock && (
            <div style={{background:"rgba(0,0,0,.55)",backdropFilter:"blur(4px)",color:"#fff",
              fontSize:8,fontWeight:600,padding:"3px 8px",borderRadius:20,
              fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:.5}}>Sold out</div>
          )}
        </div>

        {/* hover reveal — slides up from bottom */}
        <div className="mcard-reveal">
          <div style={{fontSize:9,fontWeight:500,color:"rgba(255,255,255,.5)",
            fontFamily:"'DM Sans',system-ui,sans-serif",marginBottom:4,letterSpacing:".5px",
            textTransform:"uppercase"}}>{p.category ?? p.brand ?? ""}</div>
          <div style={{fontSize:13,fontWeight:400,color:"#fff",
            fontFamily:"'Cormorant Garamond',Georgia,serif",lineHeight:1.3,
            overflow:"hidden",display:"-webkit-box",
            WebkitLineClamp:2,WebkitBoxOrient:"vertical",marginBottom:10}}>
            {p.title}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:14,fontWeight:700,color:"#b8933f",
                fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                {formatCurrency(p.price)}
              </span>
              {p.compare_price && p.compare_price > p.price && (
                <span style={{fontSize:9,color:"rgba(255,255,255,.3)",textDecoration:"line-through",
                  fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                  {formatCurrency(p.compare_price)}
                </span>
              )}
            </div>
            {p.rating && p.rating > 0 && (
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#b8933f">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span style={{fontSize:9,color:"rgba(255,255,255,.55)",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                  {p.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* card bottom info — visible always */}
      <div style={{padding:"12px 14px 14px"}}>
        <div style={{fontSize:10,fontWeight:400,color:"#b0a99f",
          fontFamily:"'DM Sans',system-ui,sans-serif",marginBottom:3,letterSpacing:".4px",
          textTransform:"uppercase"}}>{p.brand ?? p.category ?? ""}</div>
        <div style={{fontSize:13,fontWeight:400,color:"#1c1917",
          fontFamily:"'Cormorant Garamond',Georgia,serif",lineHeight:1.35,
          overflow:"hidden",display:"-webkit-box",
          WebkitLineClamp:2,WebkitBoxOrient:"vertical",marginBottom:8}}>
          {p.title}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14,fontWeight:700,color:"#0f3f2f",
            fontFamily:"'DM Sans',system-ui,sans-serif"}}>
            {formatCurrency(p.price)}
          </span>
          {p.compare_price && p.compare_price > p.price && (
            <span style={{fontSize:10,color:"#b0a99f",textDecoration:"line-through",
              fontFamily:"'DM Sans',system-ui,sans-serif"}}>
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