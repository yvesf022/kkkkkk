/**
 * API CLIENT — AUTHORITATIVE
 *
 * Backend facts (DO NOT CHANGE):
 * - Auth is cookie-based (HTTP-only)
 * - User cookie:  access_token
 * - Admin cookie: admin_access_token
 * - Credentials MUST be included
 * - No Authorization headers
 */

import type { Admin } from "@/lib/adminAuth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

/* ================================
   LOW-LEVEL REQUEST
================================ */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.detail || data.message || message;
    } catch {}
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

/* ================================
   USER AUTH
================================ */

export const authApi = {
  register(payload: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }) {
    return request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  login(payload: { email: string; password: string }) {
    return request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  me() {
    return request("/api/auth/me");
  },

  logout() {
    return request("/api/auth/logout", { method: "POST" });
  },
};

/* ================================
   ADMIN AUTH
================================ */

export const adminAuthApi = {
  login(payload: { email: string; password: string }) {
    return request("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  me(): Promise<Admin> {
    return request("/api/admin/auth/me");
  },

  logout() {
    return request("/api/admin/auth/logout", { method: "POST" });
  },
};

/* ================================
   ORDERS (API SHAPE ONLY)
================================ */

export type ApiOrder = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_status?: string | null;
  shipping_status?: string | null;
  order_status?: string | null;
  tracking_number?: string | null;
};

export const ordersApi = {
  create(payload: { items: any; total_amount: number }) {
    return request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  myOrders(): Promise<ApiOrder[]> {
    return request("/api/orders/my");
  },

  adminOrders() {
    return request("/api/orders/admin");
  },

  updateShipping(orderId: string, payload: Record<string, any>) {
    return request(`/api/orders/admin/${orderId}/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};

/**
 * Backward-compatible helper
 */
export async function getMyOrders(): Promise<ApiOrder[]> {
  return ordersApi.myOrders();
}
