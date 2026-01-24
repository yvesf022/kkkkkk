"use client";

import { useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import type { Product } from "@/lib/products";
import { useStore } from "@/lib/store";

/** ✅ Lesotho currency formatter (Maloti) */
const fmtM = (v: number) => `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function QuickViewModal({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}) {
  const addToCart = useStore((s) => s.addToCart);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const wishlist = useStore((s) => s.wishlist);

  const inWish = product ? wishlist.includes(product.id) : false;

  // ✅ FIX: dependency array must never change size/order
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    // ✅ lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && product ? (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 120,
              background:
                "radial-gradient(1000px 520px at 14% 18%, rgba(45,72,126,0.30), rgba(0,0,0,0) 60%)," +
                "radial-gradient(1000px 520px at 88% 16%, rgba(255,34,140,0.16), rgba(0,0,0,0) 60%)," +
                "rgba(2, 6, 16, 0.72)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Quick view modal"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(980px, 94vw)",
              zIndex: 130,
              borderRadius: 28,
              overflow: "hidden",
              border: "1px solid rgba(12,14,20,0.16)",
              boxShadow:
                "0 40px 140px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.06) inset",
              background:
                "radial-gradient(1200px 520px at 18% 14%, rgba(45,72,126,0.14), transparent 60%)," +
                "radial-gradient(1200px 520px at 88% 16%, rgba(214,170,92,0.10), transparent 60%)," +
                "radial-gradient(1000px 520px at 50% 120%, rgba(255,34,140,0.08), transparent 62%)," +
                "linear-gradient(180deg, rgba(255,255,255,0.90), rgba(244,246,251,0.82))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontWeight: 1200,
                  letterSpacing: 0.2,
                  color: "rgba(20,34,64,0.92)",
                }}
              >
                Quick View ✨
              </div>

              <button
                className="btn"
                onClick={onClose}
                aria-label="Close"
                style={{
                  padding: 10,
                  borderRadius: 16,
                  minWidth: 46,
                  height: 46,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid rgba(12,14,20,0.14)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(252,253,255,0.80))",
                  boxShadow: "0 18px 50px rgba(12,14,20,0.10)",
                  fontWeight: 1200,
                  color: "rgba(20,34,64,0.90)",
                }}
              >
                ✕
              </button>
            </div>

            <div className="hr" style={{ borderColor: "rgba(12,14,20,0.10)" }} />

            {/* Body */}
            <div
              className="kyQVGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 1fr",
                gap: 14,
                padding: 16,
              }}
            >
              {/* Image */}
              <div
                style={{
                  borderRadius: 24,
                  overflow: "hidden",
                  border: "1px solid rgba(12,14,20,0.14)",
                  background:
                    "radial-gradient(900px 360px at 16% 12%, rgba(45,72,126,0.12), transparent 62%)," +
                    "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(244,246,251,0.86))",
                  boxShadow:
                    "0 30px 100px rgba(12,14,20,0.10), inset 0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                <Image
                  src={product.img}
                  alt={product.title}
                  width={1200}
                  height={900}
                  style={{ width: "100%", height: 360, objectFit: "cover" }}
                />
              </div>

              {/* Details */}
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 1200,
                      lineHeight: 1.18,
                      letterSpacing: 0.2,
                      background:
                        "linear-gradient(90deg, rgba(20,34,64,0.96), rgba(45,72,126,0.94), rgba(255,34,140,0.78))",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    {product.title}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "rgba(12,14,20,0.68)",
                      fontWeight: 900,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>⭐ {product.rating}</span>
                    <span style={{ opacity: 0.35 }}>•</span>
                    <span style={{ color: "rgba(20,34,64,0.86)" }}>
                      {product.category.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div
                  className="glass"
                  style={{
                    padding: 14,
                    borderRadius: 24,
                    border: "1px solid rgba(12,14,20,0.12)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(252,253,255,0.74))",
                    boxShadow: "0 22px 80px rgba(12,14,20,0.10)",
                  }}
                >
                  <div style={{ fontWeight: 1200, color: "rgba(20,34,64,0.92)" }}>
                    Price
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 1300,
                      fontSize: 18,
                      color: "rgba(20,34,64,0.96)",
                      letterSpacing: 0.2,
                    }}
                  >
                    {fmtM(product.price)}{" "}
                    {product.oldPrice ? (
                      <span
                        style={{
                          marginLeft: 10,
                          opacity: 0.72,
                          textDecoration: "line-through",
                          fontWeight: 1000,
                          color: "rgba(12,14,20,0.60)",
                          fontSize: 14,
                        }}
                      >
                        {fmtM(product.oldPrice)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "grid", gap: 10 }}>
                  <button
                    className="btn btnPrimary"
                    onClick={() => {
                      addToCart(product.id, 1);
                      toast.success("Added to cart ✅");
                      onClose();
                    }}
                    style={{ padding: "14px 16px", fontWeight: 1200 }}
                  >
                    Add to Cart
                  </button>

                  <button
                    className="btn"
                    onClick={() => {
                      toggleWishlist(product.id);
                      toast.success(inWish ? "Removed from wishlist" : "Saved to wishlist 💗");
                    }}
                    style={{
                      padding: "14px 16px",
                      fontWeight: 1100,
                      borderColor: inWish
                        ? "rgba(255,34,140,0.40)"
                        : "rgba(12,14,20,0.14)",
                      boxShadow: inWish
                        ? "0 0 0 4px rgba(255,34,140,0.10), 0 22px 70px rgba(12,14,20,0.10)"
                        : "0 22px 70px rgba(12,14,20,0.10)",
                    }}
                  >
                    {inWish ? "Remove from Wishlist" : "Save to Wishlist"}
                  </button>
                </div>
              </div>
            </div>

            {/* Responsive */}
            <style>{`
              .kyQVGrid { min-width: 0; }
              @media (max-width: 980px) {
                .kyQVGrid { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
