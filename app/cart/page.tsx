"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    increaseQty,
    decreaseQty,
    removeItem,
    total,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className="pageContentWrap">
        <div className="emptyState">
          <h1 className="pageTitle">Your cart is empty</h1>
          <p className="pageSubtitle">
            Browse products and add them to your cart.
          </p>

          <Link href="/store" className="btn btnPrimary">
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pageContentWrap">
      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="pageTitle">Shopping cart</h1>
        <p className="pageSubtitle">
          Review your items before proceeding to checkout.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr minmax(260px, 340px)",
          gap: 28,
          alignItems: "start",
        }}
      >
        {/* CART ITEMS */}
        <section className="card">
          <h2 className="sectionTitle">Items in your cart</h2>

          <div style={{ display: "grid", gap: 18 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "80px 1fr auto",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                {/* IMAGE */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 12,
                    background: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                {/* DETAILS */}
                <div>
                  <strong>{item.title}</strong>
                  <div className="mutedText">
                    M{item.price.toLocaleString()}
                  </div>

                  {/* QUANTITY */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 8,
                      alignItems: "center",
                    }}
                  >
                    <button
                      className="btn btnGhost"
                      onClick={() =>
                        decreaseQty(item.id)
                      }
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      className="btn btnGhost"
                      onClick={() =>
                        increaseQty(item.id)
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* REMOVE */}
                <button
                  className="btn btnDanger"
                  onClick={() =>
                    removeItem(item.id)
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* SUMMARY */}
        <aside className="card">
          <h2 className="sectionTitle">
            Order summary
          </h2>

          <div
            style={{
              display: "grid",
              gap: 10,
              fontSize: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Subtotal</span>
              <strong>
                M{total.toLocaleString()}
              </strong>
            </div>

            <div className="mutedText">
              Shipping cost will be calculated after
              payment verification.
            </div>
          </div>

          <button
            className="btn btnPrimary"
            style={{ marginTop: 18 }}
            onClick={() =>
              router.push("/checkout")
            }
          >
            Proceed to checkout
          </button>

          <p
            className="mutedText"
            style={{ marginTop: 10 }}
          >
            Payment is completed externally after
            checkout.
          </p>

          <Link
            href="/store"
            className="btn btnGhost"
            style={{ marginTop: 12 }}
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
