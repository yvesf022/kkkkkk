import { products } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";

export default function FashionStore() {
  const list = products
    .filter((p) => p.category === "fashion")
    .map((p) => ({
      ...p,
      category: p.category || "general", // 🔒 ProductCard safety
      img: p.img || p.image || "/placeholder.png",
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
              420px 220px at 12% 0%,
              rgba(244,114,182,0.28),
              transparent 60%
            ),
            radial-gradient(
              360px 200px at 90% 10%,
              rgba(96,165,250,0.22),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #fff4f8,
              #f0f6ff,
              #f8fbff
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
          Fashion Store
        </h1>

        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(15,23,42,0.6)",
          }}
        >
          Modern outfits, streetwear, and statement pieces — refined and bold.
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
            No fashion products available yet.
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
