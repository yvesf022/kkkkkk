"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";

/* CSS for the badge bump animation — injected once */
const BADGE_STYLE = `
.kc-hdr-badge {
  min-width:18px; height:18px;
  padding:0 5px;
  background:#dc2626;
  border-radius:99px;
  color:#fff;
  font-size:10px;
  font-weight:900;
  display:grid;
  place-items:center;
  position:absolute;
  top:-7px; right:-7px;
}
.kc-hdr-badge.bump { animation:kcbump 0.35s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes kcbump { 0%{transform:scale(1)} 50%{transform:scale(1.8)} 100%{transform:scale(1)} }
`;

export function CartHeaderButton({ onClick }: { onClick?: () => void }) {
  const count = useCart((s) => s.itemCount);
  const prev  = useRef(count);
  const [bumping, setBumping] = useState(false);

  useEffect(() => {
    if (count > prev.current) {
      setBumping(true);
      setTimeout(() => setBumping(false), 360);
    }
    prev.current = count;
  }, [count]);

  return (
    <>
      <style>{BADGE_STYLE}</style>
      <button
        onClick={onClick}
        style={{
          padding: "9px 14px",
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 13,
          color: "#fff",
          background: "rgba(0,0,0,0.65)",
          border: "1px solid rgba(255,255,255,.15)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "0.2s ease",
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "inherit",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        Cart
        {count > 0 && (
          <span className={`kc-hdr-badge${bumping ? " bump" : ""}`}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
    </>
  );
}