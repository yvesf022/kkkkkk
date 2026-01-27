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
  return apiFetch<{
    access_token: string;
    role: "user" | "admin";
  }>("/api/auth/login", {
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
  return apiFetch<Product[]>("/api/products");
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
  return apiFetch<Order[]>("/api/orders/my");
}

/* ======================
   ADDRESSES
====================== */
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

export function getMyAddresses(): Promise<Address[]> {
  return apiFetch<Address[]>("/api/users/addresses");
}

export function createAddress(
  payload: Omit<Address, "id" | "is_default">
): Promise<Address> {
  return apiFetch<Address>("/api/users/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteAddress(addressId: string): Promise<void> {
  return apiFetch<void>(`/api/users/addresses/${addressId}`, {
    method: "DELETE",
  });
}

export function setDefaultAddress(addressId: string): Promise<void> {
  return apiFetch<void>(`/api/users/addresses/${addressId}/default`, {
    method: "PATCH",
  });
}
