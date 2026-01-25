"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import ProductCard from "@/components/store/ProductCard";
import { getProducts, Product as ApiProduct } from "@/lib/api";

/* =======================
   HELPERS
======================= */

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeForCard(p: ApiProduct) {
  const id = p.id ?? p._id ?? "";
  return {
    ...p,
    id,
    img: p.img || p.image || "/placeholder.png",
    category: p.category || "general",
    rating: 4.5,
  };
}

/* =======================
   PAGE
======================= */

export default async function HomePage() {
  let products: ApiProduct[] = [];

  try {
    products = await getProducts();
  } catch (e) {
    console.error("❌ Products load failed", e);
  }

  const featured = shuffleArray(products)
    .slice(0, 12)
    .map(normalizeForCard);

  return (
    <div style={{ display: "grid", gap: 48, paddingBottom: 96 }}>
      {/* ================= HERO ================= */}
      <section
        style={{
          position: "relative",
          borderRadius: 28,
          padding: "56px 48px",
          overflow: "hidden",
          background: `
            radial-gradient(
              900px 420px at 10% -10%,
              rgba(58,169,255,0.22),
              transparent 45%
            ),
            radial-gradient(
              800px 380px at 90% 10%,
              rgba(99,102,241,0.18),
              transparent 45%
            ),
            linear-gradient(
              135deg,
              #0b1220,
              #0f1b2d,
              #111827
            )
          `,
          boxShadow: "0 50px 120px rgba(2,6,23,0.65)",
          color: "#e5e7eb",
        }}
      >
        {/* subtle tech noise overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.04), rgba(255,255,255,0))",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 1100,
              lineHeight: 1.05,
              letterSpacing: "-0.6px",
              color: "#f8fafc",
            }}
          >
            Karabo’s Boutique
          </h1>

          <p
            style={{
              marginTop: 18,
              fontSize: 18,
              fontWeight: 600,
              maxWidth: 680,
              color: "rgba(226,232,240,0.75)",
            }}
          >
            Lesotho&apos;s premium online destination for beauty, fashion, and
            accessories — designed with elegance, powered by modern tech.
          </p>

          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 36,
              flexWrap: "wrap",
            }}
          >
            {/* BLUE DOMINANT CTA */}
            <Link href="/store" className="btn btnTech">
              Shop the Collection →
            </Link>

            <Link href="/store" className="btn btnGhost">
              Browse Categories
            </Link>
          </div>

          {/* trust indicators */}
          <div
            style={{
              display: "flex",
              gap: 42,
              marginTop: 44,
              flexWrap: "wrap",
            }}
          >
            {[
              ["500+", "Curated Products"],
              ["Secure", "Payments & Checkout"],
              ["Premium", "Quality Promise"],
            ].map(([a, b]) => (
              <div key={a}>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 1000,
                    color: "#f1f5f9",
                  }}
                >
                  {a}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(226,232,240,0.6)",
                  }}
                >
                  {b}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CATEGORY STRIP ================= */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 24,
        }}
      >
        {[
          {
            title: "Beauty Store",
            desc: "Skincare, glow & cosmetics",
            bg: "linear-gradient(135deg,#0ea5e9,#2563eb)",
          },
          {
            title: "Mobile & Accessories",
            desc: "Tech essentials & add-ons",
            bg: "linear-gradient(135deg,#1e293b,#0f172a)",
          },
          {
            title: "Fashion Store",
            desc: "Modern outfits & streetwear",
            bg: "linear-gradient(135deg,#312e81,#1e1b4b)",
          },
        ].map((c) => (
          <Link
            key={c.title}
            href="/store"
            style={{
              padding: 28,
              borderRadius: 22,
              background: c.bg,
              textDecoration: "none",
              color: "#f8fafc",
              boxShadow: "0 24px 60px rgba(2,6,23,0.55)",
              transition: "transform .25s ease, box-shadow .25s ease",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900 }}>{c.title}</div>
            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(226,232,240,0.75)",
              }}
            >
              {c.desc}
            </div>
          </Link>
        ))}
      </section>

      {/* ================= FEATURED ================= */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 26,
            fontWeight: 1000,
            color: "#020617",
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
          borderRadius: 28,
          padding: 28,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(248,250,252,0.92))",
          boxShadow: "0 32px 90px rgba(2,6,23,0.25)",
        }}
      >
        {featured.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              fontWeight: 700,
              color: "rgba(2,6,23,0.55)",
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
              gap: 22,
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
