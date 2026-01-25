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

function pickRandom(all: ApiProduct[], count = 12) {
  return shuffleArray(all).slice(0, count);
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

  const featured = pickRandom(products, 12).map(normalizeForCard);

  return (
    <div style={{ display: "grid", gap: 42, paddingBottom: 80 }}>
      {/* ================= HERO ================= */}
      <section
        style={{
          position: "relative",
          borderRadius: 28,
          padding: "56px 42px",
          overflow: "hidden",
          background: `
            radial-gradient(800px 400px at 10% -10%, rgba(58,169,255,0.35), transparent 45%),
            radial-gradient(700px 300px at 90% 10%, rgba(255,79,161,0.25), transparent 45%),
            linear-gradient(135deg, #ffffff, #f7faff, #fff1f6)
          `,
          boxShadow: "0 40px 90px rgba(12,14,20,0.18)",
        }}
      >
        {/* glow overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, rgba(58,169,255,0.08), rgba(255,79,161,0.08))",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 760,
          }}
        >
          <h1
            style={{
              fontSize: 44,
              fontWeight: 1100,
              lineHeight: 1.05,
              letterSpacing: "-0.5px",
            }}
          >
            Karabo’s Boutique
          </h1>

          <p
            style={{
              marginTop: 16,
              fontSize: 18,
              fontWeight: 600,
              color: "rgba(12,14,20,0.65)",
              maxWidth: 620,
            }}
          >
            A premium online destination for beauty, fashion, and accessories —
            designed with elegance, powered by modern tech.
          </p>

          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 32,
              flexWrap: "wrap",
            }}
          >
            <Link href="/store" className="btn btnPrimary">
              Shop Now →
            </Link>

            <Link href="/store" className="btn btnGhost">
              Browse Categories
            </Link>
          </div>

          {/* trust stats */}
          <div
            style={{
              display: "flex",
              gap: 36,
              marginTop: 40,
              flexWrap: "wrap",
            }}
          >
            {[
              ["500+", "Curated Products"],
              ["24/7", "Online Shopping"],
              ["Premium", "Quality Promise"],
            ].map(([a, b]) => (
              <div key={a}>
                <div style={{ fontSize: 26, fontWeight: 1000 }}>{a}</div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(12,14,20,0.55)",
                  }}
                >
                  {b}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 22,
        }}
      >
        {[
          {
            title: "Beauty Store",
            desc: "Glow, skincare & cosmetics",
            gradient: "linear-gradient(135deg,#ffe0f0,#e6f3ff)",
          },
          {
            title: "Mobile & Accessories",
            desc: "Tech essentials & add-ons",
            gradient: "linear-gradient(135deg,#e6f3ff,#eafff6)",
          },
          {
            title: "Fashion Store",
            desc: "Outfits & streetwear",
            gradient: "linear-gradient(135deg,#fff1f6,#ffe8ff)",
          },
        ].map((c) => (
          <Link
            key={c.title}
            href="/store"
            style={{
              padding: 26,
              borderRadius: 22,
              background: c.gradient,
              textDecoration: "none",
              color: "inherit",
              boxShadow: "0 18px 45px rgba(12,14,20,0.14)",
              transition: "transform .25s ease, box-shadow .25s ease",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900 }}>{c.title}</div>
            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(12,14,20,0.6)",
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
        <h2 style={{ fontSize: 26, fontWeight: 1000 }}>
          Featured Products
        </h2>

        <Link href="/store" className="btn btnGhost">
          View all
        </Link>
      </section>

      {/* ================= PRODUCTS ================= */}
      <section
        style={{
          borderRadius: 28,
          padding: 28,
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 30px 80px rgba(12,14,20,0.16)",
        }}
      >
        {featured.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              fontWeight: 700,
              color: "rgba(12,14,20,0.55)",
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
