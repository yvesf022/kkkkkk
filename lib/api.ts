const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

/* =========================
   Types
========================= */

export type Product = {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  price: number;
  image?: string;
  img?: string;
  category?: string;
  stock?: number; // ✅ added to fix Netlify build
};

/* =========================
   API Helpers
========================= */

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }

  return res.json();
}

export async function getProductById(id: string): Promise<Product> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch product");
  }

  return res.json();
}
