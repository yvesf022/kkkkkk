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

export type Order = {
  id: string;
  total_amount: number;
  payment_status: string;
  shipping_status?: string;
  created_at: string;
  user_email?: string;
};

/* =========================
   AUTH HEADER (FIXED)
========================= */

function getAccessToken(): string {
  if (typeof window === "undefined") {
    throw new Error("Auth token accessed on server");
  }

  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Not authenticated");
  }

  return token;
}

function authHeaders() {
  const token = getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

/* =========================
   AUTH / USER
========================= */

export async function getMe() {
  const res = await fetch(`${API}/api/auth/me`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  return res.json();
}

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
   ORDERS — USER
========================= */

export async function getMyOrders(): Promise<Order[]> {
  const res = await fetch(`${API}/api/orders/my`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch orders");
  }

  return res.json();
}

export async function createOrder(payload: OrderPayload) {
  const res = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Order failed");
  }

  return data;
}

/* =========================
   ORDERS — ADMIN
========================= */

export async function getAdminOrders(): Promise<Order[]> {
  const res = await fetch(`${API}/api/orders/admin`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch admin orders");
  }

  return res.json();
}
