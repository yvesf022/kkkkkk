"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const INTERVAL = 7000;

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentHero, setCurrentHero] = useState<ProductListItem[]>([]);
  const [nextHero, setNextHero] = useState<ProductListItem[]>([]);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  const poolRef = useRef<ProductListItem[]>([]);
  const heroIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    setLoading(true);
    try {
      const first = await productsApi.list({ page: 1, per_page: 40 });
      const total: number = first?.total ?? 0;
      let all: ProductListItem[] = first?.results ?? [];

      if (total > 40) {
        const maxPage = Math.floor(total / 40);
        const rndPage = Math.floor(Math.random() * maxPage) + 2;
        try {
          const extra = await productsApi.list({ page: rndPage, per_page: 40 });
          all = [...all, ...(extra?.results ?? [])];
        } catch {}
      }

      const shuffled = shuffle(all);
      poolRef.current = shuffled;
      heroIndexRef.current = 0;

      setCurrentHero(shuffled.slice(0, 4));
      setProducts(shuffled.slice(4, 12));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      {/* HERO */}
      <section
        style={{
          position: "relative",
          minHeight: "min(720px, 80vh)", // reduced from 88vh
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #0a0f2e 0%, #0033a0 45%, #005c2e 100%)",
        }}
      >
        <div
          className="container"
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 1280, // constrained width
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 480px), 1fr))",
              gap: 40, // reduced from 64
              alignItems: "center",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(36px, 6vw, 58px)", // slightly reduced
                  fontWeight: 900,
                  lineHeight: 1.1,
                  marginBottom: 18,
                  color: "#fff",
                }}
              >
                Discover Your
                <br />
                <span
                  style={{
                    background:
                      "linear-gradient(90deg, #fff 0%, #d4af37 60%, #f9d977 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Signature Style
                </span>
              </h1>

              <p
                style={{
                  fontSize: "16px",
                  lineHeight: 1.7,
                  marginBottom: 28,
                  color: "rgba(255,255,255,0.85)",
                  maxWidth: 480,
                }}
              >
                Curated fashion and beauty collections crafted for elegance and
                confidence.
              </p>

              <button
                onClick={() => router.push("/store")}
                style={{
                  padding: "14px 28px", // reduced
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0033a0",
                  background: "#fff",
                  border: "none",
                  borderRadius: 40,
                  cursor: "pointer",
                }}
              >
                Shop Now
              </button>
            </div>

            {/* HERO PRODUCTS */}
            {!loading && currentHero.length > 0 && (
              <div
                style={{
                  maxWidth: 520, // prevents over-expansion
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  {currentHero.map((product) => (
                    <HeroCard
                      key={product.id}
                      product={product}
                      router={router}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FEATURED SECTION */}
      <section
        style={{
          padding: "72px 0", // reduced from 100px
          background:
            "linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)",
        }}
      >
        <div
          className="container"
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 38px)",
              fontWeight: 900,
              marginBottom: 40,
            }}
          >
            Featured Collection
          </h2>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              Loading products...
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function HeroCard({
  product,
  router,
}: {
  product: ProductListItem;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div
      onClick={() => router.push(`/store/product/${product.id}`)}
      style={{
        background: "#fff",
        borderRadius: 18,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: "0 8px 28px rgba(0,0,0,0.18)", // reduced
        transition: "transform 0.3s ease",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.transform = "translateY(-6px) scale(1.02)") // reduced scale
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.transform = "translateY(0) scale(1)")
      }
    >
      <div
        style={{
          aspectRatio: "1",
          backgroundImage: product.main_image
            ? `url(${product.main_image})`
            : "linear-gradient(135deg, #1a1a2e, #16213e)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div style={{ padding: "12px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 4,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {product.title}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>
          M {Number(product.price).toFixed(2)}
        </div>
      </div>
    </div>
  );
}
