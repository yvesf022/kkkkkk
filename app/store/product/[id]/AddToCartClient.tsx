"use client";

import toast from "react-hot-toast";
import { useCart } from "@/app/context/CartContext";
import type { Product } from "@/lib/types";

export default function AddToCartClient({
  product,
}: {
  product: Product;
}) {
  const { addToCart } = useCart();

  const isInStock =
    product.in_stock !== undefined
      ? product.in_stock
      : product.stock > 0;

  const image =
    product.main_image ?? "/placeholder.png";

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button
        className="btn btnTech"
        disabled={!isInStock || product.stock <= 0}
        onClick={() => {
          addToCart({
            id: product.id,
            title: product.title,
            price: product.price,
            image: image,
          });

          toast.success("Added to cart");
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}
