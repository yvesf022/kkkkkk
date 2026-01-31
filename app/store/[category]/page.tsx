import { notFound } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  stock: number;
};

/* ======================
   PAGE
====================== */

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
    return notFound();
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
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 20 }}>
        {category}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 20,
        }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <img
              src={p.img}
              alt={p.title}
              style={{
                width: "100%",
                height: 180,
                objectFit: "cover",
                borderRadius: 12,
              }}
            />

            <div style={{ marginTop: 10, fontWeight: 800 }}>
              {p.title}
            </div>

            <div style={{ opacity: 0.6, fontSize: 14 }}>
              {p.category}
            </div>

            <div style={{ fontWeight: 900, marginTop: 6 }}>
              M {p.price.toLocaleString("en-ZA")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
