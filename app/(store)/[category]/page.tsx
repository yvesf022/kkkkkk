import ProductCard from "@/components/store/ProductCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_URL!;

/**
 * Store category metadata
 * Frontend display ↔ backend category mapping
 */
const STORE_CATEGORIES: Record<
  string,
  { title: string; description: string; backend?: string }
> = {
  all: {
    title: "All Products",
    description: "Browse everything in our store",
  },
  beauty: {
    title: "Beauty Products",
    description: "Glow, skincare, cosmetics",
    backend: "beauty",
  },
  tech: {
    title: "Mobile & Accessories",
    description: "Cases, chargers, add-ons",
    backend: "tech",
  },
  fashion: {
    title: "Fashion Store",
    description: "Streetwear & lifestyle",
    backend: "fashion",
  },
};

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const categoryKey = params.category.toLowerCase();
  const category = STORE_CATEGORIES[categoryKey];

  // 🚫 Unknown category → real 404 UX
  if (!category) {
    return (
      <div>
        <h1>Category not found</h1>
        <p>This store category does not exist.</p>
        <Link href="/store">← Back to store</Link>
      </div>
    );
  }

  const query =
    category.backend != null
      ? `?category=${category.backend}`
      : "";

  let products: any[] = [];

  try {
    const res = await fetch(`${API}/api/products${query}`, {
      cache: "no-store",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch products");
    }

    products = await res.json();
  } catch (error) {
    return (
      <div>
        <h1>{category.title}</h1>
        <p style={{ opacity: 0.6 }}>
          We’re having trouble loading products right now.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* ===== STORE HEADER ===== */}
      <header>
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>
          {category.title}
        </h1>
        <p style={{ opacity: 0.6 }}>{category.description}</p>
      </header>

      {/* ===== EMPTY STATE ===== */}
      {products.length === 0 && (
        <div style={{ opacity: 0.7 }}>
          <p>No products found in this category.</p>
          <Link href="/store">Browse all products →</Link>
        </div>
      )}

      {/* ===== PRODUCT GRID ===== */}
      {products.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(220px,1fr))",
            gap: 18,
          }}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
