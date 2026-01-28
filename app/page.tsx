export const dynamic = "force-dynamic";

import Link from "next/link";
import ProductCard from "@/components/store/ProductCard";
import { fetchProducts, Product as ApiProduct } from "@/lib/api";

/* =======================
   HELPERS
======================= */

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function normalizeForCard(p: ApiProduct) {
  return {
    id: p.id,
    title: p.name,
    price: p.price,
    img: p.image_url || "/placeholder.png",
    category: "general",
    rating: 4.5,
    stock: 0,
    in_stock: false,
  };
}

/* =======================
   PAGE
======================= */

export default async function HomePage() {
  let products: ApiProduct[] = [];

  try {
    products = await fetchProducts();
  } catch (e) {
    console.error("Failed to load products", e);
  }

  const featured = shuffle(products)
    .slice(0, 12)
    .map(normalizeForCard);

  return (
    <div
      style={{
        display: "grid",
        gap: 48,
        paddingBottom: 80,
      }}
    >
      {/* HERO */}
      <section className="heroSection">
        <div className="heroInner">
          <h1 className="heroTitle">
            Karabo’s Boutique
          </h1>

          <p className="heroSubtitle">
            Lesotho’s premium online destination for beauty, fashion,
            and accessories.
          </p>

          <div className="heroActions">
            <Link href="/store" className="btn btnTech">
              Explore store →
            </Link>

            <Link href="/store" className="btn btnGhost">
              Browse categories
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED HEADER */}
      <section className="sectionHeader">
        <h2 className="sectionTitle">
          Featured products
        </h2>

        <Link href="/store" className="btn btnTech">
          View all →
        </Link>
      </section>

      {/* PRODUCTS */}
      <section className="card">
        {featured.length === 0 ? (
          <div className="emptyState">
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
