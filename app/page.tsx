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
  { headline: "Discover Your\nSignature Style",   sub: "Curated collections crafted for elegance" },
  { headline: "New Arrivals\nJust Landed",         sub: "Fresh styles updated daily" },
  { headline: "Luxury Finds\nAt Every Price",      sub: "Premium quality within reach" },
  { headline: "The Season's\nBest Picks",          sub: "Trending now across all categories" },
];
const INTERVAL = 6500;

/* ─── Theme palette ─────────────────────────────────────────────── */
const THEME: Record<string, { accent: string; light: string; badge: string }> = {
  red:    { accent: "#e53935", light: "rgba(229,57,53,0.08)",  badge: "#e53935" },
  green:  { accent: "#0f3f2f", light: "rgba(15,63,47,0.07)",   badge: "#0f3f2f" },
  gold:   { accent: "#c8a75a", light: "rgba(200,167,90,0.1)",  badge: "#c8a75a" },
  forest: { accent: "#1b5e4a", light: "rgba(27,94,74,0.08)",   badge: "#1b5e4a" },
  navy:   { accent: "#1a237e", light: "rgba(26,35,126,0.07)",  badge: "#1a237e" },
  plum:   { accent: "#6a1b9a", light: "rgba(106,27,154,0.07)", badge: "#6a1b9a" },
  teal:   { accent: "#00695c", light: "rgba(0,105,92,0.07)",   badge: "#00695c" },
  rust:   { accent: "#bf360c", light: "rgba(191,54,12,0.07)",  badge: "#bf360c" },
  slate:  { accent: "#37474f", light: "rgba(55,71,79,0.07)",   badge: "#37474f" },
  olive:  { accent: "#558b2f", light: "rgba(85,139,47,0.07)",  badge: "#558b2f" },
  rose:   { accent: "#ad1457", light: "rgba(173,20,87,0.07)",  badge: "#ad1457" },
  indigo: { accent: "#283593", light: "rgba(40,53,147,0.07)",  badge: "#283593" },
  amber:  { accent: "#e65100", light: "rgba(230,81,0,0.07)",   badge: "#e65100" },
  sage:   { accent: "#33691e", light: "rgba(51,105,30,0.07)",  badge: "#33691e" },
  stone:  { accent: "#4e342e", light: "rgba(78,52,46,0.07)",   badge: "#4e342e" },
};

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

  /* hero */
  const [heroProds, setHeroProds] = useState<ProductListItem[]>([]);
  const [slideIdx,  setSlideIdx]  = useState(0);
  const [animating, setAnimating] = useState(false);
  const [dir,       setDir]       = useState<"next"|"prev">("next");
  const [cards,     setCards]     = useState<("idle"|"exit"|"enter")[]>(["idle","idle","idle","idle"]);
  const [heroLoad,  setHeroLoad]  = useState(true);
  const [progress,  setProgress]  = useState(0);

  /* sections */
  const [sections,  setSections]  = useState<Section[]>([]);
  const [secLoad,   setSecLoad]   = useState(true);

  const timerRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const t0Ref       = useRef(Date.now());

  /* load hero */
  useEffect(() => {
    productsApi.list({ page: 1, per_page: 40 })
      .then(r => {
        const all = shuffle((r as any)?.results ?? []);
        setHeroProds(all as ProductListItem[]);
      })
      .finally(() => setHeroLoad(false));
  }, []);

  /* load sections */
  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.json())
      .then(d => setSections(d.sections ?? []))
      .catch(() => setSections([]))
      .finally(() => setSecLoad(false));
  }, []);

  /* advance slide */
  const advance = useCallback((d: "next"|"prev" = "next") => {
    if (animating || heroProds.length < 4) return;
    setAnimating(true); setDir(d);
    setCards(["exit","idle","idle","idle"]);
    setTimeout(() => setCards(["exit","exit","idle","idle"]), 70);
    setTimeout(() => setCards(["exit","exit","exit","idle"]), 140);
    setTimeout(() => setCards(["exit","exit","exit","exit"]), 210);
    setTimeout(() => {
      setSlideIdx(p => d === "next" ? (p+1)%SLIDES.length : (p-1+SLIDES.length)%SLIDES.length);
      setCards(["enter","idle","idle","idle"]);
      setTimeout(() => setCards(["enter","enter","idle","idle"]), 90);
      setTimeout(() => setCards(["enter","enter","enter","idle"]), 180);
      setTimeout(() => setCards(["enter","enter","enter","enter"]), 270);
      setTimeout(() => { setCards(["idle","idle","idle","idle"]); setAnimating(false); }, 700);
    }, 440);
  }, [animating, heroProds.length]);

  /* timer */
  useEffect(() => {
    if (heroProds.length < 4) return;
    t0Ref.current = Date.now(); setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - t0Ref.current) / INTERVAL) * 100, 100));
    }, 40);
    timerRef.current = setInterval(() => {
      t0Ref.current = Date.now(); setProgress(0); advance("next");
    }, INTERVAL);
    return () => {
      clearInterval(timerRef.current!);
      clearInterval(progressRef.current!);
    };
  }, [heroProds.length, advance]);

  /* hero product windows (4 at a time) */
  const heroWindow = heroProds.slice(slideIdx * 4, slideIdx * 4 + 4);
  const slide      = SLIDES[slideIdx];

  /* ── RENDER ─────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f5f3ef", minHeight: "100vh" }}>

      {/* ── CSS ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(200,167,90,.35);border-radius:4px}

        @keyframes slideUpFade  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
        @keyframes slideDownFade{ from{opacity:0;transform:translateY(-22px)} to{opacity:1;transform:none} }
        @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(28px,-22px) scale(1.04)} 66%{transform:translate(-18px,14px) scale(.97)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 45%{transform:translate(-22px,-28px) scale(1.06)} 70%{transform:translate(18px,10px) scale(.96)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(14px,-22px)} }
        @keyframes marquee{ from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
        @keyframes shimmer{ from{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes bounceY{ 0%,100%{transform:translateX(-50%) translateY(0);opacity:.5} 50%{transform:translateX(-50%) translateY(7px);opacity:1} }
        @keyframes revealUp{ from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:none} }

        @keyframes cardExitN  { from{opacity:1;transform:translateY(0) scale(1)}    to{opacity:0;transform:translateY(-20px) scale(.96)} }
        @keyframes cardExitP  { from{opacity:1;transform:translateY(0) scale(1)}    to{opacity:0;transform:translateY(20px) scale(.96)} }
        @keyframes cardEnterN { from{opacity:0;transform:translateY(20px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes cardEnterP { from{opacity:0;transform:translateY(-20px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }

        .hcard:hover  { transform:translateY(-6px) scale(1.02)!important; box-shadow:0 20px 50px rgba(0,0,0,.5)!important; }
        .pcard        { transition:transform .28s ease, box-shadow .28s ease; }
        .pcard:hover  { transform:translateY(-5px)!important; box-shadow:0 12px 36px rgba(0,0,0,.13)!important; }
        .pcard:hover .ptitle{ color:#0f3f2f!important; }
        .pcard:hover .pimg  { transform:scale(1.05); }
        .pimg         { transition:transform .4s ease; }

        .scrollrow              { display:flex;gap:14px;overflow-x:auto;padding-bottom:12px;scroll-behavior:smooth; }
        .scrollrow::-webkit-scrollbar{ height:3px }
        .scrollrow::-webkit-scrollbar-thumb{ background:rgba(200,167,90,.4);border-radius:3px }

        .catpill:hover{ background:#0f3f2f!important;color:#fff!important;border-color:#0f3f2f!important; }
        .arrowbtn:hover{ background:#0f3f2f!important;color:#fff!important;border-color:#0f3f2f!important; }

        .shimbox{background:linear-gradient(90deg,#ece9e2 0%,#dedad2 50%,#ece9e2 100%);background-size:200% 100%;animation:shimmer 1.6s ease infinite;}
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <section style={{
        position:"relative", overflow:"hidden",
        minHeight:"clamp(480px,58vh,640px)",
        background:"linear-gradient(155deg,#04080e 0%,#081428 30%,#06200f 65%,#030b05 100%)",
        display:"flex", flexDirection:"column",
      }}>
        {/* grain */}
        <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",
          backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
          backgroundSize:"180px 180px",opacity:.7}} />

        {/* orbs */}
        <div style={{position:"absolute",top:"-8%",left:"2%",width:480,height:480,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(200,167,90,.1) 0%,transparent 70%)",
          animation:"float1 14s ease-in-out infinite",zIndex:0}} />
        <div style={{position:"absolute",bottom:"-12%",right:"5%",width:600,height:600,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(15,63,47,.28) 0%,transparent 70%)",
          animation:"float2 18s ease-in-out infinite",zIndex:0}} />
        <div style={{position:"absolute",top:"35%",right:"28%",width:220,height:220,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(200,167,90,.07) 0%,transparent 70%)",
          animation:"float3 11s ease-in-out infinite",zIndex:0}} />

        {/* gold diagonal line accent */}
        <div style={{position:"absolute",top:0,right:"38%",width:1,height:"100%",
          background:"linear-gradient(180deg,transparent,rgba(200,167,90,.15) 30%,rgba(200,167,90,.08) 70%,transparent)",
          zIndex:0}} />

        {/* content */}
        <div style={{
          position:"relative",zIndex:1,flex:1,
          maxWidth:1400,margin:"0 auto",width:"100%",
          padding:"clamp(40px,6vw,88px) clamp(20px,4vw,60px)",
          display:"grid",gridTemplateColumns:"auto 1fr",
          gap:"clamp(32px,5vw,80px)",alignItems:"center",
        }}>
          {/* LEFT: text */}
          <div style={{maxWidth:400}}>
            {slide && !heroLoad ? (
              <div key={slideIdx} style={{animation:"slideUpFade .55s ease both"}}>
                {/* badge */}
                <div style={{display:"inline-flex",alignItems:"center",gap:8,
                  padding:"6px 16px",borderRadius:30,marginBottom:24,
                  background:"rgba(200,167,90,.1)",border:"1px solid rgba(200,167,90,.22)"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#c8a75a",display:"block"}} />
                  <span style={{fontSize:10,fontWeight:600,color:"#c8a75a",letterSpacing:"2.5px",
                    textTransform:"uppercase",fontFamily:"'Jost',system-ui,sans-serif"}}>Karabo Luxury</span>
                </div>

                {/* headline */}
                <h1 style={{
                  fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:"clamp(34px,5.5vw,66px)",fontWeight:600,
                  color:"#fff",lineHeight:1.08,margin:"0 0 18px",
                  whiteSpace:"pre-line",letterSpacing:"-0.02em",
                }}>
                  {slide.headline}
                </h1>

                {/* sub */}
                <p style={{
                  fontFamily:"'Jost',system-ui,sans-serif",
                  fontSize:"clamp(13px,1.6vw,16px)",color:"rgba(255,255,255,.6)",
                  margin:"0 0 32px",lineHeight:1.7,
                }}>
                  {slide.sub}
                </p>

                {/* CTAs */}
                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:36}}>
                  <Link href="/products" style={{
                    padding:"13px 28px",borderRadius:50,
                    background:"#c8a75a",color:"#08100a",
                    fontWeight:600,fontSize:13,textDecoration:"none",
                    fontFamily:"'Jost',system-ui,sans-serif",letterSpacing:.5,
                    transition:"all .2s",boxShadow:"0 4px 20px rgba(200,167,90,.3)",
                  }}>Shop Now</Link>
                  <Link href="/products?sort=newest" style={{
                    padding:"13px 28px",borderRadius:50,
                    border:"1px solid rgba(255,255,255,.2)",
                    color:"rgba(255,255,255,.85)",fontWeight:500,fontSize:13,
                    textDecoration:"none",fontFamily:"'Jost',system-ui,sans-serif",letterSpacing:.5,
                  }}>New Arrivals</Link>
                </div>

                {/* progress dots */}
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {SLIDES.map((_,i) => (
                    <button key={i} onClick={() => {
                      if (i===slideIdx||animating) return;
                      clearInterval(timerRef.current!); clearInterval(progressRef.current!);
                      t0Ref.current=Date.now(); setProgress(0);
                      advance(i>slideIdx?"next":"prev");
                    }} style={{
                      width: i===slideIdx ? 28 : 7, height:7,
                      borderRadius:4, border:"none", cursor:"pointer", padding:0,
                      transition:"all .35s ease",
                      background: i===slideIdx ? "#c8a75a" : "rgba(255,255,255,.22)",
                      position:"relative", overflow:"hidden",
                    }}>
                      {i===slideIdx && (
                        <span style={{
                          position:"absolute",top:0,left:0,height:"100%",
                          width:`${progress}%`,
                          background:"rgba(255,255,255,.3)",transition:"width 40ms linear",
                        }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* skeleton */
              <div>
                <div style={{height:16,width:120,borderRadius:8,marginBottom:24}} className="shimbox" />
                <div style={{height:56,width:"80%",borderRadius:10,marginBottom:10}} className="shimbox" />
                <div style={{height:56,width:"60%",borderRadius:10,marginBottom:20}} className="shimbox" />
              </div>
            )}
          </div>

          {/* RIGHT: 2×2 product cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"clamp(10px,1.5vw,18px)"}}>
            {heroLoad
              ? Array.from({length:4}).map((_,i) => (
                  <div key={i} style={{borderRadius:18,overflow:"hidden"}}>
                    <div style={{paddingTop:"100%"}} className="shimbox" />
                    <div style={{padding:12,background:"rgba(255,255,255,.04)"}}>
                      <div style={{height:11,borderRadius:6,marginBottom:8,background:"rgba(255,255,255,.07)"}} />
                      <div style={{height:15,width:"50%",borderRadius:6,background:"rgba(255,255,255,.05)"}} />
                    </div>
                  </div>
                ))
              : heroWindow.length >= 4
                ? heroWindow.map((p,i) => (
                    <HeroCard key={`${slideIdx}-${p.id}`} p={p} state={cards[i]} dir={dir}
                      onClick={() => router.push(`/products/${p.id}`)} />
                  ))
                : heroProds.slice(0,4).map((p,i) => (
                    <HeroCard key={p.id} p={p} state="idle" dir="next"
                      onClick={() => router.push(`/products/${p.id}`)} />
                  ))
            }
          </div>
        </div>

        {/* bounce arrow */}
        <div style={{position:"absolute",bottom:22,left:"50%",zIndex:2,
          animation:"bounceY 2.2s ease-in-out infinite"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          MARQUEE TRUST BAR
      ══════════════════════════════════════════════════════════ */}
      <div style={{background:"#0f3f2f",overflow:"hidden"}}>
        <div style={{display:"flex",animation:"marquee 30s linear infinite",width:"300%"}}>
          {[0,1,2].map(gi => (
            <div key={gi} style={{display:"flex",flex:"0 0 33.333%",justifyContent:"space-around"}}>
              {["Free Delivery on Orders over M500","100% Authentic Products","Secure & Easy Checkout",
                "7-Day Easy Returns","Premium Gift Packaging","Lesotho's Finest Boutique"].map((t,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 24px",whiteSpace:"nowrap"}}>
                  <div style={{width:4,height:4,borderRadius:"50%",background:"#c8a75a",flexShrink:0}} />
                  <span style={{fontSize:11,fontWeight:500,color:"rgba(255,255,255,.8)",
                    letterSpacing:.6,fontFamily:"'Jost',system-ui,sans-serif"}}>{t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTIONS
      ══════════════════════════════════════════════════════════ */}
      <div style={{paddingTop:"clamp(28px,4vw,48px)",paddingBottom:"clamp(48px,6vw,80px)"}}>
        {secLoad ? (
          <div style={{maxWidth:1400,margin:"0 auto",padding:"0 clamp(16px,4vw,40px)"}}>
            {[0,1,2].map(si => (
              <div key={si} style={{marginBottom:48}}>
                <div style={{height:22,width:200,borderRadius:8,marginBottom:8}} className="shimbox" />
                <div style={{height:14,width:300,borderRadius:6,marginBottom:20}} className="shimbox" />
                <div style={{display:"flex",gap:14,overflow:"hidden"}}>
                  {Array.from({length:5}).map((_,i) => (
                    <div key={i} style={{flexShrink:0,width:190,borderRadius:14,overflow:"hidden"}}>
                      <div style={{paddingTop:"100%"}} className="shimbox" />
                      <div style={{padding:12,background:"#ede9e2"}}>
                        <div style={{height:12,borderRadius:6,marginBottom:6}} className="shimbox" />
                        <div style={{height:16,width:"55%",borderRadius:6}} className="shimbox" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div style={{textAlign:"center",padding:"80px 20px",color:"#9ca3af",
            fontFamily:"'Jost',system-ui,sans-serif"}}>
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
      <section style={{background:"#fff",borderTop:"1px solid #e8e4dc"}}>
        <div style={{maxWidth:1400,margin:"0 auto",
          padding:"clamp(36px,5vw,64px) clamp(20px,4vw,60px)",
          display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
          gap:"clamp(20px,3vw,40px)"}}>
          {[
            { icon:<TIcon t="delivery"/>, t:"Free Delivery", d:"On all orders above M500" },
            { icon:<TIcon t="auth"/>,     t:"100% Authentic", d:"Every product verified" },
            { icon:<TIcon t="returns"/>,  t:"Easy Returns",   d:"7-day hassle-free returns" },
            { icon:<TIcon t="secure"/>,   t:"Secure Payment", d:"Fully protected transactions" },
          ].map(b => (
            <div key={b.t} style={{textAlign:"center",padding:"20px 10px"}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:14,color:"#0f3f2f"}}>{b.icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:5,
                fontFamily:"'Jost',system-ui,sans-serif"}}>{b.t}</div>
              <div style={{fontSize:12,color:"#6b7280",fontFamily:"'Jost',system-ui,sans-serif",lineHeight:1.5}}>{b.d}</div>
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
  const th = THEME[sec.theme] ?? THEME.forest;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scroll = (dir: "l"|"r") => {
    rowRef.current?.scrollBy({ left: dir==="r" ? 220 : -220, behavior:"smooth" });
  };

  return (
    <div ref={ref} style={{
      marginBottom:"clamp(28px,4vw,48px)",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(28px)",
      transition:`opacity .55s ease ${delay}s, transform .55s ease ${delay}s`,
    }}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"0 clamp(16px,4vw,40px)"}}>

        {/* header */}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",
          marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <h2 style={{
                fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(20px,2.8vw,30px)",fontWeight:600,
                color:"#0f172a",margin:0,letterSpacing:"-0.02em",
              }}>{sec.title}</h2>
              {sec.badge && (
                <span style={{
                  fontSize:9,fontWeight:800,padding:"3px 9px",borderRadius:20,
                  background:th.accent,color:"#fff",letterSpacing:.8,
                  fontFamily:"'Jost',system-ui,sans-serif",
                }}>{sec.badge}</span>
              )}
            </div>
            <p style={{fontSize:11,color:"#6b7280",margin:0,fontFamily:"'Jost',system-ui,sans-serif"}}>{sec.subtitle}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {(["l","r"] as const).map(d => (
              <button key={d} className="arrowbtn" onClick={()=>scroll(d)} style={{
                width:34,height:34,borderRadius:"50%",
                border:"1px solid #ddd6cc",background:"#fff",
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                color:"#6b7280",transition:"all .18s",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {d==="l" ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
                </svg>
              </button>
            ))}
            <Link href={sec.view_all} style={{
              fontSize:11,fontWeight:600,color:th.accent,textDecoration:"none",
              padding:"6px 14px",border:`1px solid ${th.accent}`,borderRadius:20,
              fontFamily:"'Jost',system-ui,sans-serif",whiteSpace:"nowrap",transition:"all .18s",
            }}>View all →</Link>
          </div>
        </div>

        {/* gold gradient rule */}
        <div style={{height:2,marginBottom:16,borderRadius:1,
          background:`linear-gradient(90deg,${th.accent} 0%,${th.light.replace(")","").replace("rgba","rgb").replace(",0.",")")||"transparent"} 60%,transparent 100%)`}} />

        {/* scrollable row */}
        <div ref={rowRef} className="scrollrow">
          {sec.products.map((p, i) => (
            <ProductCard key={p.id} p={p} idx={i} theme={th} onClick={() => onProductClick(p.id)} />
          ))}
          {/* view-all end card */}
          <Link href={sec.view_all} style={{
            flexShrink:0,width:160,borderRadius:14,
            border:"1.5px dashed #ccc6bc",display:"flex",
            flexDirection:"column",alignItems:"center",justifyContent:"center",
            gap:10,textDecoration:"none",color:th.accent,padding:20,
            background:th.light,transition:"all .2s",
          }}>
            <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,.06)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span style={{fontSize:11,fontWeight:600,textAlign:"center",
              fontFamily:"'Jost',system-ui,sans-serif",lineHeight:1.4}}>
              See all<br/>{sec.title}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRODUCT CARD
══════════════════════════════════════════════════════════════════ */
function ProductCard({ p, idx, theme, onClick }: {
  p: HP; idx: number; theme: typeof THEME[string]; onClick:()=>void;
}) {
  const [err, setErr] = useState(false);
  return (
    <div className="pcard" onClick={onClick} style={{
      flexShrink:0, width:186, borderRadius:14, overflow:"hidden",
      background:"#fff", border:"1px solid #eae6df",
      cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,.05)",
      animation:`slideUpFade .4s ease ${idx*.03}s both`,
    }}>
      {/* image */}
      <div style={{position:"relative",paddingTop:"100%",background:"#f5f3ef",overflow:"hidden"}}>
        {p.main_image && !err
          ? <img src={p.main_image} alt={p.title} onError={()=>setErr(true)}
              className="pimg"
              style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
          : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ccc5b9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
              </svg>
            </div>
        }
        {p.discount_pct && p.discount_pct > 0 && (
          <div style={{position:"absolute",top:8,left:8,background:"#e53935",
            color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",
            borderRadius:20,fontFamily:"'Jost',system-ui,sans-serif",letterSpacing:.4}}>
            -{p.discount_pct}%
          </div>
        )}
        {!p.in_stock && (
          <div style={{position:"absolute",inset:0,background:"rgba(255,255,255,.65)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:10,fontWeight:700,color:"#6b7280",
              background:"#fff",padding:"3px 9px",borderRadius:8,
              fontFamily:"'Jost',system-ui,sans-serif"}}>Out of stock</span>
          </div>
        )}
      </div>

      {/* info */}
      <div style={{padding:"12px 13px 15px"}}>
        <p className="ptitle" style={{
          fontFamily:"'Jost',system-ui,sans-serif",
          fontSize:12,fontWeight:500,color:"#1c1917",
          margin:"0 0 6px",lineHeight:1.35,
          overflow:"hidden",display:"-webkit-box",
          WebkitLineClamp:2,WebkitBoxOrient:"vertical",
          transition:"color .15s",
        }}>{p.title}</p>

        {/* stars */}
        {p.rating && p.rating > 0 && (
          <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:6}}>
            <div style={{display:"flex",gap:1}}>
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="9" height="9" viewBox="0 0 24 24"
                  fill={s<=Math.round(p.rating!) ? "#c8a75a" : "#e2ddd6"}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </div>
            {(p.rating_number ?? 0) > 0 && (
              <span style={{fontSize:9,color:"#9ca3af",fontFamily:"'Jost',system-ui,sans-serif"}}>
                ({p.rating_number})
              </span>
            )}
          </div>
        )}

        {/* price */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:15,fontWeight:800,color:"#0f3f2f",
            fontFamily:"'Jost',system-ui,sans-serif"}}>
            {formatCurrency(p.price)}
          </span>
          {p.compare_price && p.compare_price > p.price && (
            <span style={{fontSize:10,color:"#9ca3af",textDecoration:"line-through",
              fontFamily:"'Jost',system-ui,sans-serif"}}>
              {formatCurrency(p.compare_price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO CARD
══════════════════════════════════════════════════════════════════ */
function HeroCard({ p, state, dir, onClick }: {
  p: ProductListItem; state:"idle"|"exit"|"enter"; dir:"next"|"prev"; onClick:()=>void;
}) {
  const anim = {
    exit:  dir==="next" ? "cardExitN" : "cardExitP",
    enter: dir==="next" ? "cardEnterN" : "cardEnterP",
    idle:  "none",
  }[state];

  const disc = p.compare_price && p.compare_price > p.price
    ? Math.round(((p.compare_price - p.price)/p.compare_price)*100) : null;

  return (
    <div className="hcard" onClick={onClick} style={{
      borderRadius:18,overflow:"hidden",cursor:"pointer",
      background:"rgba(255,255,255,.07)",backdropFilter:"blur(18px)",
      border:"1px solid rgba(255,255,255,.1)",
      boxShadow:"0 16px 40px rgba(0,0,0,.4)",
      transition:"transform .3s ease,box-shadow .3s ease",
      animation:`${anim} .45s cubic-bezier(.4,0,.2,1) both`,
    }}>
      <div style={{position:"relative",paddingTop:"100%",background:"rgba(15,26,58,.8)"}}>
        {p.main_image && (
          <img src={p.main_image} alt={p.title}
            style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
        )}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"55%",
          background:"linear-gradient(transparent,rgba(0,0,0,.65))"}} />
        {disc && (
          <div style={{position:"absolute",top:10,left:10,background:"#c8a75a",
            color:"#08100a",fontSize:9,fontWeight:800,padding:"2px 8px",
            borderRadius:99,fontFamily:"'Jost',system-ui,sans-serif",letterSpacing:.5}}>
            -{disc}%
          </div>
        )}
      </div>
      <div style={{padding:"clamp(10px,1.4vw,14px)"}}>
        <div style={{fontSize:"clamp(10px,1.1vw,12px)",fontWeight:500,
          color:"rgba(255,255,255,.88)",overflow:"hidden",textOverflow:"ellipsis",
          whiteSpace:"nowrap",marginBottom:4,fontFamily:"'Jost',system-ui,sans-serif"}}>
          {p.title}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:"clamp(12px,1.4vw,16px)",fontWeight:800,color:"#c8a75a"}}>
            {formatCurrency(p.price)}
          </span>
          {p.compare_price && p.compare_price > p.price && (
            <span style={{fontSize:10,color:"rgba(255,255,255,.35)",
              textDecoration:"line-through",fontFamily:"'Jost',system-ui,sans-serif"}}>
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
    delivery:<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    auth:    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
    returns: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M3 8C5.5 4 10 2 14 2c5.5 0 10 4.5 10 10s-4.5 10-10 10c-4 0-7.5-2-9.5-5"/></svg>,
    secure:  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  };
  return <>{icons[t]??null}</>;
}
