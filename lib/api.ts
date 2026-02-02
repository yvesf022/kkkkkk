/**
 * API CLIENT — AUTHORITATIVE (FIXED)
 *
 * Backend facts:
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
   ORDERS (🔥 FIXED PATHS)
===================================================== */

export const ordersApi = {
  create(payload: { items: any; total_amount: number }) {
    return request("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  myOrders() {
    return request("/orders/my");
  },

  adminOrders() {
    return request("/orders/admin");
  },

  updateShipping(orderId: string, payload: Record<string, any>) {
    return request(`/orders/admin/${orderId}/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};

/* =====================================================
   USER PROFILE (🔥 FIXED)
===================================================== */

export function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file); // must match backend UploadFile name

  return request("/api/users/me/avatar", {
    method: "POST",
    body: form,
  });
}

export function updateMe(payload: {
  full_name?: string;
  phone?: string;
}) {
  return request("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* =====================================================
   BACKWARD COMPAT
===================================================== */

export async function getMyOrders() {
  return ordersApi.myOrders();
}
