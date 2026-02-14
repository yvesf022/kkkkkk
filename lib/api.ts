/**
 * API CLIENT — AUTHORITATIVE (FINAL — OPENAPI ALIGNED)
 *
 * Backend facts (DO NOT CHANGE):
 * - Auth is cookie-based (HTTP-only)
 * - User cookie:  access_token
 * - Admin cookie: admin_access_token
 * - Credentials MUST be included
 * - No Authorization headers
 */

import type { Admin } from "@/lib/adminAuth";
import type { Order, ProductListItem, Product } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

/* =====================================================
   LOW-LEVEL REQUEST
===================================================== */

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

    const error = new Error(message) as Error & { status?: number };
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
  list(params: Record<string, any> = {}): Promise<ProductListItem[]> {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        query.append(k, String(v));
      }
    });

    const qs = query.toString();
    return request<ProductListItem[]>(
      `/api/products${qs ? `?${qs}` : ""}`
    );
  },

  get(productId: string): Promise<Product> {
    return request<Product>(`/api/products/${productId}`);
  },

  create(payload: Record<string, any>) {
    return request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  update(productId: string, payload: Record<string, any>) {
    return request(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    return request(
      `/api/products/admin/${productId}/images/reorder`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imageIds),
      },
    );
  },

  setMainImage(imageId: string) {
    return request(
      `/api/products/admin/images/${imageId}/set-main`,
      { method: "POST" },
    );
  },
};

/* =====================================================
   ORDERS
===================================================== */

export const ordersApi = {
  create(payload: { total_amount: number }) {
    return request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  myOrders(): Promise<Order[]> {
    return request<Order[]>("/api/orders/my");
  },

  adminOrders(): Promise<Order[]> {
    return request<Order[]>("/api/orders/admin");
  },

  updateShipping(orderId: string, payload: { status: string }) {
    return request(`/api/orders/admin/${orderId}/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};

/* =====================================================
   PAYMENTS
===================================================== */

export const paymentsApi = {
  create(orderId: string) {
    return request(`/api/api/payments/${orderId}`, {
      method: "POST",
    });
  },

  uploadProof(paymentId: string, file: File) {
    const form = new FormData();
    form.append("proof", file);

    return request(`/api/api/payments/${paymentId}/proof`, {
      method: "POST",
      body: form,
    });
  },

  adminList() {
    return request("/api/api/payments/admin");
  },

  getPaymentDetails(paymentId: string) {
    return request(`/api/api/payments/admin/${paymentId}`);
  },

  review(paymentId: string, status: "paid" | "rejected") {
    return request(`/api/api/payments/admin/${paymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },

  getBankDetails() {
    return request("/api/api/payments/bank-details");
  },

  getBankSettings() {
    return request("/api/api/payments/admin/bank-settings");
  },

  createBankSettings(data: any) {
    return request("/api/api/payments/admin/bank-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateBankSettings(bankId: string, data: any) {
    return request(
      `/api/api/payments/admin/bank-settings/${bankId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
  },

  deleteBankSettings(bankId: string) {
    return request(
      `/api/api/payments/admin/bank-settings/${bankId}`,
      { method: "DELETE" },
    );
  },

  uploadQrCode(bankId: string, file: File) {
    const form = new FormData();
    form.append("file", file);

    return request(
      `/api/api/payments/admin/bank-settings/${bankId}/qr-code`,
      {
        method: "POST",
        body: form,
      },
    );
  },
};

/* =====================================================
   USER PROFILE (RESTORED — REQUIRED FOR BUILD)
===================================================== */

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);

  return request("/api/users/me/avatar", {
    method: "POST",
    body: form,
  });
}

export async function updateMe(payload: {
  full_name?: string;
  phone?: string;
}): Promise<void> {
  return request("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* =====================================================
   BULK UPLOAD
===================================================== */

export const bulkUploadApi = {
  upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return request("/api/products/admin/bulk-upload", {
      method: "POST",
      body: formData,
    });
  },

  getStatus(uploadId: string) {
    return request(`/api/products/admin/bulk-uploads/${uploadId}`);
  },

  listUploads() {
    return request("/api/products/admin/bulk-uploads");
  },
};

/* =====================================================
   ADMIN CORE
===================================================== */

export const adminApi = {
  getDashboard() {
    return request("/api/admin/dashboard");
  },

  updateProductStatus(productId: string, status: string) {
    return request(`/api/admin/products/${productId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },

  cancelOrder(orderId: string) {
    return request(`/api/admin/orders/${orderId}/cancel`, {
      method: "POST",
    });
  },

  updateOrderShipping(orderId: string, status: string) {
    return request(`/api/admin/orders/${orderId}/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
};

/* =====================================================
   BACKWARD COMPAT
===================================================== */

export function getMyOrders(): Promise<Order[]> {
  return ordersApi.myOrders();
}
