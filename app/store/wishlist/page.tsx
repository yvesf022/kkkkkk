"use client";

import Link from "next/link";

export default function WishlistPage() {
  return (
    <div style={{ maxWidth: 720, padding: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>
        Wishlist
      </h1>

      <p style={{ opacity: 0.7, marginTop: 12 }}>
        Wishlist functionality is currently unavailable.
      </p>

      <p style={{ opacity: 0.6, marginTop: 8 }}>
        You can continue browsing products and add them to
        your cart.
      </p>

      <Link
        href="/store"
        style={{
          display: "inline-block",
          marginTop: 20,
          padding: "12px 20px",
          borderRadius: 10,
          background: "#111",
          color: "#fff",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        Go to Store
      </Link>
    </div>
  );
}
