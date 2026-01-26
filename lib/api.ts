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

export type Address = {
  id: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

export type UserProfile = {
  name: string;
  phone: string;
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

export async function updateMe(payload: UserProfile) {
  const res = await fetch(`${API}/api/auth/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Profile update failed");
  }

  return data;
}

/* =========================
   ADDRESSES — USER
========================= */

export async function getMyAddresses(): Promise<Address[]> {
  const res = await fetch(`${API}/api/addresses/my`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch addresses");
  }

  return res.json();
}

export async function createAddress(
  payload: Omit<Address, "id" | "is_default">
) {
  const res = await fetch(`${API}/api/addresses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Failed to create address");
  }

  return data;
}

export async function deleteAddress(addressId: string) {
  const res = await fetch(`${API}/api/addresses/${addressId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete address");
  }
}

export async function setDefaultAddress(addressId: string) {
  const res = await fetch(`${API}/api/addresses/${addressId}/default`, {
    method: "PUT",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to set default address");
  }
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
