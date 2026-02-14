import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartClient from "./AddToCartClient";
import { formatCurrency } from "@/lib/currency";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   DATA FETCH
====================== */

async function getProductById(id: string): Promise<Product | null> {
  if (!id || id === "undefined") return null;

  const res = await fetch(`${API}/api/products/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  return res.json();
}

/* ======================
   PAGE
====================== */

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) notFound();

  const product = await getProductById(id);
  if (!product) notFound();

  const imageUrl =
    product.main_image && product.main_image.startsWith("http")
      ? product.main_image
      : product.main_image
      ? `${API}${product.main_image}`
      : "/placeholder.png";

  const isInStock = product.stock > 0;

  return (
    <div style={{ display: "grid", gap: 40 }}>
      {/* BREADCRUMB */}
      <nav style={{ fontSize: 14, opacity: 0.7 }}>
        <Link href="/store">Store</Link>
        {" / "}
        {product.category && (
          <>
            <Link href={`/store/${product.category}`}>
              {product.category}
            </Link>
            {" / "}
          </>
        )}
        <span>{product.title}</span>
      </nav>

      {/* MAIN LAYOUT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 500px) 1fr",
          gap: 48,
          alignItems: "start",
        }}
      >
        {/* IMAGE */}
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 20,
            padding: 24,
            background: "#fff",
          }}
        >
          <Image
            src={imageUrl}
            alt={product.title}
            width={800}
            height={800}
            style={{ objectFit: "contain", width: "100%", height: "auto" }}
            priority
          />
        </div>

        {/* INFO */}
        <div style={{ display: "grid", gap: 20 }}>
          {/* STORE BADGE */}
          {product.store && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#6366f1",
              }}
            >
              {product.store}
            </div>
          )}

          {/* TITLE */}
          <h1 style={{ fontSize: 30, fontWeight: 900 }}>
            {product.title}
          </h1>

          {/* RATING */}
          {product.rating_number ? (
            <div style={{ fontSize: 14 }}>
              ⭐ {product.rating_number.toLocaleString()} ratings
            </div>
          ) : null}

          {/* PRICE */}
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {formatCurrency(product.price)}
            </div>

            {product.compare_price && (
              <div
                style={{
                  opacity: 0.5,
                  textDecoration: "line-through",
                }}
              >
                {formatCurrency(product.compare_price)}
              </div>
            )}
          </div>

          {/* STOCK */}
          {isInStock ? (
            <p style={{ color: "#16a34a", fontWeight: 700 }}>
              In stock
            </p>
          ) : (
            <p style={{ color: "#dc2626", fontWeight: 700 }}>
              Out of stock
            </p>
          )}

          {/* CATEGORIES */}
          {product.categories && product.categories.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {product.categories.map((cat, i) => (
                <span
                  key={i}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "#f3f4f6",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* ADD TO CART */}
          <AddToCartClient
            product={{
              id: product.id,
              title: product.title,
              price: product.price,
              main_image: product.main_image ?? "",
              in_stock: product.in_stock,
              stock: product.stock,
            }}
          />
        </div>
      </div>

      {/* FEATURES */}
      {product.features && product.features.length > 0 && (
        <section style={{ maxWidth: 900 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>
            Key Features
          </h2>
          <ul style={{ marginTop: 12, paddingLeft: 20 }}>
            {product.features.map((feature, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {feature}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* DESCRIPTION */}
      {product.description && (
        <section style={{ maxWidth: 900 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>
            Product Description
          </h2>
          <p style={{ opacity: 0.85, marginTop: 8 }}>
            {product.description}
          </p>
        </section>
      )}

      {/* DETAILS */}
      {product.details &&
        Object.keys(product.details).length > 0 && (
          <section style={{ maxWidth: 900 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>
              Product Details
            </h2>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 8,
              }}
            >
              {Object.entries(product.details).map(
                ([key, value]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #eee",
                      paddingBottom: 6,
                    }}
                  >
                    <strong>{key}</strong>
                    <span>{String(value)}</span>
                  </div>
                ),
              )}
            </div>
          </section>
        )}
    </div>
  );
}
