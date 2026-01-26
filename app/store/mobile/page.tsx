import { products } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";

export default function MobileStore() {
  const list = products
    .filter((p) => p.category === "mobile")
    .map((p) => ({
      ...p,

      // ✅ TEMPORARY DEFAULTS (STOCK NOT LIVE YET)
      stock: 0,
      in_stock: false,

      // 🔒 SAFETY FALLBACKS
      category: p.category || "general",
      img: p.img || "/placeholder.png",
    }));

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* HEADER */}
      <section
        style={{
          borderRadius: 22,
          padding: 22,
          background:
            "linear-gradient(135deg,#eef6ff,#fff1f6,#f8fbff)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>
          Mobile & Accessories
        </h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Cases, chargers, and smart mobile gear.
        </p>
      </section>

      {/* GRID */}
      <section
        style={{
          borderRadius: 24,
          padding: 22,
          background: "#ffffff",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        {list.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            No mobile products available yet.
          </div>
        ) : (
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
        )}
      </section>
    </div>
  );
}
