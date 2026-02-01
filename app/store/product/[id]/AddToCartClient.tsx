"use client";

import toast from "react-hot-toast";
import { useCart } from "@/app/context/CartContext";

type Product = {
  id: string;
  title: string;
  price: number;
  main_image: string;
  in_stock: boolean;
  stock: number;
};

export default function AddToCartClient({
  product,
}: {
  product: Product;
}) {
  const { addToCart } = useCart();

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button
        className="btn btnTech"
        disabled={!product.in_stock || product.stock <= 0}
        onClick={() => {
          addToCart({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.main_image,
          });

          toast.success("Added to cart");
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}
