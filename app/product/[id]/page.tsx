"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { products } from "@/lib/products"; // compatibility shim (OK)
import { useStore } from "@/lib/store"; // wishlist ONLY
import { useCart } from "@/app/context/CartContext"; // ✅ cart ONLY
import ProductCard from "@/components/store/ProductCard";
import { FadeIn, ScaleHover } from "@/components/ui/Motion";

/* =======================
   HELPERS
======================= */

const formatCurrency = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-LS")}`;

/**
 * 🔒 Strict normalization
 * - NO legacy fields
 * - Netlify-safe
 */
function normalize(p: any) {
  return {
    ...p,
    id: p.id,
    img: p.img || "/placeholder.png",
    category: p.category || "general",
    rating: p.rating ?? 4.5,
  };
}

/* =======================
   PAGE
======================= */

export default function ProductDetails({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { id } = params;

  // ✅ CORRECT STATE USAGE
  const { addToCart } = useCart();
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const wishlist = useStore((s) => s.wishlist);

  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  const product = useMemo(
    () => products.find((x) => x.id === id),
    [id]
  );

  const safeProduct = product ? normalize(product) : null;

  const gallery = useMemo(
    () =>
      safeProduct?.img
        ? [safeProduct.img, safeProduct.img, safeProduct.img]
        : [],
    [safeProduct]
  );

  const related = useMemo(
    () =>
      safeProduct
        ? products
            .filter(
              (x) =>
                x.category === safeProduct.category &&
                x.id !== safeProduct.id
            )
            .slice(0, 4)
            .map(normalize)
        : [],
    [safeProduct]
  );

  const stock =
    typeof (safeProduct as any)?.stock === "number"
      ? (safeProduct as any).stock
      : 0;

  const inStock = stock > 0;
  const inWish = safeProduct
    ? wishlist.includes(safeProduct.id)
    : false;

  useEffect(() => {
    setQty(1);
    setActiveImg(0);
  }, [safeProduct?.id]);

  if (!safeProduct) {
    return (
      <div
        style={{
          padding: 32,
          borderRadius: 22,
          background: "linear-gradient(135deg,#f8fbff,#eef6ff)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
        }}
      >
        Product not found.{" "}
        <Link href="/store" className="btn btnTech">
          Back to Store
        </Link>
      </div>
    );
  }

  return (
    <FadeIn>
      <div style={{ display: "grid", gap: 32 }}>
        {/* ================= PRODUCT ================= */}
        <section
          style={{
            borderRadius: 26,
            padding: 28,
            background: `
              radial-gradient(
                420px 240px at 90% 0%,
                rgba(96,165,250,0.22),
                transparent 60%
              ),
              radial-gradient(
                360px 200px at 10% 10%,
                rgba(244,114,182,0.18),
                transparent 60%
              ),
              linear-gradient(135deg,#ffffff,#f4f9ff)
            `,
            boxShadow: "0 26px 70px rgba(15,23,42,0.16)",
          }}
        >
          {/* HEADER */}
          <div style={{ display: "grid", gap: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900 }}>
              {safeProduct.title}
            </h1>

            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(15,23,42,0.55)",
              }}
            >
              {safeProduct.category.toUpperCase()} • ⭐{" "}
              {safeProduct.rating}
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(15,23,42,0.08)", margin: "18px 0" }} />

          {/* GRID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 24,
            }}
          >
            {/* IMAGE */}
            <div
              style={{
                borderRadius: 22,
                overflow: "hidden",
                background: "#fff",
                boxShadow: "0 14px 40px rgba(15,23,42,0.14)",
              }}
            >
              <Image
                src={gallery[activeImg]}
                alt={safeProduct.title}
                width={1200}
                height={800}
                priority
                style={{ width: "100%", height: 360, objectFit: "cover" }}
              />
            </div>

            {/* BUY PANEL */}
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ fontSize: 26, fontWeight: 900 }}>
                {formatCurrency(safeProduct.price)}
              </div>

              <ScaleHover>
                <button
                  className="btn btnTech"
                  disabled={!inStock}
                  onClick={() => {
                    addToCart({
                      id: safeProduct.id,
                      title: safeProduct.title,
                      price: safeProduct.price,
                      quantity: qty,
                      img: safeProduct.img,
                    });
                    toast.success("Added to cart");
                  }}
                >
                  Add to Cart
                </button>
              </ScaleHover>

              <button
                className="btn btnGhost"
                onClick={() => {
                  addToCart({
                    id: safeProduct.id,
                    title: safeProduct.title,
                    price: safeProduct.price,
                    quantity: qty,
                    img: safeProduct.img,
                  });
                  router.push("/checkout");
                }}
              >
                Buy Now
              </button>

              <button
                className="btn btnGhost"
                onClick={() => toggleWishlist(safeProduct.id)}
              >
                {inWish ? "Remove from Wishlist" : "Save to Wishlist"}
              </button>
            </div>
          </div>
        </section>

        {/* ================= RELATED ================= */}
        {related.length > 0 && (
          <section
            style={{
              borderRadius: 24,
              padding: 24,
              background: "linear-gradient(135deg,#ffffff,#f8fbff)",
              boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>
              Related Products
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 18,
              }}
            >
              {related.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </FadeIn>
  );
}
