const API = process.env.NEXT_PUBLIC_API_URL!;

/* =========================
   TYPES
========================= */

export type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  rating: number;

  // 🔥 INVENTORY (NEW – BACKEND ALIGNED)
  stock: number;
  in_stock: boolean;
};

export type OrderItemPayload = {
  product_id: string;
  quantity: number;
};

export type OrderPayload = {
  items: OrderItemPayload[];
  total_amount: number;
};

/* =========================
   PRODUCTS
========================= */

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API}/api/products`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }

  return res.json();
}

/* =========================
   ORDERS
========================= */

export async function createOrder(
  token: string,
  payload: OrderPayload
) {
  const res = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Order failed");
  }

  return data;
}
