import { products } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";

export default function MobileStore() {
  const list = products
    .filter((p) => p.category === "mobile")
    .map((p) => ({
      ...p,

      // ✅ REQUIRED BY Product TYPE
      stock:
        typeof p.stock === "number" ? p.stock : 0,
      in_stock:
        typeof p.in_stock === "boolean"
          ? p.in_stock
          : false,

      // 🔒 SAFETY FALLBACKS
      category: p.category || "general",
      img: p.img || "/placeholder.png",
    }));

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* ================= HEADER ================= */}
      <section
        style={{
          borderRadius: 22,
          padding: 22,
          background: `
            radial-gradient(
              420px 220px at 10% 0%,
              rgba(96,165,250,0.25),
              transparent 60%
            ),
            radial-gradient(
              360px 200px at 90% 10%,
              rgba(244,114,182,0.22),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow:
            "0 18px 50px rgba(15,23,42,0.14)",
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          Mobile & Accessories
        </h1>

        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(15,23,42,0.6)",
          }}
        >
          Cases, charging, and smart gear — fast, clean, and stylish.
        </p>
      </section>

      {/* ================= GRID ================= */}
      <section
        style={{
          borderRadius: 24,
          padding: 22,
          background:
            "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow:
            "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        {list.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              fontWeight: 600,
              color: "rgba(15,23,42,0.55)",
            }}
          >
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
