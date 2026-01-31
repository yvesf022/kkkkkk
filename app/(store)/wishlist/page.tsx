"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

import { useStore } from "@/lib/store";

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

type Product = {
  id: string;
  title: string;
  price: number;
  main_image: string;
};

export default function WishlistPage() {
  const wishlist = useStore((s) => s.wishlist);
  const toggleWishlist = useStore(
    (s) => s.toggleWishlist
  );

  const [products, setProducts] = useState<Product[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/products`,
          { credentials: "include" }
        );

        if (!res.ok) throw new Error();

        const data = await res.json();
        setProducts(data);
      } catch {
        toast.error("Failed to load wishlist");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const savedProducts = products.filter((p) =>
    wishlist.includes(p.id)
  );

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <p>Loading wishlist…</p>
      </div>
    );
  }

  if (savedProducts.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Wishlist
        </h1>
        <p style={{ opacity: 0.6, marginTop: 8 }}>
          You haven’t saved any products yet.
        </p>

        <Link
          href="/store"
          className="btn btnTech"
          style={{
            marginTop: 16,
            display: "inline-block",
          }}
        >
          Browse Store
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>
        Your Wishlist
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(220px,1fr))",
          gap: 18,
        }}
      >
        {savedProducts.map((product) => (
          <div
            key={product.id}
            style={{
              padding: 16,
              borderRadius: 22,
              background:
                "linear-gradient(135deg,#ffffff,#f8fbff)",
              boxShadow:
                "0 18px 50px rgba(15,23,42,0.14)",
              display: "grid",
              gap: 10,
            }}
          >
            <Link
              href={`/store/product/${product.id}`}
            >
              <div
                style={{
                  height: 170,
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <Image
                  src={product.main_image}
                  alt={product.title}
                  width={700}
                  height={500}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </Link>

            <div
              style={{
                fontWeight: 900,
                fontSize: 14,
                color: "#0f172a",
                lineHeight: 1.3,
              }}
            >
              {product.title}
            </div>

            <div style={{ fontWeight: 900 }}>
              {fmtM(product.price)}
            </div>

            <button
              className="btn btnGhost"
              onClick={() => {
                toggleWishlist(product.id);
                toast.success(
                  "Removed from wishlist"
                );
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
