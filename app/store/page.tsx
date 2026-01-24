"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/store/ProductCard";
import StoreToolbar, {
  Filters as BaseFilters,
  SortMode,
} from "@/components/store/StoreToolbar";

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
  category?: string;
  img?: string;        // ✅ required by ProductCard
  image?: string;      // optional (kept if used elsewhere)
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

  // 🔹 Fetch products from backend
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`)
      .then((res) => res.json())
      .then((data: BackendProduct[]) => {
        const mapped: UIProduct[] = data.map((p) => {
          const imageUrl = p.image
            ? `${process.env.NEXT_PUBLIC_API_URL}/uploads/products/${p.image}`
            : undefined;

          return {
            id: p._id,
            title: p.title,
            price: p.price,
            rating: 4.5, // placeholder
            tags: [
              ...(p.category ? [p.category] : []),
              ...(p.varieties ?? []),
            ],
            category: p.category,
            img: imageUrl,   // ✅ ProductCard expects this
            image: imageUrl, // optional duplicate
          };
        });

        setProducts(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    let data = [...products];

    // Search
    const q = filters.q.trim().toLowerCase();
    if (q.length > 0) {
      data = data.filter((p) => {
        const search = (p.title + " " + p.tags.join(" ")).toLowerCase();
        return search.includes(q);
      });
    }

    // Filters
    data = data.filter((p) => p.rating >= filters.minRating);
    data = data.filter((p) => p.price <= filters.priceMax);

    if (filters.onlyDiscount) {
      data = data.filter((p) => (p.oldPrice ?? 0) > p.price);
    }

    // Sort (SortMode treated opaquely)
    const sortKey = String(sort);

    if (sortKey === "priceLow") {
      data.sort((a, b) => a.price - b.price);
    } else if (sortKey === "priceHigh") {
      data.sort((a, b) => b.price - a.price);
    } else if (sortKey === "rating") {
      data.sort((a, b) => b.rating - a.rating);
    }

    return data;
  }, [products, filters, sort]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <StoreToolbar
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div className="badge">
          {loading ? "Loading…" : <>Showing <b>{list.length}</b> products</>}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
