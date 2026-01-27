const API_BASE = "https://karabo.onrender.com";

/* ======================
   CORE FETCH WRAPPER
====================== */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // 🔐 REQUIRED FOR JWT COOKIES
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API request failed");
  }

  return res.json();
}

/* ======================
   AUTH
====================== */
export function login(email: string, password: string) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(payload: {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe() {
  return apiFetch("/api/auth/me");
}

export function updateMe(payload: any) {
  return apiFetch("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/* ======================
   PRODUCTS
====================== */
export type Product = {
  id: string;
  name: string;
  price: number;
  image_url?: string;
};

export function fetchProducts(): Promise<Product[]> {
  return apiFetch("/api/products");
}

/* ======================
   ORDERS
====================== */
export type Order = {
  id: string;
  total_amount: number;
  created_at: string;
};

export function getMyOrders(): Promise<Order[]> {
  return apiFetch("/api/orders/my");
}

/* ======================
   ADDRESSES
====================== */
export function getMyAddresses() {
  return apiFetch("/api/users/addresses");
}

export function createAddress(payload: any) {
  return apiFetch("/api/users/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteAddress(addressId: string) {
  return apiFetch(`/api/users/addresses/${addressId}`, {
    method: "DELETE",
  });
}

export function setDefaultAddress(addressId: string) {
  return apiFetch(`/api/users/addresses/${addressId}/default`, {
    method: "PATCH",
  });
}
