/**
 * API CLIENT – FULL ENTERPRISE VERSION (FIXED)
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
   PRODUCTS
===================================================== */

export const productsApi = {

  /* ───────────────── PUBLIC ───────────────── */

  list(params: Record<string, any> = {}): Promise<{ total: number; results: ProductListItem[] }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });
    const qs = query.toString();
    return request(`/api/products${qs ? `?${qs}` : ""}`);
  },

  get(productId: string): Promise<Product> {
    return request<Product>(`/api/products/${productId}`);
  },

  /* ───────────────── ADMIN CORE ───────────────── */

  adminList(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });
    const qs = query.toString();
    return request(`/api/products/admin/list${qs ? `?${qs}` : ""}`);
  },

  // 🔥 FIXED: This was missing (caused your build error)
  getAdmin(productId: string): Promise<Product> {
    return request<Product>(`/api/products/admin/${productId}`);
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

  /* ───────────────── LIFECYCLE ───────────────── */

  lifecycle(id: string, action: "publish" | "draft" | "archive" | "restore") {
    return request(`/api/products/${id}/${action}`, { method: "POST" });
  },

  softDelete(id: string) {
    return request(`/api/products/${id}`, { method: "DELETE" });
  },

  hardDelete(id: string) {
    return request(`/api/products/${id}/hard`, { method: "DELETE" });
  },

  duplicate(id: string) {
    return request(`/api/products/${id}/duplicate`, { method: "POST" });
  },

  /* ───────────────── VARIANTS ───────────────── */

  listVariants(productId: string) {
    return request(`/api/products/${productId}/variants`);
  },

  createVariant(productId: string, data: any) {
    return request(`/api/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateVariant(variantId: string, data: any) {
    return request(`/api/products/variants/${variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  deleteVariant(variantId: string) {
    return request(`/api/products/variants/${variantId}`, {
      method: "DELETE",
    });
  },

  duplicateVariant(variantId: string) {
    return request(`/api/products/variants/${variantId}/duplicate`, {
      method: "POST",
    });
  },

  /* ───────────────── INVENTORY ───────────────── */

  updateInventory(productId: string, data: any) {
    return request(`/api/products/${productId}/inventory`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateVariantInventory(variantId: string, data: any) {
    return request(`/api/products/variants/${variantId}/inventory`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  /* ───────────────── IMAGES ───────────────── */

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

  setImagePrimary(imageId: string) {
    return request(`/api/products/images/${imageId}/set-primary`, {
      method: "PATCH",
    });
  },

  /* ───────────────── ANALYTICS ───────────────── */

  getAnalytics(productId: string) {
    return request(`/api/products/admin/${productId}/analytics`);
  },

  /* ───────────────── BULK ───────────────── */

  bulkMutate(payload: any) {
    return request("/api/products/admin/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  emptyStore() {
    return request("/api/products/admin/empty-store", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
  },
};
