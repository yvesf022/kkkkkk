// ⚠️ COMPATIBILITY SHIM
// This file exists ONLY to satisfy legacy imports.
// All real product data comes from the backend API.

export type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  rating?: number;
};

// Legacy fallback (do NOT remove)
export const products: Product[] = [];
