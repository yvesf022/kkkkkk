import { notFound } from "next/navigation";
import { productsApi } from "@/lib/api";
import type { Product } from "@/lib/types";
import AddToCartClient from "./AddToCartClient";

interface Props {
  params: { id?: string };
}

export default async function ProductPage({ params }: Props) {
  const id = params?.id;

  // 🔥 CRITICAL GUARD
  if (!id || id === "undefined") {
    notFound();
  }

  let product: Product;

  try {
    product = await productsApi.get(id);
  } catch {
    notFound();
  }

  if (!product) {
    notFound();
  }

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 24,
        display: "grid",
        gap: 40,
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      {/* IMAGE SECTION */}
      <div>
        <div
          style={{
            height: 500,
            borderRadius: 24,
            background: product.main_image
              ? `url(${product.main_image}) center/cover`
              : "linear-gradient(135deg,#e0e7ff,#dbeafe)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {!product.main_image && (
            <span style={{ fontSize: 60, opacity: 0.3 }}>
              📦
            </span>
          )}
        </div>
      </div>

      {/* DETAILS SECTION */}
      <div style={{ display: "grid", gap: 20 }}>
        {product.category && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              padding: "6px 12px",
              borderRadius: 999,
              background: "#e0e7ff",
              color: "#3730a3",
              width: "fit-content",
            }}
          >
            {product.category}
          </div>
        )}

        <h1 style={{ fontSize: 34, fontWeight: 900 }}>
          {product.title}
        </h1>

        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
          }}
        >
          M {Math.round(product.price).toLocaleString("en-ZA")}
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color:
              product.in_stock && product.stock > 0
                ? "#166534"
                : "#991b1b",
          }}
        >
          {product.in_stock && product.stock > 0
            ? `${product.stock} in stock`
            : "Out of stock"}
        </div>

        {product.description && (
          <div
            style={{
              fontSize: 15,
              opacity: 0.75,
              lineHeight: 1.6,
            }}
          >
            {product.description}
          </div>
        )}

        <AddToCartClient product={product} />
      </div>
    </div>
  );
}
