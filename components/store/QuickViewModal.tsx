"use client";

import { useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

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
              background:
                "rgba(8,12,22,0.55)",
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
              background: "#fff",
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
              <div style={{ fontWeight: 900 }}>Quick View</div>

              <button
                className="btn btnGhost"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ height: 1, background: "#e5e7eb" }} />

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
              <div style={{ borderRadius: 24, overflow: "hidden" }}>
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
                    }}
                  >
                    {product.title}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontWeight: 700,
                      opacity: 0.6,
                    }}
                  >
                    {product.category.toUpperCase()}
                  </div>
                </div>

                {/* PRICE */}
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {fmtM(product.price)}
                </div>

                {/* ACTION */}
                <button
                  className="btn btnTech"
                  disabled={isOutOfStock}
                  onClick={() => {
                    if (isOutOfStock) {
                      toast.error("Out of stock");
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
                  {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
