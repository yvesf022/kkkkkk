"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist";
import { useCart } from "@/lib/cart";
import { products } from "@/lib/products";

export default function WishlistPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const wishlistProducts = products.filter((p) =>
    wishlist.includes(p.id)
  );

  if (wishlistProducts.length === 0) {
    return (
      <div className="pageContentWrap">
        <div className="emptyState">
          <h1 className="pageTitle">Your wishlist is empty</h1>
          <p className="pageSubtitle">
            Save products to your wishlist to keep track of
            items you like.
          </p>

          <Link href="/store" className="btn btnPrimary">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pageContentWrap">
      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="pageTitle">Your wishlist</h1>
        <p className="pageSubtitle">
          Items you’ve saved for later. Prices and
          availability may change.
        </p>
      </div>

      {/* GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 22,
        }}
      >
        {wishlistProducts.map((p) => (
          <div key={p.id} className="card">
            {/* IMAGE */}
            <div
              style={{
                height: 160,
                background: "#f8fafc",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <img
                src={p.img}
                alt={p.title}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            </div>

            {/* INFO */}
            <strong>{p.title}</strong>

            <div
              style={{
                fontWeight: 700,
                margin: "6px 0 10px",
              }}
            >
              M{p.price.toLocaleString()}
            </div>

            {/* ACTIONS */}
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <button
                className="btn btnPrimary"
                onClick={() =>
                  addToCart({
                    id: p.id,
                    title: p.title,
                    price: p.price,
                    image: p.img,
                    stock: p.stock,
                  })
                }
              >
                Add to cart
              </button>

              <button
                className="btn btnGhost"
                onClick={() =>
                  removeFromWishlist(p.id)
                }
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* FOOTER NOTE */}
      <div className="infoBox" style={{ marginTop: 28 }}>
        💡 <strong>Good to know</strong>
        <br />
        Items in your wishlist are not reserved. Add them to
        your cart when you’re ready to place an order.
      </div>
    </div>
  );
}
