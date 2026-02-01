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

/**
 * Low-level request helper
 * - Always includes credentials
 * - Never attaches tokens manually
 */
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
    } catch {
      // ignore JSON parse errors
    }

    const error = new Error(message) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json() as Promise<T>;
}

/* =====================================================
   USER AUTH
===================================================== */

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
    return request("/api/auth/logout", {
      method: "POST",
    });
  },
};

/* =====================================================
   ADMIN AUTH
===================================================== */

export const adminAuthApi = {
  login(payload: { email: string; password: string }) {
    return request("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  // ✅ FIXED: explicitly typed
  me(): Promise<Admin> {
    return request<Admin>("/api/admin/auth/me");
  },

  logout() {
    return request("/api/admin/auth/logout", {
      method: "POST",
    });
  },
};

/* =====================================================
   PRODUCTS
===================================================== */

export const productsApi = {
  list(params: Record<string, string | number | boolean | undefined> = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });

    const qs = query.toString();
    return request(`/api/products${qs ? `?${qs}` : ""}`);
  },

  getAdmin(productId: string) {
    return request(`/api/products/admin/${productId}`);
  },

  create(payload: Record<string, any>) {
    return request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  update(productId: string, payload: Record<string, any>) {
    return request(`/api/products/admin/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  disable(productId: string) {
    return request(`/api/products/admin/${productId}/disable`, {
      method: "POST",
    });
  },

  restore(productId: string) {
    return request(`/api/products/admin/${productId}/restore`, {
      method: "POST",
    });
  },

  uploadImage(productId: string, file: File) {
    const form = new FormData();
    form.append("file", file);

    return request<{ url: string }>(
      `/api/products/admin/${productId}/images`,
      {
        method: "POST",
        body: form,
      },
    );
  },

  deleteImage(imageId: string) {
    return request(`/api/products/admin/images/${imageId}`, {
      method: "DELETE",
    });
  },

  reorderImages(productId: string, imageIds: string[]) {
    return request(`/api/products/admin/${productId}/images/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(imageIds),
    });
  },

  setMainImage(imageId: string) {
    return request(`/api/products/admin/images/${imageId}/set-main`, {
      method: "POST",
    });
  },
};

/* =====================================================
   ORDERS
===================================================== */

export type Order = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export const ordersApi = {
  create(payload: { items: any; total_amount: number }) {
    return request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  myOrders() {
    return request<Order[]>("/api/orders/my");
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
 * Backward-compatible exports for account pages
 * (Required for Vercel static analysis)
 */
export async function getMyOrders(): Promise<Order[]> {
  return ordersApi.myOrders();
}

/* =====================================================
   USER PROFILE
===================================================== */

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);

  return request("/api/users/me/avatar", {
    method: "POST",
    body: form,
  });
}

/**
 * Backend endpoint does NOT exist yet.
 * This stub is intentional and explicit.
 */
export async function updateMe(): Promise<never> {
  throw new Error(
    "updateMe endpoint is not implemented in the backend yet",
  );
}

/* =====================================================
   PAYMENTS
===================================================== */

export const paymentsApi = {
  create(orderId: string) {
    return request(`/api/payments/${orderId}`, {
      method: "POST",
    });
  },

  uploadProof(paymentId: string, file: File) {
    const form = new FormData();
    form.append("proof", file);

    return request(`/api/payments/${paymentId}/proof`, {
      method: "POST",
      body: form,
    });
  },

  adminList() {
    return request("/api/payments/admin");
  },

  review(paymentId: string, status: "paid" | "rejected") {
    return request(`/api/payments/admin/${paymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
};

/* =====================================================
   ADMIN USERS
===================================================== */

export const adminUsersApi = {
  list() {
    return request("/api/admin/users");
  },

  disable(userId: string) {
    return request(`/api/admin/users/${userId}/disable`, {
      method: "POST",
    });
  },

  enable(userId: string) {
    return request(`/api/admin/users/${userId}/enable`, {
      method: "POST",
    });
  },

  changeRole(userId: string, role: "user" | "admin") {
    return request(
      `/api/admin/users/${userId}/role?role=${role}`,
      {
        method: "POST",
      },
    );
  },
};
