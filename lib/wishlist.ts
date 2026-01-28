"use client";

import { useState } from "react";

export type WishlistItem = {
  id: string;
};

/* =========================================================
   MINIMAL, IN-MEMORY WISHLIST
   (Compatibility layer – not persisted)
========================================================= */

export function useWishlist() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  const addToWishlist = (item: WishlistItem) => {
    setWishlist(prev =>
      prev.some(w => w.id === item.id) ? prev : [...prev, item]
    );
  };

  const removeFromWishlist = (id: string) => {
    setWishlist(prev => prev.filter(w => w.id !== id));
  };

  return {
    wishlist,
    addToWishlist,
    removeFromWishlist,
  };
}
