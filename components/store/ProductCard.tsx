"use client";

import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useMemo, useState } from "react";

import { useCart } from "@/app/context/CartContext";
import QuickViewModal from "@/components/store/QuickViewModal";
import { ScaleHover } from "@/components/ui/Motion";

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) => `M ${Math.round(v).toLocaleString("en-ZA")}`;

type Product = {
  _id?: string;
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  img: string;
  category: string;
  rating: number;

  /** INVENTORY (BACKEND-TRUTH) */
  stock: number;
  in_stock: boolean;
};

export default function ProductCard({ p }: { p: Product }) {
  const { addToCart } = useCart();
  const [qvOpen, setQvOpen] = useState(false);

  const discount = useMemo(() => {
    if (!p.oldPrice || p.oldPrice <= p.price) return null;
    return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
  }, [p.oldPrice, p.price]);

  const productId = p.id || p._id;

  const isOutOfStock = p.in_stock === false;

  return (
    <>
      <QuickViewModal
        open={qvOpen}
        product={p}
        onClose={() => setQvOpen(false)}
      />

      <ScaleHover>
        <div
          style={{
            padding: 16,
            borderRadius: 22,
            background: "linear-gradient(135deg,#ffffff,#f8fbff)",
            boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
            display: "grid",
            gap: 10,
            opacity: isOutOfStock ? 0.6 : 1,
          }}
        >
          {/* TOP ROW */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 900,
                background: "rgba(96,165,250,0.12)",
                color: "#1e3a8a",
              }}
            >
              {p.category.toUpperCase()}
            </span>

            {isOutOfStock ? (
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 900,
                  background: "#fee2e2",
                  color: "#991b1b",
                }}
              >
                OUT OF STOCK
              </span>
            ) : (
              discount && (
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 900,
                    background:
                      "linear-gradient(135deg,#fde68a,#f472b6)",
                  }}
                >
                  −{discount}%
                </span>
              )
            )}
          </div>

          {/* IMAGE */}
          <Link href={`/product/${productId}`}>
            <div
              style={{
                height: 170,
                borderRadius: 18,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <Image
                src={p.img}
                alt={p.title}
                width={700}
                height={500}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </Link>

          {/* TITLE */}
          <div
            style={{
              fontWeight: 900,
              fontSize: 14,
              color: "#0f172a",
              lineHeight: 1.3,
            }}
          >
            {p.title}
          </div>

          {/* PRICE */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 900 }}>
              {fmtM(p.price)}
              {p.oldPrice && (
                <span
                  style={{
                    marginLeft: 6,
                    textDecoration: "line-through",
                    opacity: 0.5,
                    fontSize: 12,
                  }}
                >
                  {fmtM(p.oldPrice)}
                </span>
              )}
            </span>
          </div>

          {/* ACTIONS */}
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href={`/product/${productId}`}
                className="btn btnGhost"
                style={{ flex: 1, textAlign: "center" }}
              >
                View
              </Link>

              <button
                className="btn btnTech"
                style={{ flex: 1 }}
                disabled={isOutOfStock}
                onClick={() => {
                  if (isOutOfStock) {
                    toast.error("This product is out of stock");
                    return;
                  }

                  addToCart({
                    id: productId!,
                    title: p.title,
                    price: p.price,
                    quantity: 1,
                    img: p.img,
                  });
                  toast.success("Added to cart");
                }}
              >
                {isOutOfStock ? "Unavailable" : "Add"}
              </button>
            </div>

            <button
              className="btn btnGhost"
              onClick={() => setQvOpen(true)}
              disabled={isOutOfStock}
            >
              Quick View
            </button>
          </div>
        </div>
      </ScaleHover>
    </>
  );
}
