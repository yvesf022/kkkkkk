/**
 * KARABO API CLIENT — COMPLETE ENTERPRISE VERSION
 */

import type { Admin } from "@/lib/adminAuth";
import type { Order, ProductListItem, Product } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.detail || data.message || message;
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

/* =====================================================
   USER AUTH
===================================================== */

export const authApi = {
  register: (payload: {
    email: string;
    password: string;
    full_name?: string;
  }) =>
    request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  me: () => request("/api/auth/me"),

  logout: () =>
    request("/api/auth/logout", { method: "POST" }),

  // ✅ NEW
  requestPasswordReset: (email: string) =>
    request("/api/auth/password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),

  // ✅ NEW
  confirmPasswordReset: (payload: { token: string; new_password: string }) =>
    request("/api/auth/password/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

/* =====================================================
   ADMIN AUTH
===================================================== */

export const adminAuthApi = {
  login: (payload: { email: string; password: string }) =>
    request("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  me: (): Promise<Admin> =>
    request("/api/admin/auth/me"),

  logout: () =>
    request("/api/admin/auth/logout", { method: "POST" }),
};

/* =====================================================
   PRODUCTS
===================================================== */

export const productsApi = {
  list(params: Record<string, any> = {}) {
    const qs = new URLSearchParams(params).toString();
    return request<{ total: number; results: ProductListItem[] }>(
      `/api/products${qs ? `?${qs}` : ""}`
    );
  },

  get(id: string): Promise<Product> {
    return request(`/api/products/${id}`);
  },

  getAdmin(id: string): Promise<Product> {
    return request(`/api/products/admin/${id}`);
  },

  create(payload: any) {
    return request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: any) {
    return request(`/api/products/admin/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  listVariants(id: string) {
    return request(`/api/products/${id}/variants`);
  },

  getAnalytics(id: string) {
    return request(`/api/products/admin/${id}/analytics`);
  },
};

/* =====================================================
   ORDERS
===================================================== */

export const ordersApi = {
  create: (payload: {
    total_amount: number;
    shipping_address?: Record<string, any>;
    notes?: string;
  }) =>
    request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  // ✅ renamed from myOrders → getMy (and kept myOrders as alias below)
  getMy: (): Promise<Order[]> =>
    request("/api/orders/my"),

  /** @deprecated use getMy() */
  myOrders: (): Promise<Order[]> =>
    request("/api/orders/my"),

  // ✅ NEW — fetch a single order by ID (account order detail page)
  getById: (id: string): Promise<Order> =>
    request(`/api/orders/${id}`),

  // ✅ renamed from adminOrders → getAdmin (and kept adminOrders as alias)
  getAdmin: (statusFilter?: string): Promise<Order[]> => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return request(`/api/orders/admin${qs}`);
  },

  /** @deprecated use getAdmin() */
  adminOrders: (): Promise<Order[]> =>
    request("/api/orders/admin"),

  // ✅ NEW — admin fetch a single order by ID (dashboard drill-down)
  getAdminById: (id: string): Promise<Order> =>
    request(`/api/orders/admin/${id}`),

  updateShipping: (id: string, payload: { status: string }) =>
    request(`/api/orders/admin/${id}/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

// ✅ kept for backwards compat (was a standalone export in your original)
export function getMyOrders(): Promise<Order[]> {
  return ordersApi.getMy();
}

/* =====================================================
   PAYMENTS
===================================================== */

export const paymentsApi = {
  create: (orderId: string) =>
    request(`/api/payments/${orderId}`, { method: "POST" }),

  uploadProof: (paymentId: string, file: File) => {
    const form = new FormData();
    form.append("proof", file);
    return request(`/api/payments/${paymentId}/proof`, {
      method: "POST",
      body: form,
    });
  },

  // ✅ NEW — user: list own payments
  getMy: () =>
    request("/api/payments/my"),

  // ✅ NEW — user: get one payment detail
  getById: (paymentId: string) =>
    request(`/api/payments/${paymentId}`),

  adminList: (statusFilter?: "pending" | "on_hold" | "paid" | "rejected") => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return request(`/api/payments/admin${qs}`);
  },

  // ✅ NEW — admin: get one payment detail
  adminGetById: (paymentId: string) =>
    request(`/api/payments/admin/${paymentId}`),

  // ✅ NEW — CRITICAL: admin approve/reject payment proof
  review: (
    paymentId: string,
    status: "paid" | "rejected",
    adminNotes?: string,
  ) =>
    request(`/api/payments/admin/${paymentId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    }),

  getBankDetails: () =>
    request("/api/payments/bank-details"),
};

/* =====================================================
   BULK UPLOAD
===================================================== */

export const bulkUploadApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/bulk-upload", {
      method: "POST",
      body: form,
    });
  },

  // ✅ renamed from listUploads → list (kept listUploads as alias)
  list: () =>
    request("/api/products/admin/bulk-uploads"),

  /** @deprecated use list() */
  listUploads: () =>
    request("/api/products/admin/bulk-uploads"),
};

/* =====================================================
   USER PROFILE
===================================================== */

export const usersApi = {
  // ✅ NEW — get current user profile
  getMe: () =>
    request("/api/users/me"),

  // ✅ NEW — PATCH /api/users/me
  updateMe: (payload: { full_name?: string; phone?: string }) =>
    request("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/users/me/avatar", {
      method: "POST",
      body: form,
    });
  },
};

// ✅ kept for backwards compat (were standalone exports in your original)
export function uploadAvatar(file: File) {
  return usersApi.uploadAvatar(file);
}

export function updateMe(payload: { full_name?: string; phone?: string }) {
  return usersApi.updateMe(payload);
}

/* =====================================================
   ADMIN CORE
===================================================== */

export const adminApi = {
  getDashboard: () =>
    request("/api/admin/dashboard"),
};