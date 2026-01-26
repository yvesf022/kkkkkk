import { products } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";

export default function FashionStore() {
  const list = products
    .filter((p) => p.category === "fashion")
    .map((p) => ({
      ...p,
      stock: 0,
      in_stock: false,
      category: p.category || "general",
      img: p.img || "/placeholder.png",
    }));

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section
        style={{
          borderRadius: 22,
          padding: 22,
          background:
            "linear-gradient(135deg,#fff4f8,#f0f6ff,#f8fbff)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>
          Fashion Store
        </h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Modern outfits and statement pieces.
        </p>
      </section>

      <section
        style={{
          borderRadius: 24,
          padding: 22,
          background: "#ffffff",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
