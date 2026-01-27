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
  shipping_status: string;
  created_at: string;
};

/* =========================
   HELPERS
========================= */

function authHeaders() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export async function updateMe(payload: {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}) {
  const res = await fetch(`${API}/api/users/me`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to update profile");
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
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Order failed");
  }

  return data;
}

/* =========================
   ADDRESSES
========================= */

export async function getMyAddresses() {
  const res = await fetch(`${API}/api/addresses/my`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch addresses");
  }

  return res.json();
}

export async function createAddress(payload: {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}) {
  const res = await fetch(`${API}/api/addresses`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to create address");
  }

  return res.json();
}

export async function deleteAddress(addressId: string) {
  const res = await fetch(`${API}/api/addresses/${addressId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete address");
  }

  return true;
}

export async function setDefaultAddress(addressId: string) {
  const res = await fetch(`${API}/api/addresses/${addressId}/default`, {
    method: "PUT",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to set default address");
  }

  return res.json();
}
