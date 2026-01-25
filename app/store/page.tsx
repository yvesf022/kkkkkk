"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import ProductCard from "@/components/store/ProductCard";
import StoreToolbar, {
  Filters as BaseFilters,
  SortMode,
} from "@/components/store/StoreToolbar";

import StoreTabs from "@/components/store/StoreTabs";
import SearchBar from "@/components/store/SearchBar";
import FiltersBar from "@/components/store/FiltersBar";

/* =======================
   Types
======================= */

type Filters = BaseFilters & {
  minRating: number;
  priceMax: number;
  onlyDiscount: boolean;
};

type BackendProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  category?: string;
  varieties?: string[];
  image?: string;
};

type UIProduct = {
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  rating: number;
  tags: string[];
  category: string;
  img: string;
};

/* =======================
   Page
======================= */

export default function StorePage() {
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    q: "",
    minRating: 0,
    priceMax: 5000,
    onlyDiscount: false,
  });

  const [sort, setSort] = useState<SortMode>("featured");

  /* =======================
     Fetch products
  ======================= */

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`)
      .then((res) => res.json())
      .then((data: BackendProduct[]) => {
        const mapped: UIProduct[] = data.map((p) => {
          const img = p.image
            ? `${process.env.NEXT_PUBLIC_API_URL}/uploads/products/${p.image}`
            : "/placeholder.png";

          return {
            id: p._id,
            title: p.title,
            price: p.price,
            rating: 4.5,
            tags: [
              ...(p.category ? [p.category] : []),
              ...(p.varieties ?? []),
            ],
            category: p.category ?? "general",
            img,
          };
        });

        setProducts(mapped);
        setLoading(false);
      });
  }, []);

  /* =======================
     Filter + Sort
  ======================= */

  const visibleProducts = useMemo(() => {
    let data = [...products];

    // Search
    if (filters.q) {
      const q = filters.q.toLowerCase();
      data = data.filter((p) =>
        p.title.toLowerCase().includes(q)
      );
    }

    // Category
    if (filters.category) {
      data = data.filter(
        (p) => p.category === filters.category
      );
    }

    // Min / Max price (from FiltersBar)
    if (filters.min !== undefined) {
      data = data.filter((p) => p.price >= filters.min!);
    }

    if (filters.max !== undefined) {
      data = data.filter((p) => p.price <= filters.max!);
    }

    // Sort
    if (sort === "price_low") {
      data.sort((a, b) => a.price - b.price);
    } else if (sort === "price_high") {
      data.sort((a, b) => b.price - a.price);
    } else if (sort === "rating") {
      data.sort((a, b) => b.rating - a.rating);
    }

    return data;
  }, [products, filters, sort]);

  /* =======================
     Render
  ======================= */

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Top navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" className="btn btnGhost">
          ← Home
        </Link>
      </div>

      {/* Store Tabs */}
      <StoreTabs filters={filters} setFilters={setFilters} />

      {/* Search */}
      <SearchBar filters={filters} setFilters={setFilters} />

      {/* Filters + Sort */}
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
      />

      {/* Toolbar (optional summary / reset) */}
      <StoreToolbar
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
      />

      {/* Products */}
      {loading ? (
        <div>Loading products…</div>
      ) : visibleProducts.length === 0 ? (
        <div>No products found.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          {visibleProducts.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
