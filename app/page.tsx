"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedProducts() {
      try {
        const data = await productsApi.list({ page: 1, per_page: 8 });

        if (Array.isArray(data)) {
          setFeaturedProducts(data);
        } else {
          setFeaturedProducts([]);
        }
      } catch {
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadFeaturedProducts();
  }, []);

  return (
    <div className="homeWrap">
      {/* HERO + PRODUCTS ABOVE FOLD */}
      <section className="heroSplit">
        <div className="heroContent">
          <span className="heroTag">Premium Beauty & Lifestyle</span>

          <h1 className="heroTitle">
            Discover Your Signature Style
          </h1>

          <p className="heroText">
            Curated elegance from Lesotho’s modern boutique.
            Beauty, fashion and essentials designed to elevate
            your everyday.
          </p>

          <div className="heroActions">
            <button
              className="btnModernPrimary"
              onClick={() => router.push("/store")}
            >
              Shop Collection
            </button>

            <button
              className="btnModernGhost"
              onClick={() => router.push("/store")}
            >
              Explore Categories
            </button>
          </div>
        </div>

        <div className="heroProducts">
          {!loading &&
            featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>
      </section>

      {/* FULL PRODUCT GRID */}
      <section className="featuredSection">
        <div className="sectionHeader">
          <div>
            <h2>Featured Collection</h2>
            <p>Handpicked premium selections</p>
          </div>

          <button
            className="btnModernDark"
            onClick={() => router.push("/store")}
          >
            View All
          </button>
        </div>

        <div className="productGrid">
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="productSkeleton" />
            ))}

          {!loading &&
            featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>
      </section>
    </div>
  );
}

/* PRODUCT CARD */

function ProductCard({ product }: { product: ProductListItem }) {
  const router = useRouter();

  return (
    <div
      className="productCardModern"
      onClick={() => router.push(`/store/product/${product.id}`)}
    >
      <div
        className="productImage"
        style={{
          background: product.main_image
            ? `url(${product.main_image}) center/cover`
            : "#f1f5f9",
        }}
      />

      <div className="productInfo">
        <h3>{product.title}</h3>

        <div className="productPrice">
          M {Math.round(product.price).toLocaleString("en-ZA")}
        </div>
      </div>
    </div>
  );
}
