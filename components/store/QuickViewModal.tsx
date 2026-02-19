"use client";

import { useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import { useCart } from "@/lib/cart";

const API = process.env.NEXT_PUBLIC_API_URL!;

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

type QuickViewProduct = {
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
  product: QuickViewProduct | null;
  onClose: () => void;
}) {
  // ✅ Use Zustand store — addItem(id, qty) signature
  const addItem = useCart((s) => s.addItem);

  const isOutOfStock =
    !product || product.in_stock === false || product.stock <= 0;

  const imageUrl =
    product && product.main_image?.startsWith("http")
      ? product.main_image
      : product?.main_image
      ? `${API}${product.main_image}`
      : "";

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

  return (
    <AnimatePresence>
      {open && product && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 120,
              background: "rgba(8,12,22,0.55)",
              backdropFilter: "blur(10px)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
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
              background: "#fff",
              boxShadow:
                "0 40px 120px rgba(15,23,42,0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 18, display: "flex", justifyContent: "space-between" }}>
              <strong>Quick View</strong>
              <button className="btn btnGhost" onClick={onClose}>✕</button>
            </div>

            <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 18 }}>
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={product.title}
                  width={1200}
                  height={900}
                  style={{ width: "100%", height: 360, objectFit: "cover", borderRadius: 18 }}
                />
              ) : (
                <div style={{ width: "100%", height: 360, borderRadius: 18, background: "#f1f5f9", display: "grid", placeItems: "center", fontSize: 56 }}>
                  📦
                </div>
              )}

              <div>
                <h2>{product.title}</h2>
                <p>{product.category.toUpperCase()}</p>
                <strong>{fmtM(product.price)}</strong>

                <button
                  className="btn btnTech"
                  disabled={isOutOfStock}
                  onClick={async () => {
                    if (isOutOfStock) {
                      toast.error("Out of stock");
                      return;
                    }

                    try {
                      // ✅ Pass product.id string — matches addItem(productOrId, qty)
                      await addItem(product.id, 1);
                      toast.success("Added to cart");
                      onClose();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Failed to add to cart");
                    }
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