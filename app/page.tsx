import Link from "next/link";
import ProductCard from "@/components/store/ProductCard";
import { getProducts, Product as ApiProduct } from "@/lib/api";

/* =======================
   Helpers
======================= */

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Normalize API products into a shape
 * guaranteed safe for ProductCard
 */
function normalizeForCard(p: ApiProduct) {
  return {
    ...p,
    img: p.img || p.image || "/placeholder.png",
    category: p.category || "general",
  };
}

/**
 * Picks products randomly across categories
 */
function pickRandomFromEachStore(
  allProducts: ApiProduct[],
  count = 12
) {
  if (!Array.isArray(allProducts) || allProducts.length === 0) return [];

  const groups = allProducts.reduce<Record<string, ApiProduct[]>>(
    (acc, p) => {
      const key = (p.category || "other").toLowerCase();
      acc[key] = acc[key] || [];
      acc[key].push(p);
      return acc;
    },
    {}
  );

  const keys = Object.keys(groups);

  if (keys.length <= 1) {
    return shuffleArray(allProducts).slice(0, count);
  }

  keys.forEach((k) => (groups[k] = shuffleArray(groups[k])));

  const selected: ApiProduct[] = [];
  let round = 0;

  while (selected.length < count) {
    let added = false;
    for (const key of keys) {
      const item = groups[key]?.[round];
      if (item && selected.length < count) {
        selected.push(item);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }

  if (selected.length < count) {
    const ids = new Set(selected.map((p) => p.id || p._id));
    const remaining = allProducts.filter(
      (p) => !ids.has(p.id || p._id)
    );
    selected.push(
      ...shuffleArray(remaining).slice(0, count - selected.length)
    );
  }

  return selected;
}

/* =======================
   Page
======================= */

export default async function HomePage() {
  let products: ApiProduct[] = [];

  try {
    products = await getProducts();
  } catch (err) {
    console.error("❌ Failed to load products:", err);
    products = [];
  }

  const featuredProducts = pickRandomFromEachStore(products, 12)
    .map(normalizeForCard); // 🔑 CRITICAL FIX

  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        marginTop: "calc(-1 * (var(--headerH) + var(--headerGap)))",
      }}
    >
      {/* HERO */}
      <section className="glass neon-border" style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 1200 }}>
              Welcome to Karabo’s Boutique!
            </div>

            <div style={{ marginTop: 8, fontWeight: 900 }}>
              Lesotho’s premium online shop for beauty, fashion, and accessories —
              curated with style.
            </div>
          </div>

          <Link className="btn btnPrimary" href="/store">
            Full Store →
          </Link>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="glass neon-border" style={{ padding: 18 }}>
        {featuredProducts.length === 0 ? (
          <div className="muted">Products will appear here soon.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {featuredProducts.map((p) => (
              <ProductCard key={p._id || p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
