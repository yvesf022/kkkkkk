import { notFound } from "next/navigation";
import ProductCard from "@/components/store/ProductCard";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Product = {
  id: string;
  title: string;
  price: number;
  compare_price?: number;
  main_image: string;
  category: string;
  stock: number;
  in_stock: boolean;
};

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = params.category;

  const res = await fetch(
    `${API}/api/products?category=${encodeURIComponent(category)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    notFound();
  }

  const products: Product[] = await res.json();

  if (!products.length) {
    return (
      <div style={{ padding: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          {category}
        </h1>
        <p style={{ opacity: 0.6 }}>
          No products found in this category.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          marginBottom: 20,
        }}
      >
        {category}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 22,
        }}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </div>
  );
}
