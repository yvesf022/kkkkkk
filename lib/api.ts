// lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

/**
 * 🔒 SINGLE SOURCE OF TRUTH
 * This MUST match the locked Product model exactly
 */
export type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  rating: number;
};

/**
 * Normalize backend product → frontend-safe Product
 * Handles Mongo-style `_id` without leaking it
 */
function normalizeProduct(raw: any): Product {
  return {
    id: String(raw._id ?? raw.id),
    title: String(raw.title),
    price: Number(raw.price),
    img: String(raw.img),
    category: String(raw.category),
    rating: Number(raw.rating),
  };
}

/**
 * Fetch all products
 */
export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch products (${res.status})`);
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid products response");
  }

  return data.map(normalizeProduct);
}

/**
 * Fetch single product by ID
 */
export async function getProductById(id: string): Promise<Product> {
  if (!id) {
    throw new Error("Product ID is required");
  }

  const res = await fetch(`${API_URL}/api/products/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch product (${res.status})`);
  }

  const data = await res.json();

  return normalizeProduct(data);
}
