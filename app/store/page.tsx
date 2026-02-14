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

        // Build query params from filters
        const params: any = {};
        if (filters.category) params.category = filters.category;
        if (filters.brand) params.brand = filters.brand;
        if (filters.minPrice) params.min_price = filters.minPrice;
        if (filters.maxPrice) params.max_price = filters.maxPrice;
        if (filters.inStock !== undefined) params.in_stock = filters.inStock;
        if (sort) params.sort = sort;

        const data = (await productsApi.list(params)) as ProductListItem[];
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [filters, sort]);

  return (
    <div style={{ display: "grid", gap: 28, maxWidth: 1400, margin: "0 auto" }}>
      {/* STORE HEADER / FILTERS */}
      <StoreToolbar
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
      />

      {/* CATEGORY TABS */}
      <StoreTabs filters={filters} setFilters={setFilters} />

      {/* PRODUCTS SECTION */}
      <section>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
            {filters.category
              ? `${filters.category} Products`
              : "All Products"}
          </h2>
          <p style={{ fontSize: 14, opacity: 0.6 }}>
            {products.length} product{products.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* LOADING */}
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
        {!loading && products.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => router.push(`/store/product/${product.id}`)}
              />
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && products.length === 0 && (
          <div
            style={{
              padding: 80,
              textAlign: "center",
              borderRadius: 22,
              background: "linear-gradient(135deg, #ffffff, #f8fbff)",
              boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 24 }}>🔍</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>
              No products found
            </h3>
            <p style={{ fontSize: 16, opacity: 0.65, marginBottom: 32 }}>
              {filters.category
                ? `No products in the "${filters.category}" category yet.`
                : "Try adjusting your filters or check back later."}
            </p>
            {Object.keys(filters).length > 0 && (
              <button
                className="btn btnPrimary"
                onClick={() => setFilters({})}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ============ PRODUCT CARD ============ */

interface ProductCardProps {
  product: ProductListItem;
  onClick: () => void;
}

function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div
      onClick={onClick}
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
            {product.rating && product.rating > 0 && (
              <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>
                ⭐ {product.rating.toFixed(1)} ({product.sales || 0} sold)
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
