"use client";

import Link from "next/link";
import Image from "next/image";

import { products } from "@/lib/products";
import { useStore } from "@/lib/store";

const formatCurrency = (v: number) =>
  `₹ ${Math.round(v).toLocaleString("en-IN")}`;

export default function WishlistPage() {
  const wishlist = useStore((s) => s.wishlist);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const addToCart = useStore((s) => s.addToCart);

  const items = products.filter((p) => wishlist.includes(p.id));

  if (items.length === 0) {
    return (
      <div className="glass neon-border" style={{ padding: 18 }}>
        <div className="neon-text" style={{ fontSize: 22, fontWeight: 1000 }}>
          Wishlist
        </div>

        <div style={{ marginTop: 10, opacity: 0.75 }}>
          You haven’t saved any products yet.
        </div>

        <Link href="/store" className="btn btnPrimary" style={{ marginTop: 14 }}>
          Browse Store →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* HEADER */}
      <div className="glass neon-border" style={{ padding: 18 }}>
        <div className="neon-text" style={{ fontSize: 22, fontWeight: 1000 }}>
          Wishlist
        </div>
        <div style={{ opacity: 0.7 }}>
          Saved products you love ❤️
        </div>
      </div>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {items.map((p) => (
          <div
            key={p.id}
            className="glass neon-border"
            style={{
              padding: 14,
              display: "grid",
              gap: 10,
            }}
          >
            <Link href={`/product/${p.id}`}>
              <div
                style={{
                  height: 160,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <Image
                  src={p.img}
                  alt={p.title}
                  width={400}
                  height={300}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </Link>

            <div style={{ fontWeight: 1000 }}>{p.title}</div>

            <div style={{ opacity: 0.75 }}>
              {formatCurrency(p.price)}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btnPrimary"
                onClick={() => addToCart(p.id, 1)}
              >
                Add to Cart
              </button>

              <button
                className="btn"
                onClick={() => toggleWishlist(p.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="glass neon-border" style={{ padding: 16 }}>
        <Link href="/cart" className="btn btnPrimary">
          Go to Cart →
        </Link>
      </div>
    </div>
  );
}
