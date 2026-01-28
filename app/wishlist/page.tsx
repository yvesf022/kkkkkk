"use client";

import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { products } from "@/lib/products";
import Link from "next/link";

type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
};

export default function WishlistPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const wishlistProducts: Product[] = products.filter((p) =>
    wishlist.includes(p.id)
  );

  if (wishlistProducts.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Your Wishlist</h1>
        <p>Your wishlist is empty.</p>
        <Link href="/store" className="text-blue-600 underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">Your Wishlist</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlistProducts.map((p) => (
          <div
            key={p.id}
            className="border rounded-lg p-4 flex flex-col gap-3"
          >
            <img
              src={p.img}
              alt={p.title}
              className="w-full h-48 object-cover rounded"
            />

            <h2 className="font-medium">{p.title}</h2>
            <p className="text-lg font-semibold">M {p.price}</p>

            <div className="flex gap-2 mt-auto">
              <button
                onClick={() =>
                  addToCart({
                    id: p.id,
                    title: p.title,
                    price: p.price,
                    image: p.img,
                  })
                }
                className="flex-1 bg-black text-white py-2 rounded"
              >
                Add to Cart
              </button>

              <button
                onClick={() => removeFromWishlist(p.id)}
                className="flex-1 border py-2 rounded"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
