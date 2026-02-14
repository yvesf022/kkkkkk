"use client";

import toast from "react-hot-toast";
import { useCart } from "@/app/context/CartContext";

/**
 * IMPORTANT:
 * This is NOT the global Product type.
 * This is a minimal cart-safe product type.
 */
type CartProduct = {
  id: string;
  title: string;
  price: number;
  main_image?: string | null;
  in_stock: boolean;
  stock: number;
};

export default function AddToCartClient({
  product,
}: {
  product: CartProduct;
}) {
  const { addToCart } = useCart();

  const disabled = !product.in_stock || product.stock <= 0;

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button
        className="btn btnTech"
        disabled={disabled}
        onClick={() => {
          addToCart({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.main_image || "",
          });

          toast.success("Added to cart");
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}
