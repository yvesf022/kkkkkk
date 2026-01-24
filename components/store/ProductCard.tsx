"use client";

import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useMemo, useState } from "react";

import { useCart } from "@/app/context/CartContext";
import QuickViewModal from "@/components/store/QuickViewModal";
import { ScaleHover } from "@/components/ui/Motion";

/** ✅ Lesotho currency formatter (Maloti) */
const fmtM = (v: number) => `M ${Math.round(v).toLocaleString("en-ZA")}`;

type Product = {
  _id?: string;
  id: string; // ✅ REQUIRED (fixes QuickViewModal type contract)
  title: string;
  price: number;
  oldPrice?: number;
  img: string;
  category: string;
  rating?: number;
};

export default function ProductCard({ p }: { p: Product }) {
  const { addToCart } = useCart();
  const [qvOpen, setQvOpen] = useState(false);

  const discount = useMemo(() => {
    if (!p.oldPrice || p.oldPrice <= p.price) return null;
    return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
  }, [p.oldPrice, p.price]);

  const productId = p.id || p._id;

  return (
    <>
      <QuickViewModal
        open={qvOpen}
        product={p}
        onClose={() => setQvOpen(false)}
      />

      <ScaleHover>
        <div
          className="glass neon-border kyProductCard"
          style={{
            padding: 14,
            position: "relative",
            overflow: "hidden",
            borderRadius: 26,
            border: "1px solid rgba(12, 14, 20, 0.12)",
            background:
              "radial-gradient(720px 260px at 12% 10%, rgba(45,72,126,0.12), transparent 60%)," +
              "radial-gradient(720px 260px at 88% 14%, rgba(214,170,92,0.10), transparent 62%)," +
              "radial-gradient(720px 260px at 50% 110%, rgba(255,34,140,0.06), transparent 64%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(252,253,255,0.74))",
            boxShadow: "0 26px 90px rgba(12,14,20,0.10)",
          }}
        >
          {/* Category + discount */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              className="badge"
              style={{
                background: "rgba(45,72,126,0.10)",
                color: "rgba(20,34,64,0.92)",
                fontWeight: 1100,
              }}
            >
              {p.category.toUpperCase()}
            </div>

            {discount ? (
              <div
                className="badge"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(214,170,92,0.16), rgba(255,34,140,0.06))",
                  fontWeight: 1200,
                }}
              >
                -{discount}%
              </div>
            ) : null}
          </div>

          {/* Image */}
          <Link
            href={`/product/${productId}`}
            style={{ display: "block", marginTop: 12 }}
          >
            <div
              style={{
                width: "100%",
                height: 172,
                borderRadius: 22,
                overflow: "hidden",
              }}
            >
              <Image
                src={p.img}
                alt={p.title}
                width={700}
                height={500}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </Link>

          {/* Title */}
          <div
            style={{
              marginTop: 12,
              fontWeight: 1100,
              fontSize: 15,
              color: "rgba(20,34,64,0.92)",
            }}
          >
            {p.title}
          </div>

          {/* Price */}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 1200 }}>
              {fmtM(p.price)}
              {p.oldPrice ? (
                <span
                  style={{
                    marginLeft: 8,
                    textDecoration: "line-through",
                    opacity: 0.6,
                    fontSize: 13,
                  }}
                >
                  {fmtM(p.oldPrice)}
                </span>
              ) : null}
            </span>
          </div>

          {/* Buttons */}
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Link
                className="btn"
                href={`/product/${productId}`}
                style={{ flex: 1, textAlign: "center" }}
              >
                View
              </Link>

              <button
                className="btn btnPrimary"
                onClick={() => {
                  addToCart(p);
                  toast.success("Added to cart 🛒");
                }}
                style={{ flex: 1 }}
              >
                Add
              </button>
            </div>

            <button
              className="btn"
              onClick={() => setQvOpen(true)}
              style={{ fontWeight: 1100 }}
            >
              Quick View ✨
            </button>
          </div>
        </div>
      </ScaleHover>
    </>
  );
}
