"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { productsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await productsApi.list({ page: 1, per_page: 8 });
        if (Array.isArray(data)) setProducts(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const featured = products[0];
  const others = products.slice(1);

  return (
    <div>
{/* ================= HERO SECTION ================= */}
<section
  style={{
    position: "relative",
    padding: "120px 0",
    background: "linear-gradient(135deg,#004d28,#006838 40%,#0047ab)",
    color: "white",
  }}
>
  {/* DARK OVERLAY FOR READABILITY */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
    }}
  />

  <div
    className="container"
    style={{
      position: "relative",
      zIndex: 2,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 60,
      alignItems: "center",
    }}
  >
    {/* LEFT */}
    <div>
      <div
        style={{
          display: "inline-block",
          padding: "8px 14px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.15)",
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        🇱🇸 Lesotho Premium Boutique
      </div>

      <h1
        style={{
          fontSize: 64,
          fontWeight: 900,
          lineHeight: 1.05,
          marginBottom: 24,
          color: "white",
        }}
      >
        Discover <br /> Your Style.
      </h1>

      <p
        style={{
          fontSize: 20,
          opacity: 0.95,
          marginBottom: 40,
          maxWidth: 500,
        }}
      >
        Elevate your confidence with curated fashion and beauty
        collections designed for modern elegance and timeless
        sophistication.
      </p>

      <div style={{ display: "flex", gap: 16 }}>
        <button
          className="btn btnAccent"
          style={{
            background: "var(--accent)",
            color: "#000",
          }}
          onClick={() => router.push("/store")}
        >
          Shop Collection
        </button>

        <button
          className="btn btnOutline"
          style={{
            borderColor: "white",
            color: "white",
          }}
          onClick={() => router.push("/store")}
        >
          Explore Now
        </button>
      </div>
    </div>

    {/* FEATURED PRODUCT */}
    {!loading && featured && (
      <div
        className="card"
        style={{
          padding: 0,
          overflow: "hidden",
          cursor: "pointer",
          background: "white",
        }}
        onClick={() =>
          router.push(`/store/product/${featured.id}`)
        }
      >
        <div
          style={{
            height: 400,
            background: featured.main_image
              ? `url(${featured.main_image}) center/cover`
              : "#e2e8f0",
          }}
        />

        <div style={{ padding: 28 }}>
          <h3
            style={{
              fontSize: 22,
              fontWeight: 800,
              marginBottom: 10,
              color: "var(--gray-900)",
            }}
          >
            {featured.title}
          </h3>

          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: "var(--primary)",
            }}
          >
            {formatCurrency(featured.price)}
          </div>
        </div>
      </div>
    )}
  </div>
</section>

      {/* ================= FEATURED PRODUCTS ================= */}
      <section style={{ padding: "110px 0" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 60,
            }}
          >
            <h2
              className="text-display"
              style={{ fontSize: 40 }}
            >
              Featured Collection
            </h2>

            <button
              className="btn btnSecondary"
              onClick={() => router.push("/store")}
            >
              View All Products
            </button>
          </div>

          {loading ? (
            <div className="text-center animate-pulse">
              Loading premium selections...
            </div>
          ) : (
            <div className="product-grid">
              {others.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product as any}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= TRUST & VALUE ================= */}
      <section
        style={{
          background: "var(--gradient-surface)",
          padding: "100px 0",
        }}
      >
        <div
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 50,
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 48, marginBottom: 18 }}>
              🚚
            </div>
            <h3
              className="text-display"
              style={{ marginBottom: 12 }}
            >
              Fast Delivery
            </h3>
            <p>
              Reliable and secure shipping across Lesotho
              and surrounding regions.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 48, marginBottom: 18 }}>
              💳
            </div>
            <h3
              className="text-display"
              style={{ marginBottom: 12 }}
            >
              Secure Payments
            </h3>
            <p>
              Verified and trusted payment handling for
              your peace of mind.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 48, marginBottom: 18 }}>
              ⭐
            </div>
            <h3
              className="text-display"
              style={{ marginBottom: 12 }}
            >
              Premium Quality
            </h3>
            <p>
              Handpicked products selected for excellence
              and durability.
            </p>
          </div>
        </div>
      </section>

      {/* ================= CALL TO ACTION ================= */}
      <section
        style={{
          padding: "120px 0",
          textAlign: "center",
          background: "var(--gradient-primary)",
          color: "white",
        }}
      >
        <div className="container">
          <h2
            className="text-display"
            style={{
              fontSize: 48,
              marginBottom: 24,
            }}
          >
            Ready to Elevate Your Style?
          </h2>

          <p
            style={{
              fontSize: 18,
              marginBottom: 40,
              opacity: 0.95,
            }}
          >
            Explore our full collection and find your next
            favorite look today.
          </p>

          <button
            className="btn btnAccent"
            onClick={() => router.push("/store")}
          >
            Start Shopping
          </button>
        </div>
      </section>
    </div>
  );
}
