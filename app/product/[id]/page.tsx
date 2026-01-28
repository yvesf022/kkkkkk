"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { getProductById } from "@/lib/api";
import { useCart } from "@/lib/cart";

type Product = {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  stock?: number;
};

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProductById(id);
        setProduct(data);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="pageContentWrap">
        <p className="mutedText">Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pageContentWrap">
        <div className="emptyState">
          <h1 className="pageTitle">Product not found</h1>
          <Link href="/store" className="btn btnPrimary">
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  const inStock =
    typeof product.stock === "number"
      ? product.stock > 0
      : true;

  function handleAddToCart() {
    addToCart({
      id: product.id,
      title: product.name,
      price: product.price,
      image: product.image_url,
      stock: product.stock,
    });
  }

  function handleBuyNow() {
    handleAddToCart();
    router.push("/cart");
  }

  return (
    <div className="pageContentWrap">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40,
          alignItems: "start",
        }}
      >
        {/* IMAGE */}
        <section className="card">
          <div
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              background: "#f8fafc",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={product.image_url || "/placeholder.png"}
              alt={product.name}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </section>

        {/* DETAILS */}
        <section className="card">
          <h1 className="pageTitle">{product.name}</h1>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: "8px 0 16px",
            }}
          >
            M{product.price.toLocaleString()}
          </div>

          {product.description && (
            <p className="mutedText">
              {product.description}
            </p>
          )}

          {/* STOCK */}
          <div style={{ marginTop: 12 }}>
            {inStock ? (
              <span className="badgeSuccess">
                In stock
              </span>
            ) : (
              <span className="badgeDanger">
                Out of stock
              </span>
            )}
          </div>

          {/* QUANTITY */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginTop: 20,
            }}
          >
            <span>Quantity</span>
            <button
              className="btn btnGhost"
              onClick={() =>
                setQty((q) => Math.max(1, q - 1))
              }
            >
              −
            </button>
            <strong>{qty}</strong>
            <button
              className="btn btnGhost"
              onClick={() => setQty((q) => q + 1)}
            >
              +
            </button>
          </div>

          {/* PAYMENT INFO */}
          <div className="infoBox" style={{ marginTop: 20 }}>
            💳 <strong>Payment note</strong>
            <br />
            Payment is completed externally after checkout.
            Upload your payment proof for verification.
          </div>

          {/* ACTIONS */}
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              className="btn btnPrimary"
              disabled={!inStock}
              onClick={handleAddToCart}
            >
              Add to cart
            </button>

            <button
              className="btn btnGhost"
              disabled={!inStock}
              onClick={handleBuyNow}
            >
              Buy now
            </button>

            <Link
              href="/store"
              className="btn btnGhost"
            >
              Continue shopping
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
