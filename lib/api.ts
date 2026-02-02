/**
 * API CLIENT — AUTHORITATIVE
 *
 * Backend facts:
 * - Cookie-based auth ONLY
 * - User cookie: access_token
 * - Admin cookie: admin_access_token
 * - credentials: "include" is REQUIRED
 */

import type { Admin } from "@/lib/adminAuth";

/* =====================================================
   BASE CONFIG
===================================================== */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

/**
 * Low-level request helper
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
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json() as Promise<T>;
}

/* =====================================================
   AUTH (USER)
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
    return request("/api/auth/logout", { method: "POST" });
  },
};

/* =====================================================
   AUTH (ADMIN)
===================================================== */

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

/* =====================================================
   PRODUCTS  ✅ REQUIRED BY ADMIN UI
===================================================== */

export const productsApi = {
  list() {
    return request("/api/products");
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

    return request(`/api/products/admin/${productId}/images`, {
      method: "POST",
      body: form,
    });
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

export const ordersApi = {
  myOrders() {
    return request("/api/orders/my");
  },

  adminOrders() {
    return request("/api/orders/admin");
  },
};

export async function getMyOrders() {
  return ordersApi.myOrders();
}

/* =====================================================
   PAYMENTS ✅ REQUIRED BY ADMIN ANALYTICS
===================================================== */

export const paymentsApi = {
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
 * Backend NOT implemented yet — stub is intentional
 */
export async function updateMe(): Promise<never> {
  throw new Error("updateMe endpoint not implemented");
}
