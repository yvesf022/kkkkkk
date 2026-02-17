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
   SHARED TYPES
===================================================== */

export type PaymentStatus = "pending" | "on_hold" | "paid" | "rejected";
export type OrderStatus   = "pending" | "paid" | "cancelled" | "shipped" | "completed";
export type ShippingStatus = "pending" | "processing" | "shipped" | "delivered" | "returned";

// ✅ FIX: explicit return type so setAnalytics(anal) compiles
export type ProductAnalytics = {
  sales: number;
  revenue_estimate: number;
  rating: number;
  rating_number: number;
  stock: number;
  inventory_history: Array<{
    type: string;
    before: number;
    change: number;
    after: number;
    note?: string;
    created_at: string;
  }>;
};

export type ProductVariant = {
  id: string;
  title: string;
  sku?: string;
  attributes: Record<string, string>;
  price: number;
  compare_price?: number;
  stock: number;
  in_stock: boolean;
  image_url?: string;
  is_active: boolean;
  created_at: string;
};

/* =====================================================
   USER AUTH
===================================================== */

export const authApi = {
  register: (payload: { email: string; password: string; full_name?: string }) =>
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

  requestPasswordReset: (email: string) =>
    request("/api/auth/password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),

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

  // ✅ FIX: explicit return type — this is what caused the build error
  getAnalytics(id: string): Promise<ProductAnalytics> {
    return request<ProductAnalytics>(`/api/products/admin/${id}/analytics`);
  },

  listVariants(id: string): Promise<ProductVariant[]> {
    return request<ProductVariant[]>(`/api/products/${id}/variants`);
  },

  // ✅ NEW — lifecycle: publish / archive / draft / discontinue
  lifecycle(id: string, action: "publish" | "archive" | "draft" | "discontinue") {
    return request(`/api/products/admin/${id}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  },

  // ✅ NEW — soft delete
  softDelete(id: string) {
    return request(`/api/products/admin/${id}`, { method: "DELETE" });
  },

  // ✅ NEW — duplicate as draft
  duplicate(id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/products/admin/${id}/duplicate`, {
      method: "POST",
    });
  },

  // ✅ NEW — upload product image
  uploadImage(productId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/products/admin/${productId}/images`, {
      method: "POST",
      body: form,
    });
  },

  // ✅ NEW — delete a product image
  deleteImage(imageId: string) {
    return request(`/api/products/admin/images/${imageId}`, {
      method: "DELETE",
    });
  },

  // ✅ NEW — set image as primary
  setImagePrimary(imageId: string) {
    return request(`/api/products/admin/images/${imageId}/primary`, {
      method: "PATCH",
    });
  },

  // ✅ NEW — create product variant
  createVariant(productId: string, payload: {
    title: string;
    sku?: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
    image_url?: string;
  }) {
    return request<ProductVariant>(`/api/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  // ✅ NEW — delete a variant
  deleteVariant(variantId: string) {
    return request(`/api/products/admin/variants/${variantId}`, {
      method: "DELETE",
    });
  },

  // ✅ NEW — update inventory (stock adjustment)
  updateInventory(productId: string, payload: {
    stock: number;
    note?: string;
    type?: string;
    reference?: string;
  }) {
    return request(`/api/products/admin/${productId}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  // ✅ NEW — export catalog as CSV download
  async exportCsv(params: { status?: string; store?: string } = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    const res = await fetch(
      `${API_BASE_URL}/api/products/admin/export${qs ? `?${qs}` : ""}`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  getMy: (): Promise<Order[]> =>
    request("/api/orders/my"),

  /** @deprecated use getMy() */
  myOrders: (): Promise<Order[]> =>
    request("/api/orders/my"),

  getById: (id: string): Promise<Order> =>
    request(`/api/orders/${id}`),

  getAdmin: (statusFilter?: string): Promise<Order[]> => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return request(`/api/orders/admin${qs}`);
  },

  /** @deprecated use getAdmin() */
  adminOrders: (): Promise<Order[]> =>
    request("/api/orders/admin"),

  getAdminById: (id: string): Promise<Order> =>
    request(`/api/orders/admin/${id}`),

  updateShipping: (id: string, payload: { status: string }) =>
    request(`/api/orders/admin/${id}/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

// kept for backwards compat
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

  getMy: () =>
    request("/api/payments/my"),

  getById: (paymentId: string) =>
    request(`/api/payments/${paymentId}`),

  adminList: (statusFilter?: PaymentStatus) => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return request(`/api/payments/admin${qs}`);
  },

  adminGetById: (paymentId: string) =>
    request(`/api/payments/admin/${paymentId}`),

  // ✅ CRITICAL — admin approve/reject payment proof
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

  // ✅ NEW — validate CSV before importing
  validate: (file: File): Promise<{
    total_rows: number;
    valid: boolean;
    errors: { row: number; field: string; error: string }[];
    warnings: { row: number; field: string; warning: string }[];
  }> => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/bulk-upload/validate", {
      method: "POST",
      body: form,
    });
  },

  // ✅ NEW — preview first N rows before importing
  preview: (file: File): Promise<{
    total_rows: number;
    preview: {
      title: string;
      price: string;
      category: string;
      stock: string;
      parent_asin: string;
      store: string;
    }[];
  }> => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/bulk-upload/preview", {
      method: "POST",
      body: form,
    });
  },

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
  getMe: () =>
    request("/api/users/me"),

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

// kept for backwards compat
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