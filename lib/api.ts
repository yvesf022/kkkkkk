/* =========================================================
   GLOBAL API CLIENT – PRODUCTION READY
   Backend: Render (FastAPI)
   Frontend: Next.js (Vercel)
========================================================= */

const API = process.env.NEXT_PUBLIC_API_URL!;
if (!API) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

/* ======================
   TYPES
====================== */

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: "user" | "admin";
}

export interface Address {
  id: string;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  payment_status?: "pending" | "paid" | "on_hold" | "rejected";
  created_at: string;
}

/* ======================
   HELPERS
====================== */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API request failed");
  }

  return res.json() as Promise<T>;
}

/* ======================
   AUTH
====================== */

export async function register(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ access_token: string }> {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<{ access_token: string }> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
}

/* ======================
   USER PROFILE
====================== */

export async function getMe(): Promise<User> {
  return apiFetch("/api/users/me");
}

export async function updateMe(data: Partial<User>): Promise<User> {
  return apiFetch("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/* ======================
   ADDRESSES
====================== */

export async function getMyAddresses(): Promise<Address[]> {
  return apiFetch("/api/addresses");
}

export async function createAddress(
  data: Omit<Address, "id" | "is_default">
): Promise<Address> {
  return apiFetch("/api/addresses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAddress(addressId: string): Promise<void> {
  await apiFetch(`/api/addresses/${addressId}`, {
    method: "DELETE",
  });
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  await apiFetch(`/api/addresses/${addressId}/default`, {
    method: "PUT",
  });
}

/* ======================
   PRODUCTS
====================== */

export async function fetchProducts(): Promise<Product[]> {
  return apiFetch("/api/products");
}

/* ======================
   ORDERS
====================== */

export async function getMyOrders(): Promise<Order[]> {
  return apiFetch("/api/orders/my");
}
