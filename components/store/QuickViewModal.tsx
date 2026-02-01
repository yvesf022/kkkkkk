"use client";

import { useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import { useStore } from "@/lib/store";
import { useCart } from "@/app/context/CartContext";

const API = process.env.NEXT_PUBLIC_API_URL!;

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

/**
 * BACKEND-ALIGNED PRODUCT TYPE
 */
type Product = {
  id: string;
  title: string;
  price: number;
  compare_price?: number | null;
  main_image: string;
  category: string;
  stock: number;
  in_stock: boolean;
};

export default function QuickViewModal({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}) {
  const { addToCart } = useCart();
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const wishlist = useStore((s) => s.wishlist);

  const inWish = product ? wishlist.includes(product.id) : false;

  const isOutOfStock =
    !product || product.in_stock === false || product.stock <= 0;

  const imageUrl =
    product && product.main_image.startsWith("http")
      ? product.main_image
      : product
      ? `${API}${product.main_image}`
      : "";

  /* ================= LOCK SCROLL + ESC ================= */

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  /* ================= RENDER ================= */

  return (
    <AnimatePresence>
      {open && product && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 120,
              background: `
                radial-gradient(
                  1200px 600px at 12% 18%,
                  rgba(96,165,250,0.18),
                  transparent 60%
                ),
                radial-gradient(
                  1200px 600px at 88% 16%,
                  rgba(244,114,182,0.14),
                  transparent 60%
                ),
                rgba(8,12,22,0.55)
              `,
              backdropFilter: "blur(10px)",
            }}
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(960px, 94vw)",
              zIndex: 130,
              borderRadius: 28,
              overflow: "hidden",
              background: `
                radial-gradient(
                  1000px 500px at 16% 12%,
                  rgba(96,165,250,0.14),
                  transparent 60%
                ),
                radial-gradient(
                  1000px 500px at 90% 18%,
                  rgba(244,114,182,0.10),
                  transparent 60%
                ),
                linear-gradient(180deg,#ffffff,#f6f9ff)
              `,
              boxShadow:
                "0 40px 120px rgba(15,23,42,0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div
              style={{
                padding: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                Quick View
              </div>

              <button
                className="btn btnGhost"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                height: 1,
                background: "rgba(15,23,42,0.08)",
              }}
            />

            {/* BODY */}
            <div
              className="qvGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 1fr",
                gap: 18,
                padding: 18,
              }}
            >
              {/* IMAGE */}
              <div
                style={{
                  borderRadius: 24,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow:
                    "0 22px 60px rgba(15,23,42,0.14)",
                }}
              >
                <Image
                  src={imageUrl}
                  alt={product.title}
                  width={1200}
                  height={900}
                  style={{
                    width: "100%",
                    height: 360,
                    objectFit: "cover",
                  }}
                />
              </div>

              {/* DETAILS */}
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      lineHeight: 1.2,
                      color: "#0f172a",
                    }}
                  >
                    {product.title}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontWeight: 700,
                      color: "rgba(15,23,42,0.6)",
                    }}
                  >
                    {product.category.toUpperCase()}
                  </div>
                </div>

                {/* PRICE */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: 22,
                    background:
                      "linear-gradient(135deg,#ffffff,#f4f9ff)",
                    boxShadow:
                      "0 18px 50px rgba(15,23,42,0.14)",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    Price
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 18,
                      fontWeight: 900,
                    }}
                  >
                    {fmtM(product.price)}
                  </div>

                  {product.compare_price && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        opacity: 0.5,
                        textDecoration: "line-through",
                      }}
                    >
                      {fmtM(product.compare_price)}
                    </div>
                  )}
                </div>

                {/* ACTIONS */}
                <div style={{ display: "grid", gap: 10 }}>
                  <button
                    className="btn btnTech"
                    disabled={isOutOfStock}
                    onClick={() => {
                      if (isOutOfStock) {
                        toast.error(
                          "This product is currently out of stock"
                        );
                        return;
                      }

                      addToCart({
                        id: product.id,
                        title: product.title,
                        price: product.price,
                        image: imageUrl,
                        quantity: 1,
                      });

                      toast.success("Added to cart");
                      onClose();
                    }}
                  >
                    {isOutOfStock
                      ? "Out of Stock"
                      : "Add to Cart"}
                  </button>

                  <button
                    className="btn btnGhost"
                    onClick={() => {
                      toggleWishlist(product.id);
                      toast.success(
                        inWish
                          ? "Removed from wishlist"
                          : "Saved to wishlist"
                      );
                    }}
                  >
                    {inWish
                      ? "Remove from Wishlist"
                      : "Save to Wishlist"}
                  </button>
                </div>
              </div>
            </div>

            <style>{`
              @media (max-width: 900px) {
                .qvGrid {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
