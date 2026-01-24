"use client";

import { use, useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { products } from "@/lib/products";
import { useStore } from "@/lib/store";
import ProductCard from "@/components/store/ProductCard";
import { FadeIn, ScaleHover } from "@/components/ui/Motion";

const formatCurrency = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-LS")}`;

export default function ProductDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const addToCart = useStore((s) => s.addToCart);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const wishlist = useStore((s) => s.wishlist);

  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  const product = products.find((x) => x.id === id);

  const gallery = useMemo(
    () => (product ? [product.img, product.img, product.img] : []),
    [product]
  );

  const related = useMemo(
    () =>
      product
        ? products
            .filter(
              (x) =>
                x.category === product.category && x.id !== product.id
            )
            .slice(0, 4)
        : [],
    [product]
  );

  const inStock = product ? product.stock !== 0 : false;
  const inWish = product ? wishlist.includes(product.id) : false;

  useEffect(() => {
    setQty(1);
    setActiveImg(0);
  }, [product?.id]);

  if (!product) {
    return (
      <div className="glass neon-border" style={{ padding: 18 }}>
        Product not found.{" "}
        <Link href="/store" className="neon-text">
          Back to Store
        </Link>
      </div>
    );
  }

  return (
    <FadeIn>
      <div style={{ display: "grid", gap: 20 }}>
        {/* PRODUCT CARD */}
        <div className="glass neon-border" style={{ padding: 20 }}>
          {/* HEADER */}
          <div style={{ display: "grid", gap: 6 }}>
            <h1 className="neon-text" style={{ fontSize: 28 }}>
              {product.title}
            </h1>

            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              {product.category.toUpperCase()} • ⭐ {product.rating}
            </div>
          </div>

          <div className="hr" style={{ margin: "16px 0" }} />

          {/* GRID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 20,
            }}
          >
            {/* GALLERY */}
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  borderRadius: 24,
                  overflow: "hidden",
                  border: "1px solid var(--softLine)",
                }}
              >
                <Image
                  src={gallery[activeImg] || "/placeholder.png"}
                  alt={product.title}
                  width={1200}
                  height={800}
                  priority
                  style={{
                    width: "100%",
                    height: 360,
                    objectFit: "cover",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    className="pill"
                    style={{
                      padding: 0,
                      width: 84,
                      height: 64,
                      border:
                        i === activeImg
                          ? "2px solid var(--brand2)"
                          : "1px solid var(--softLine)",
                    }}
                    onClick={() => setActiveImg(i)}
                  >
                    <Image
                      src={img}
                      alt=""
                      width={200}
                      height={150}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* BUY PANEL */}
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 1000 }}>
                  {formatCurrency(product.price)}
                </div>

                <div
                  className="pill"
                  style={{
                    marginTop: 6,
                    width: "fit-content",
                    background: inStock
                      ? "rgba(34,197,94,.12)"
                      : "rgba(239,68,68,.12)",
                    color: inStock ? "#16a34a" : "#dc2626",
                  }}
                >
                  {inStock ? "In Stock" : "Out of Stock"}
                </div>
              </div>

              {/* QUANTITY */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  className="pill"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                >
                  −
                </button>
                <b>{qty}</b>
                <button
                  className="pill"
                  disabled={!inStock}
                  onClick={() => setQty(qty + 1)}
                >
                  +
                </button>
              </div>

              {/* ACTIONS */}
              <ScaleHover>
                <button
                  className="btn btnPrimary"
                  disabled={!inStock}
                  onClick={() => {
                    addToCart(product.id, qty);
                    toast.success("Added to cart");
                  }}
                >
                  Add to Cart
                </button>
              </ScaleHover>

              <button
                className="btn"
                onClick={() => {
                  addToCart(product.id, qty);
                  router.push("/checkout");
                }}
              >
                Buy Now
              </button>

              <button
                className="btn"
                onClick={() => toggleWishlist(product.id)}
              >
                {inWish ? "Remove from Wishlist" : "Save to Wishlist"}
              </button>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="hr" style={{ margin: "20px 0" }} />

          <div>
            <h3>Description</h3>
            <p style={{ marginTop: 8, color: "var(--muted)" }}>
              Premium product with high-quality finish. Perfect for everyday
              use and special occasions.
            </p>

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              {(product.tags ?? []).map((t) => (
                <span key={t} className="badge">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RELATED */}
        {related.length > 0 && (
          <div className="glass neon-border" style={{ padding: 18 }}>
            <h3 className="neon-text">Related Products</h3>
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
              }}
            >
              {related.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
