export const dynamic = "force-dynamic";

import Link from "next/link";
import ProductCard from "@/components/store/ProductCard";
import { fetchProducts, Product as ApiProduct } from "@/lib/api";

/* =======================
   HELPERS
======================= */

/**
 * Deterministic shuffle (daily seed)
 * Prevents hydration mismatch while keeping variety
 */
function seededShuffle<T>(arr: T[]) {
  const seed = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return [...arr].sort(() => {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280 - 0.5;
  });
}

/**
 * Normalize API Product → ProductCard Product
 */
function normalizeForCard(p: ApiProduct) {
  return {
    id: p.id,

    // ProductCard expects `title`
    title: p.name,

    price: p.price,

    // UI-only safe defaults
    img: p.image_url || "/placeholder.png",
    category: "general",
    rating: 4.5,
    stock: 0,
    in_stock: false,
  };
}

/* =======================
   PAGE (SERVER COMPONENT)
======================= */

export default async function HomePage() {
  let products: ApiProduct[] = [];
  let hasError = false;

  try {
    products = await fetchProducts();
  } catch (err) {
    console.error("Failed to load products", err);
    hasError = true;
  }

  const featured = seededShuffle(products)
    .slice(0, 12)
    .map(normalizeForCard);

  return (
    <div
      style={{
        display: "grid",
        gap: 36,
        paddingBottom: 72,
      }}
    >
      {/* ================= HERO ================= */}
      <section
        style={{
          borderRadius: 24,
          padding: "36px 40px",
          background: `
            radial-gradient(
              500px 260px at 12% 0%,
              rgba(96,165,250,0.25),
              transparent 60%
            ),
            radial-gradient(
              420px 220px at 90% 10%,
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
          boxShadow: `
            0 20px 60px rgba(15,23,42,0.12),
            inset 0 0 0 1px rgba(255,255,255,0.7)
          `,
        }}
      >
        <div style={{ maxWidth: 720 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: "-0.4px",
              color: "#0f172a",
            }}
          >
            Karabo’s Boutique
          </h1>

          <p
            style={{
              marginTop: 12,
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(15,23,42,0.65)",
            }}
          >
            Lesotho&apos;s premium online destination for beauty, fashion, and
            accessories.
          </p>

          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 22,
              flexWrap: "wrap",
            }}
          >
            <Link href="/store" className="btn btnTech">
              Explore Store →
            </Link>

            <Link href="/store" className="btn btnGhost">
              Browse Categories
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FEATURED ================= */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          Featured Products
        </h2>

        <Link href="/store" className="btn btnTech">
          View all →
        </Link>
      </section>

      {/* ================= PRODUCTS ================= */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        {hasError ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              fontWeight: 700,
              color: "#b91c1c",
            }}
          >
            We’re having trouble loading products right now.
            <br />
            Please try again shortly.
          </div>
        ) : featured.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "rgba(15,23,42,0.55)",
              fontWeight: 600,
            }}
          >
            Products will appear here soon.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 20,
            }}
          >
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
