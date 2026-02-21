"use client";

import { useEffect, useState } from "react";

export default function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit" | "done">("enter");

  useEffect(() => {
    // Phase timeline — keep total under 2.5s so it feels snappy
    const t1 = setTimeout(() => setPhase("hold"),   800);  // animations settle
    const t2 = setTimeout(() => setPhase("exit"),  1800);  // start exit
    const t3 = setTimeout(() => {                          // fully gone
      setPhase("done");
      onComplete?.();
    }, 2500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cinzel:wght@400;600&display=swap');

        .ks-splash {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #050e08;
          /* Paint immediately — no waiting for fonts or other resources */
          contain: strict;
          will-change: opacity, transform;
          transition: opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ks-splash.exit {
          opacity: 0;
          transform: scale(1.04);
        }

        /* ── Deep emerald gradient background ── */
        .ks-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 110%, #0a3320 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 20% 20%,  #0d2b1a 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 0%,   #081f12 0%, transparent 50%),
            linear-gradient(160deg, #040d07 0%, #071610 40%, #050e08 100%);
        }

        /* ── Noise grain texture ── */
        .ks-grain {
          position: absolute;
          inset: 0;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 128px 128px;
        }

        /* ── Gold radial glow ── */
        .ks-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,160,60,0.12) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: ks-pulse 3s ease-in-out infinite;
        }

        @keyframes ks-pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.15); }
        }

        /* ── Floating gold particles ── */
        .ks-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .ks-p {
          position: absolute;
          border-radius: 50%;
          background: #c8a03c;
          animation: ks-float linear infinite;
          opacity: 0;
        }

        @keyframes ks-float {
          0%   { transform: translateY(110vh) translateX(0px) rotate(0deg);   opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-10vh)  translateX(30px) rotate(360deg); opacity: 0; }
        }

        /* ── Lesotho mountain silhouette ── */
        .ks-mountains {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 45%;
          opacity: 0;
          animation: ks-rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
        }

        @keyframes ks-rise {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Horizontal gold lines ── */
        .ks-lines {
          position: absolute;
          left: 0; right: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
          opacity: 0.08;
          pointer-events: none;
        }

        .ks-lines .line {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #c8a03c 50%, transparent 100%);
        }

        /* ── Logo mark ── */
        .ks-logomark {
          position: relative;
          z-index: 2;
          width: 88px;
          height: 88px;
          border-radius: 22px;
          background: linear-gradient(145deg, #0d3d26 0%, #0a2a1a 100%);
          border: 1px solid rgba(200,160,60,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 0 1px rgba(200,160,60,0.1),
            0 0 40px rgba(200,160,60,0.15),
            inset 0 1px 0 rgba(255,255,255,0.06);
          opacity: 0;
          transform: scale(0.7) translateY(10px);
          animation: ks-popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0s forwards;
          margin-bottom: 28px;
        }

        @keyframes ks-popIn {
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .ks-logomark-k {
          font-family: 'Cinzel', 'Georgia', serif;
          font-size: 48px;
          font-weight: 600;
          color: #c8a03c;
          line-height: 1;
          letter-spacing: -1px;
          text-shadow: 0 0 30px rgba(200,160,60,0.5);
        }

        .ks-logomark-dot {
          position: absolute;
          top: 10px;
          right: 12px;
          width: 7px;
          height: 7px;
          background: #c8a03c;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(200,160,60,0.8);
          animation: ks-dotPulse 2s ease-in-out 1s infinite;
        }

        @keyframes ks-dotPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(200,160,60,0.8); }
          50%       { box-shadow: 0 0 20px rgba(200,160,60,1), 0 0 40px rgba(200,160,60,0.4); }
        }

        /* ── Brand text ── */
        .ks-brand {
          position: relative;
          z-index: 2;
          text-align: center;
          opacity: 0;
          transform: translateY(16px);
          animation: ks-fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;
        }

        @keyframes ks-fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .ks-brand-name {
          font-family: 'Cinzel', 'Georgia', serif;
          font-size: 32px;
          font-weight: 600;
          color: #f0e6c8;
          letter-spacing: 3px;
          line-height: 1;
          text-transform: uppercase;
        }

        .ks-brand-name span {
          color: #c8a03c;
        }

        .ks-brand-apostrophe {
          font-family: 'Cormorant Garamond', 'Georgia', serif;
          font-style: italic;
          font-weight: 300;
          font-size: 34px;
          color: #c8a03c;
        }

        .ks-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 14px auto;
          width: 200px;
        }

        .ks-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,160,60,0.6));
        }

        .ks-divider-line.right {
          background: linear-gradient(90deg, rgba(200,160,60,0.6), transparent);
        }

        .ks-divider-diamond {
          width: 5px;
          height: 5px;
          background: #c8a03c;
          transform: rotate(45deg);
          box-shadow: 0 0 8px rgba(200,160,60,0.8);
        }

        .ks-tagline {
          font-family: 'Cormorant Garamond', 'Georgia', serif;
          font-style: italic;
          font-size: 15px;
          font-weight: 300;
          color: rgba(200,160,60,0.75);
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        /* ── Location badge ── */
        .ks-location {
          position: relative;
          z-index: 2;
          margin-top: 36px;
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0;
          animation: ks-fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.75s forwards;
        }

        .ks-location-dot {
          width: 6px;
          height: 6px;
          background: #c8a03c;
          border-radius: 50%;
          animation: ks-dotPulse 2s ease-in-out 1.5s infinite;
        }

        .ks-location-text {
          font-family: 'Cormorant Garamond', 'Georgia', serif;
          font-size: 12px;
          font-weight: 400;
          color: rgba(200,160,60,0.5);
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        /* ── Loading bar ── */
        .ks-loader {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(200,160,60,0.1);
          overflow: hidden;
        }

        .ks-loader-bar {
          height: 100%;
          background: linear-gradient(90deg, transparent, #c8a03c, #f0d080, #c8a03c, transparent);
          animation: ks-load 2.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
          transform: translateX(-100%);
        }

        @keyframes ks-load {
          to { transform: translateX(0); }
        }

        /* ── Corner ornaments ── */
        .ks-corner {
          position: absolute;
          width: 40px;
          height: 40px;
          opacity: 0.3;
        }

        .ks-corner.tl { top: 24px; left: 24px; border-top: 1px solid #c8a03c; border-left: 1px solid #c8a03c; }
        .ks-corner.tr { top: 24px; right: 24px; border-top: 1px solid #c8a03c; border-right: 1px solid #c8a03c; }
        .ks-corner.bl { bottom: 24px; left: 24px; border-bottom: 1px solid #c8a03c; border-left: 1px solid #c8a03c; }
        .ks-corner.br { bottom: 24px; right: 24px; border-bottom: 1px solid #c8a03c; border-right: 1px solid #c8a03c; }

        .ks-corner {
          opacity: 0;
          animation: ks-fadeIn 1s ease 0.6s forwards;
        }

        @keyframes ks-fadeIn {
          to { opacity: 0.3; }
        }
      `}</style>

      <div className={`ks-splash${phase === "exit" ? " exit" : ""}`}>
        {/* Background layers */}
        <div className="ks-bg" />
        <div className="ks-grain" />
        <div className="ks-glow" />

        {/* Corner ornaments */}
        <div className="ks-corner tl" />
        <div className="ks-corner tr" />
        <div className="ks-corner bl" />
        <div className="ks-corner br" />

        {/* Gold particles */}
        <div className="ks-particles">
          {[
            { l:"12%", s:"3px", d:"4.5s", delay:"0s"   },
            { l:"28%", s:"2px", d:"5.5s", delay:"0.4s" },
            { l:"45%", s:"4px", d:"3.8s", delay:"0.1s" },
            { l:"60%", s:"2px", d:"6s",   delay:"0.7s" },
            { l:"75%", s:"3px", d:"4.2s", delay:"0.3s" },
            { l:"88%", s:"2px", d:"5s",   delay:"0.9s" },
            { l:"20%", s:"2px", d:"6.5s", delay:"1.1s" },
            { l:"55%", s:"3px", d:"4s",   delay:"0.6s" },
            { l:"38%", s:"2px", d:"5.2s", delay:"0.2s" },
            { l:"70%", s:"4px", d:"3.5s", delay:"0.8s" },
            { l:"8%",  s:"2px", d:"7s",   delay:"1.3s" },
            { l:"92%", s:"3px", d:"4.8s", delay:"0.5s" },
          ].map((p, i) => (
            <div key={i} className="ks-p" style={{
              left: p.l,
              width: p.s, height: p.s,
              animationDuration: p.d,
              animationDelay: p.delay,
              bottom: "-10px",
            }} />
          ))}
        </div>

        {/* Lesotho mountain silhouette SVG */}
        <svg className="ks-mountains" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mtn-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#0d3d26" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#050e08" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="mtn-edge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(200,160,60,0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          {/* Back mountains */}
          <path d="M0,200 L0,140 L40,90 L80,120 L120,60 L160,100 L200,50 L240,95 L280,70 L320,110 L360,75 L400,115 L400,200 Z"
            fill="url(#mtn-grad)" opacity="0.5" />
          {/* Front mountains */}
          <path d="M0,200 L0,160 L50,110 L90,140 L140,85 L180,120 L220,75 L260,115 L300,90 L340,130 L380,100 L400,135 L400,200 Z"
            fill="url(#mtn-grad)" opacity="0.8" />
          {/* Edge glow on peaks */}
          <path d="M0,160 L50,110 L90,140 L140,85 L180,120 L220,75 L260,115 L300,90 L340,130 L380,100 L400,135"
            fill="none" stroke="url(#mtn-edge)" strokeWidth="1.5" />
          {/* Foreground base fill */}
          <rect x="0" y="185" width="400" height="15" fill="#050e08" />
        </svg>

        {/* Logo mark */}
        <div className="ks-logomark">
          <span className="ks-logomark-k">K</span>
          <div className="ks-logomark-dot" />
        </div>

        {/* Brand name */}
        <div className="ks-brand">
          <div className="ks-brand-name">
            Karab<span className="ks-brand-apostrophe">'</span>o<span style={{color:"rgba(240,230,200,0.4)", margin:"0 4px", fontSize:"28px"}}>s</span>
          </div>

          <div className="ks-divider">
            <div className="ks-divider-line" />
            <div className="ks-divider-diamond" />
            <div className="ks-divider-line right" />
          </div>

          <div className="ks-tagline">Premium Boutique</div>
        </div>

        {/* Location */}
        <div className="ks-location">
          <div className="ks-location-dot" />
          <div className="ks-location-text">Lesotho</div>
          <div className="ks-location-dot" />
        </div>

        {/* Loading bar */}
        <div className="ks-loader">
          <div className="ks-loader-bar" />
        </div>
      </div>
    </>
  );
}