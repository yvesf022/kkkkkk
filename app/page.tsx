"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedProducts() {
      try {
        const data = (await productsApi.list({ page: 1, per_page: 6 })) as ProductListItem[];
        setFeaturedProducts(data);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFeaturedProducts();
  }, []);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 24px" }}>
      {/* HERO */}
      <section
        style={{
          display: "grid",
          gap: 24,
          maxWidth: 800,
          marginBottom: 80,
        }}
      >
        <h1
          style={{
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.1,
            background: "linear-gradient(135deg, #ff4fa1, #3aa9ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Karabo's Boutique
        </h1>

        <p
          style={{
            fontSize: 20,
            opacity: 0.75,
            lineHeight: 1.6,
            maxWidth: 600,
          }}
        >
          Lesotho's premium online destination for beauty, fashion, and
          accessories. Discover curated collections that define your style.
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <button
            className="btn btnPrimary"
            onClick={() => router.push("/store")}
            style={{ fontSize: 16, padding: "16px 32px" }}
          >
            Explore Store →
          </button>

          <button
            className="btn btnGhost"
            onClick={() => router.push("/store")}
            style={{ fontSize: 16, padding: "16px 32px" }}
          >
            Browse Categories
          </button>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
              Featured Products
            </h2>
            <p style={{ fontSize: 16, opacity: 0.65 }}>
              Handpicked selections just for you
            </p>
          </div>

          {featuredProducts.length > 0 && (
            <button
              className="btn btnTech"
              onClick={() => router.push("/store")}
            >
              View All Products →
            </button>
          )}
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  height: 400,
                  borderRadius: 20,
                  background: "#f8fafc",
                }}
              />
            ))}
          </div>
        )}

        {/* PRODUCTS GRID */}
        {!loading && featuredProducts.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && featuredProducts.length === 0 && (
          <div
            style={{
              padding: 80,
              textAlign: "center",
              borderRadius: 22,
              background: "linear-gradient(135deg, #ffffff, #f8fbff)",
              boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 24 }}>🛍️</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>
              Coming Soon
            </h3>
            <p style={{ fontSize: 16, opacity: 0.65, marginBottom: 32 }}>
              Our featured products will appear here soon. Stay tuned!
            </p>
            <button
              className="btn btnPrimary"
              onClick={() => router.push("/store")}
            >
              Browse All Products
            </button>
          </div>
        )}
      </section>

      {/* CATEGORIES PREVIEW */}
      <section style={{ marginTop: 80 }}>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 900,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Shop by Category
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
          }}
        >
          {["Beauty", "Fashion", "Accessories", "Electronics"].map(
            (category) => (
              <button
                key={category}
                onClick={() => router.push(`/store?category=${category}`)}
                style={{
                  padding: 40,
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #ffffff, #f8fbff)",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 24px 60px rgba(15,23,42,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 18px 50px rgba(15,23,42,0.12)";
                }}
              >
                <h3 style={{ fontSize: 20, fontWeight: 900 }}>{category}</h3>
              </button>
            )
          )}
        </div>
      </section>
    </div>
  );
}

/* ============ PRODUCT CARD ============ */

function ProductCard({ product }: { product: ProductListItem }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/store/product/${product.id}`)}
      style={{
        borderRadius: 20,
        background: "linear-gradient(135deg, #ffffff, #f8fbff)",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = "0 28px 70px rgba(15,23,42,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 18px 50px rgba(15,23,42,0.12)";
      }}
    >
      {/* IMAGE */}
      <div
        style={{
          height: 280,
          background: product.main_image
            ? `url(${product.main_image}) center/cover`
            : "linear-gradient(135deg, #e0e7ff, #dbeafe)",
          display: "grid",
          placeItems: "center",
        }}
      >
        {!product.main_image && (
          <div style={{ fontSize: 64, opacity: 0.3 }}>📦</div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ padding: 20 }}>
        {/* Category */}
        {product.category && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 999,
              background: "#e0e7ff",
              color: "#3730a3",
              display: "inline-block",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {product.category}
          </div>
        )}

        {/* Title */}
        <h3
          style={{
            fontSize: 18,
            fontWeight: 900,
            marginBottom: 8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            lineHeight: 1.3,
          }}
        >
          {product.title}
        </h3>

        {/* Description */}
        {product.short_description && (
          <p
            style={{
              fontSize: 14,
              opacity: 0.6,
              marginBottom: 16,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {product.short_description}
          </p>
        )}

        {/* Price & Stock */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>
              R {Math.round(product.price).toLocaleString()}
            </div>
            {product.rating && (
              <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>
                ⭐ {product.rating.toFixed(1)} ({product.sales} sold)
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              padding: "6px 12px",
              borderRadius: 999,
              background: product.stock > 0 ? "#dcfce7" : "#fee2e2",
              color: product.stock > 0 ? "#166534" : "#991b1b",
            }}
          >
            {product.stock > 0 ? "In Stock" : "Out of Stock"}
          </div>
        </div>
      </div>
    </div>
  );
}
