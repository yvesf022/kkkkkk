"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/store/ProductCard";
import ProductCardSkeleton from "@/components/store/ProductCardSkeleton";
import StoreToolbar from "@/components/store/StoreToolbar";
import StoreTabs from "@/components/store/StoreTabs";
import FiltersBar from "@/components/store/FiltersBar";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default function StorePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* TOOLBAR */}
      <StoreToolbar />

      {/* CATEGORY TABS */}
      <StoreTabs />

      {/* FILTERS */}
      <FiltersBar />

      {/* PRODUCTS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          : products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
      </div>
    </div>
  );
}
