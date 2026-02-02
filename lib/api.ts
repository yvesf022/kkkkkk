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
    return request("/api/auth/logout", { method: "POST" });
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

  me() {
    return request("/api/admin/auth/me");
  },

  logout() {
    return request("/api/admin/auth/logout", { method: "POST" });
  },
};

/* =====================================================
   PRODUCTS  ✅ THIS IS WHAT WAS MISSING
===================================================== */

export const productsApi = {
  list(params: Record<string, any> = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        query.append(k, String(v));
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
};

/* =====================================================
   ORDERS
===================================================== */

export const ordersApi = {
  myOrders() {
    return request("/api/orders/my");
  },
};

/* =====================================================
   PAYMENTS
===================================================== */

export const paymentsApi = {
  adminList() {
    return request("/api/payments/admin");
  },
};

/* =====================================================
   USER PROFILE
===================================================== */

export function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);

  return request("/api/users/me/avatar", {
    method: "POST",
    body: form,
  });
}
