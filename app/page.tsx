"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await productsApi.list({ page: 1, per_page: 8 });
        if (Array.isArray(data)) setProducts(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="homeContainer">
      {/* HERO */}
      <section className="heroModern">
        <div className="heroLeft">
          <span className="heroBadge">Lesotho Premium Boutique</span>

          <h1>
            Beauty.
            <br />
            Confidence.
            <br />
            Elegance.
          </h1>

          <p>
            Discover curated fashion and beauty collections designed
            for modern lifestyle. Clean. Premium. Timeless.
          </p>

          <div className="heroButtons">
            <button
              className="btnPrimaryModern"
              onClick={() => router.push("/store")}
            >
              Shop Now
            </button>

            <button
              className="btnSecondaryModern"
              onClick={() => router.push("/store")}
            >
              Explore
            </button>
          </div>
        </div>

        {/* Featured Product */}
        {!loading && products[0] && (
          <div
            className="heroProduct"
            onClick={() =>
              router.push(`/store/product/${products[0].id}`)
            }
          >
            <div
              className="heroProductImage"
              style={{
                background: products[0].main_image
                  ? `url(${products[0].main_image}) center/cover`
                  : "#e2e8f0",
              }}
            />

            <div className="heroProductOverlay">
              <h3>{products[0].title}</h3>
              <span>
                M{" "}
                {Math.round(products[0].price).toLocaleString(
                  "en-ZA"
                )}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* PRODUCT GRID */}
      <section className="modernGridSection">
        <div className="modernGridHeader">
          <h2>Featured Collection</h2>
          <button
            className="btnDarkModern"
            onClick={() => router.push("/store")}
          >
            View All
          </button>
        </div>

        <div className="modernGrid">
          {products.slice(1).map((p) => (
            <div
              key={p.id}
              className="modernCard"
              onClick={() =>
                router.push(`/store/product/${p.id}`)
              }
            >
              <div
                className="modernCardImage"
                style={{
                  background: p.main_image
                    ? `url(${p.main_image}) center/cover`
                    : "#f1f5f9",
                }}
              />

              <div className="modernCardInfo">
                <h4>{p.title}</h4>
                <span>
                  M{" "}
                  {Math.round(p.price).toLocaleString("en-ZA")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
