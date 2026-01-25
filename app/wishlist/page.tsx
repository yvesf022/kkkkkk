"use client";

import Link from "next/link";
import Image from "next/image";
import { products } from "@/lib/products";
import { useStore } from "@/lib/store";
import { useCart } from "@/app/context/CartContext";

/** Currency (India kept as-is) */
const formatCurrency = (v: number) =>
  `₹ ${Math.round(v).toLocaleString("en-IN")}`;

export default function WishlistPage() {
  const wishlist = useStore((s) => s.wishlist);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const { addToCart } = useCart();

  const items = products
    .filter((p) => wishlist.includes(p.id))
    .map((p) => ({
      ...p,
      category: p.category || "general",
      img: p.img || "/placeholder.png", // ✅ FIXED
    }));

  /* ================= EMPTY ================= */

  if (items.length === 0) {
    return (
      <div
        style={{
          maxWidth: 640,
          margin: "48px auto 0",
          padding: 32,
          borderRadius: 26,
          background: `
            radial-gradient(
              420px 220px at 10% 0%,
              rgba(96,165,250,0.25),
              transparent 60%
            ),
            radial-gradient(
              360px 200px at 90% 10%,
              rgba(244,114,182,0.20),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow: "0 26px 70px rgba(15,23,42,0.18)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Wishlist
        </h1>

        <p
          style={{
            marginTop: 10,
            fontWeight: 600,
            color: "rgba(15,23,42,0.6)",
          }}
        >
          You haven’t saved any products yet.
        </p>

        <Link
          href="/store"
          className="btn btnTech"
          style={{ marginTop: 22 }}
        >
          Browse Store →
        </Link>
      </div>
    );
  }

  /* ================= FILLED ================= */

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* HEADER */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: `
            radial-gradient(
              420px 220px at 10% 0%,
              rgba(96,165,250,0.22),
              transparent 60%
            ),
            radial-gradient(
              360px 200px at 90% 10%,
              rgba(244,114,182,0.18),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Wishlist
        </h1>

        <p
          style={{
            marginTop: 6,
            fontWeight: 600,
            color: "rgba(15,23,42,0.6)",
          }}
        >
          Saved products you love ❤️
        </p>
      </section>

      {/* GRID */}
      <section
        style={{
          borderRadius: 26,
          padding: 24,
          background:
            "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow:
            "0 26px 70px rgba(15,23,42,0.16)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {items.map((p) => (
            <div
              key={p.id}
              style={{
                borderRadius: 22,
                padding: 16,
                background:
                  "linear-gradient(135deg,#ffffff,#f4f9ff)",
                boxShadow:
                  "0 14px 40px rgba(15,23,42,0.14)",
                display: "grid",
                gap: 12,
              }}
            >
              <Link href={`/product/${p.id}`}>
                <div
                  style={{
                    height: 160,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <Image
                    src={p.img}
                    alt={p.title}
                    width={400}
                    height={300}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              </Link>

              <div style={{ fontWeight: 900 }}>
                {p.title}
              </div>

              <div
                style={{
                  fontWeight: 700,
                  color: "rgba(15,23,42,0.7)",
                }}
              >
                {formatCurrency(p.price)}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn btnTech"
                  onClick={() =>
                    addToCart({
                      id: p.id,
                      title: p.title,
                      price: p.price,
                      quantity: 1,
                      img: p.img,
                    })
                  }
                >
                  Add to Cart
                </button>

                <button
                  className="btn btnGhost"
                  onClick={() => toggleWishlist(p.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/cart" className="btn btnTech">
          Go to Cart →
        </Link>
      </div>
    </div>
  );
}
