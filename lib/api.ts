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
  // ✅ Public product listing
  list(params: Record<string, any> = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });

    const qs = query.toString();
    return request(`/api/products${qs ? `?${qs}` : ""}`);
  },

  // ✅ Get single product (public)
  get(productId: string) {
    return request(`/api/products/${productId}`);
  },

  // ✅ FIXED: Admin create product
  create(payload: Record<string, any>) {
    return request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  // ✅ FIXED: Admin update product (if this endpoint exists in backend)
  update(productId: string, payload: Record<string, any>) {
    return request(`/api/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  // ✅ Admin upload product image
  uploadImage(productId: string, file: File) {
    const form = new FormData();
    form.append("file", file);

    return request(`/api/products/admin/${productId}/images`, {
      method: "POST",
      body: form,
    });
  },

  // ✅ Admin delete product image
  deleteImage(imageId: string) {
    return request(`/api/products/admin/images/${imageId}`, {
      method: "DELETE",
    });
  },

  // ✅ Admin reorder product images
  reorderImages(productId: string, imageIds: string[]) {
    return request(`/api/products/admin/${productId}/images/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(imageIds),
    });
  },

  // ✅ Admin set main image
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
  // ✅ FIXED: Corrected payload structure
  create(payload: { total_amount: number }) {
    return request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  // ✅ Get user's orders
  myOrders() {
    return request("/api/orders/my");
  },

  // ✅ Admin get all orders
  adminOrders() {
    return request("/api/orders/admin");
  },

  // ✅ Admin update shipping status
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
  // ✅ Create payment for order
  create(orderId: string) {
    return request(`/api/payments/${orderId}`, {
      method: "POST",
    });
  },

  // ✅ Upload payment proof
  uploadProof(paymentId: string, file: File) {
    const form = new FormData();
    form.append("proof", file);

    return request(`/api/payments/${paymentId}/proof`, {
      method: "POST",
      body: form,
    });
  },

  // ✅ Admin list all payments
  adminList() {
    return request("/api/payments/admin");
  },

  // ✅ Admin review payment
  review(paymentId: string, status: "paid" | "rejected") {
    return request(`/api/payments/admin/${paymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
};

/* =====================================================
   ADMIN (Dashboard & Management)
===================================================== */

export const adminApi = {
  // ✅ Get dashboard stats
  getDashboard() {
    return request("/api/admin/dashboard");
  },

  // ✅ Update product status
  updateProductStatus(productId: string, status: string) {
    return request(`/api/admin/products/${productId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },

  // ✅ Cancel order
  cancelOrder(orderId: string) {
    return request(`/api/admin/orders/${orderId}/cancel`, {
      method: "POST",
    });
  },

  // ✅ Update shipping status (alternative endpoint)
  updateOrderShipping(orderId: string, status: string) {
    return request(`/api/admin/orders/${orderId}/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
};

/* =====================================================
   ADMIN USERS MANAGEMENT
===================================================== */

export const adminUsersApi = {
  // ✅ List all users
  list() {
    return request("/api/admin/users");
  },

  // ✅ Disable user
  disable(userId: string) {
    return request(`/api/admin/users/${userId}/disable`, {
      method: "POST",
    });
  },

  // ✅ Enable user
  enable(userId: string) {
    return request(`/api/admin/users/${userId}/enable`, {
      method: "POST",
    });
  },

  // ✅ Change user role
  changeRole(userId: string, role: "user" | "admin") {
    return request(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
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
 * Update user profile
 * Note: Backend endpoint may not be fully implemented yet
 */
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
   PASSWORD RESET
===================================================== */

export const passwordResetApi = {
  // ✅ Request password reset
  request(email: string) {
    return request("/api/auth/password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  },

  // ✅ Confirm password reset
  confirm(token: string, new_password: string) {
    return request("/api/auth/password/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password }),
    });
  },
};

/* =====================================================
   BACKWARD COMPAT (REQUIRED BY PAGES)
===================================================== */

export function getMyOrders() {
  return ordersApi.myOrders();
}
