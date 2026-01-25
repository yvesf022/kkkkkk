// lib/products.ts

/**
 * 🔒 SINGLE SOURCE OF TRUTH
 * MUST match backend + api.ts exactly
 */
export type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  rating: number;
};
