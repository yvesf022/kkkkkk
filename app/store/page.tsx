"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";
import StoreToolbar, {
  Filters,
  SortMode,
} from "@/components/store/StoreToolbar";
import StoreTabs from "@/components/store/StoreTabs";

const API = process.env.NEXT_PUBLIC_API_URL || "";

/* =========================
   MALOTI FORMATTER
========================= */
function formatM(amount: number) {
  if (isNaN(amount)) return "M0";
  return `M ${Math.round(amount).toLocaleString("en-ZA")}`;
}

export default function StorePage() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortMode>("featured");

  /* ============ LOAD PRODUCTS ============ */
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);

        const params: any = {};
        if (filters.category) {
          params.category = filters.category;
        }

        const data = await productsApi.list(params);
        let sortedData = [...data];

        if (sort === "price_asc") {
          sortedData.sort((a, b) => a.price - b.price);
        } else if (sort === "price_desc") {
          sortedData.sort((a, b) => b.price - a.price);
        }

        setProducts(sortedData);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [filters, sort]);

  return (
    <div style={{ display: "grid", gap: 32, maxWidth: 1400, margin: "0 auto" }}>
      <StoreToolbar
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
      />

      <StoreTabs filters={filters} setFilters={setFilters} />

      <section>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900 }}>
            {filters.category ? `${filters.category}` : "All Products"}
          </h2>
          <p style={{ fontSize: 14, opacity: 0.6 }}>
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* LOADING SKELETON */}
        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: 420,
                  borderRadius: 20,
                  background: "#f3f4f6",
                }}
              />
            ))}
          </div>
        )}

        {/* PRODUCTS GRID */}
        {!loading && products.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 28,
            }}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() =>
                  router.push(`/store/product/${product.id}`)
                }
              />
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading && products.length === 0 && (
          <div
            style={{
              padding: 80,
              textAlign: "center",
              borderRadius: 22,
              background: "#ffffff",
              boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 20 }}>🔍</div>
            <h3 style={{ fontSize: 22, fontWeight: 900 }}>
              No products found
            </h3>
            <p style={{ opacity: 0.6, marginTop: 10 }}>
              Try adjusting filters or check back later.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================
   PRODUCT CARD
========================= */

interface ProductCardProps {
  product: ProductListItem;
  onClick: () => void;
}

function ProductCard({ product, onClick }: ProductCardProps) {
  const imageUrl =
    product.main_image?.startsWith("http")
      ? product.main_image
      : product.main_image
      ? `${API}${product.main_image}`
      : null;

  const inStock = product.stock > 0;

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 20,
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow =
          "0 28px 70px rgba(15,23,42,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 18px 50px rgba(15,23,42,0.12)";
      }}
    >
      {/* IMAGE */}
      <div
        style={{
          height: 280,
          background: imageUrl
            ? `url(${imageUrl}) center/cover`
            : "#e5e7eb",
          display: "grid",
          placeItems: "center",
        }}
      >
        {!imageUrl && (
          <div style={{ fontSize: 60, opacity: 0.3 }}>📦</div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ padding: 20 }}>
        {/* STORE BADGE */}
        {product.store && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 999,
              background: "#eef2ff",
              color: "#3730a3",
              display: "inline-block",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            {product.store}
          </div>
        )}

        {/* TITLE */}
        <h3
          style={{
            fontSize: 18,
            fontWeight: 900,
            marginBottom: 6,
            lineHeight: 1.3,
          }}
        >
          {product.title}
        </h3>

        {/* SHORT DESC */}
        {product.short_description && (
          <p
            style={{
              fontSize: 14,
              opacity: 0.6,
              marginBottom: 14,
            }}
          >
            {product.short_description}
          </p>
        )}

        {/* PRICE */}
        <div style={{ fontSize: 22, fontWeight: 900 }}>
          {formatM(product.price)}
        </div>

        {/* RATING */}
        {product.rating_number && product.rating_number > 0 && (
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
            ⭐ {product.rating_number} reviews
          </div>
        )}

        {/* STOCK BADGE */}
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            fontWeight: 800,
            padding: "6px 12px",
            borderRadius: 999,
            background: inStock ? "#dcfce7" : "#fee2e2",
            color: inStock ? "#166534" : "#991b1b",
            display: "inline-block",
          }}
        >
          {inStock ? "In Stock" : "Out of Stock"}
        </div>
      </div>
    </div>
  );
}
