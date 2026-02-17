/**
 * KARABO API CLIENT – ENTERPRISE COMPLETE VERSION
 * Fully aligned with backend API specification
 */

import type { Admin } from "@/lib/adminAuth";
import type { Order, ProductListItem, Product, ProductStatus, Payment } from "@/lib/types";

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
export type OrderStatus = "pending" | "paid" | "cancelled" | "shipped" | "completed";
export type ShippingStatus = "pending" | "processing" | "shipped" | "delivered" | "returned";

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

  logout: () => request("/api/auth/logout", { method: "POST" }),

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

  me: (): Promise<Admin> => request("/api/admin/auth/me"),

  logout: () => request("/api/admin/auth/logout", { method: "POST" }),
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

  getAnalytics(id: string): Promise<ProductAnalytics> {
    return request<ProductAnalytics>(`/api/products/admin/${id}/analytics`);
  },

  listVariants(id: string): Promise<ProductVariant[]> {
    return request<ProductVariant[]>(`/api/products/${id}/variants`);
  },

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

  updateVariant(variantId: string, payload: any) {
    return request(`/api/products/variants/${variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  bulkUpdateVariants(payload: any) {
    return request(`/api/products/variants/bulk`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  softDelete(id: string) {
    return request(`/api/products/${id}`, { method: "DELETE" });
  },

  hardDelete(id: string) {
    return request(`/api/products/${id}/hard`, { method: "DELETE" });
  },

  duplicate(id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/products/${id}/duplicate`, {
      method: "POST",
    });
  },

  archive(id: string) {
    return request(`/api/products/${id}/archive`, { method: "POST" });
  },

  restore(id: string) {
    return request(`/api/products/${id}/restore`, { method: "POST" });
  },

  publish(id: string) {
    return request(`/api/products/${id}/publish`, { method: "POST" });
  },

  draft(id: string) {
    return request(`/api/products/${id}/draft`, { method: "POST" });
  },

  bulkMutate(payload: any) {
    return request(`/api/products/admin/bulk`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  bulkDelete(productIds: string[]) {
    return request(`/api/products/admin/bulk-delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: productIds }),
    });
  },

  emptyStore() {
    return request(`/api/products/admin/empty-store`, {
      method: "DELETE",
    });
  },

  bulkArchive(productIds: string[]) {
    return request(`/api/products/admin/bulk-archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: productIds }),
    });
  },

  bulkActivate(productIds: string[]) {
    return request(`/api/products/admin/bulk-activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: productIds }),
    });
  },

  bulkDeactivate(productIds: string[]) {
    return request(`/api/products/admin/bulk-deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: productIds }),
    });
  },

  bulkDiscount(payload: { product_ids: string[]; discount_percent: number }) {
    return request(`/api/products/admin/bulk-discount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  bulkCategory(payload: { product_ids: string[]; category: string }) {
    return request(`/api/products/admin/bulk-category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  bulkStore(payload: { product_ids: string[]; store: string }) {
    return request(`/api/products/admin/bulk-store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  importValidate(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/products/admin/import-validate`, {
      method: "POST",
      body: form,
    });
  },

  importPreview(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/products/admin/import-preview`, {
      method: "POST",
      body: form,
    });
  },

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

  bulkAddImages(productId: string, files: File[]) {
    const form = new FormData();
    files.forEach(file => form.append("files", file));
    return request(`/api/products/${productId}/images/bulk`, {
      method: "POST",
      body: form,
    });
  },

  setImagePosition(imageId: string, position: number) {
    return request(`/api/products/images/${imageId}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    });
  },

  setPrimaryImage(imageId: string) {
    return request(`/api/products/images/${imageId}/set-primary`, {
      method: "PATCH",
    });
  },

  updateInventory(productId: string, payload: {
    adjustment: number;
    note?: string;
  }) {
    return request(`/api/products/${productId}/inventory`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateVariantInventory(variantId: string, payload: {
    adjustment: number;
    note?: string;
  }) {
    return request(`/api/products/variants/${variantId}/inventory`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
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

  getMy: (): Promise<Order[]> => request("/api/orders/my"),

  getById: (id: string): Promise<Order> => request(`/api/orders/${id}`),

  getAdmin: (statusFilter?: string): Promise<Order[]> => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return request(`/api/orders/admin${qs}`);
  },

  getAdminById: (id: string): Promise<Order> =>
    request(`/api/orders/admin/${id}`),

  updateShipping: (id: string, payload: { status: string; tracking_number?: string }) =>
    request(`/api/admin/orders/${id}/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  cancel: (id: string, payload: { reason?: string }) =>
    request(`/api/orders/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  requestReturn: (id: string, payload: { reason: string; items?: any[] }) =>
    request(`/api/orders/${id}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  requestRefund: (id: string, payload: { reason: string; amount?: number }) =>
    request(`/api/orders/${id}/refund-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getTracking: (id: string) => request(`/api/orders/${id}/tracking`),

  getInvoice: (id: string) => request(`/api/orders/${id}/invoice`),

  // Admin advanced
  adminCancel: (id: string) =>
    request(`/api/admin/orders/${id}/cancel`, { method: "POST" }),

  hardDelete: (id: string) =>
    request(`/api/admin/orders/${id}`, { method: "DELETE" }),

  forceStatusOverride: (id: string, payload: { status: OrderStatus; reason?: string }) =>
    request(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  processRefund: (id: string, payload: { reason?: string; notify_customer?: boolean }) =>
    request(`/api/admin/orders/${id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  processPartialRefund: (id: string, payload: {
    amount: number;
    reason?: string;
    notify_customer?: boolean;
  }) =>
    request(`/api/admin/orders/${id}/partial-refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getNotes: (id: string) => request(`/api/admin/orders/${id}/notes`),

  createNote: (id: string, payload: { content: string; is_internal?: boolean }) =>
    request(`/api/admin/orders/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deleteNote: (orderId: string, noteId: string) =>
    request(`/api/admin/orders/${orderId}/notes/${noteId}`, {
      method: "DELETE",
    }),

  restore: (id: string) =>
    request(`/api/admin/orders/${id}/restore`, { method: "POST" }),
};

/* =====================================================
   PAYMENTS
===================================================== */

export const paymentsApi = {
  getBankDetails: () => request("/api/payments/bank-details"),

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

  resubmitProof: (paymentId: string, file: File) => {
    const form = new FormData();
    form.append("proof", file);
    return request(`/api/payments/${paymentId}/resubmit-proof`, {
      method: "POST",
      body: form,
    });
  },

  getMy: (): Promise<Payment[]> => request("/api/payments/my"),

  getById: (paymentId: string): Promise<Payment> =>
    request(`/api/payments/${paymentId}`),

  cancel: (paymentId: string, payload?: { reason?: string }) =>
    request(`/api/payments/${paymentId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    }),

  retry: (orderId: string) =>
    request(`/api/payments/${orderId}/retry`, { method: "POST" }),

  getStatusHistory: (paymentId: string) =>
    request(`/api/payments/${paymentId}/status-history`),

  // Admin
  adminList: (statusFilter?: PaymentStatus) => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return request(`/api/payments/admin${qs}`);
  },

  adminGetById: (paymentId: string): Promise<Payment> =>
    request(`/api/payments/admin/${paymentId}`),

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

  hardDelete: (paymentId: string) =>
    request(`/api/payments/admin/${paymentId}`, { method: "DELETE" }),

  forceStatusOverride: (paymentId: string, payload: {
    status: PaymentStatus;
    reason?: string;
  }) =>
    request(`/api/payments/admin/${paymentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getHistory: (paymentId: string) =>
    request(`/api/payments/admin/${paymentId}/history`),
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

  list: () => request("/api/products/admin/bulk-uploads"),
};

/* =====================================================
   USER PROFILE
===================================================== */

export const usersApi = {
  getMe: () => request("/api/users/me"),

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

  getRecentlyViewed: () => request("/api/users/me/recently-viewed"),

  clearRecentlyViewed: () =>
    request("/api/users/me/recently-viewed", { method: "DELETE" }),
};

/* =====================================================
   ADDRESSES
===================================================== */

export const addressesApi = {
  list: () => request("/api/users/me/addresses"),

  create: (payload: {
    label?: string;
    full_name: string;
    phone: string;
    address: string;
    city: string;
    district?: string;
    postal_code?: string;
  }) =>
    request("/api/users/me/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  update: (addressId: string, payload: any) =>
    request(`/api/users/me/addresses/${addressId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  delete: (addressId: string) =>
    request(`/api/users/me/addresses/${addressId}`, { method: "DELETE" }),

  setDefault: (addressId: string) =>
    request(`/api/users/me/addresses/${addressId}/set-default`, {
      method: "POST",
    }),
};

/* =====================================================
   CART
===================================================== */

export const cartApi = {
  get: () => request("/api/cart"),

  addItem: (payload: {
    product_id: string;
    variant_id?: string;
    quantity: number;
  }) =>
    request("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  updateItem: (itemId: string, payload: { quantity: number }) =>
    request(`/api/cart/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  removeItem: (itemId: string) =>
    request(`/api/cart/items/${itemId}`, { method: "DELETE" }),

  clear: () => request("/api/cart/clear", { method: "DELETE" }),

  merge: (payload: { items: any[] }) =>
    request("/api/cart/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

/* =====================================================
   WISHLIST
===================================================== */

export const wishlistApi = {
  get: () => request("/api/wishlist"),

  add: (productId: string) =>
    request(`/api/wishlist/${productId}`, { method: "POST" }),

  remove: (productId: string) =>
    request(`/api/wishlist/${productId}`, { method: "DELETE" }),

  moveToCart: (productId: string) =>
    request(`/api/wishlist/${productId}/move-to-cart`, { method: "POST" }),
};

/* =====================================================
   REVIEWS
===================================================== */

export const reviewsApi = {
  create: (productId: string, payload: {
    rating: number;
    title?: string;
    comment?: string;
  }) =>
    request(`/api/reviews/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  update: (reviewId: string, payload: {
    rating?: number;
    title?: string;
    comment?: string;
  }) =>
    request(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  delete: (reviewId: string) =>
    request(`/api/reviews/${reviewId}`, { method: "DELETE" }),

  getMy: () => request("/api/reviews/users/me/reviews"),

  vote: (reviewId: string, payload: { vote: "up" | "down" }) =>
    request(`/api/reviews/${reviewId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

/* =====================================================
   PRODUCT Q&A
===================================================== */

export const productQAApi = {
  createQuestion: (productId: string, payload: { question: string }) =>
    request(`/api/products/${productId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getQuestions: (productId: string) =>
    request(`/api/products/${productId}/questions`),

  answerQuestion: (questionId: string, payload: { answer: string }) =>
    request(`/api/products/questions/${questionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

/* =====================================================
   SEARCH
===================================================== */

export const searchApi = {
  search: (query: string, params?: Record<string, any>) => {
    const allParams = { q: query, ...params };
    const qs = new URLSearchParams(allParams).toString();
    return request(`/api/search?${qs}`);
  },

  suggestions: (query: string) => {
    const qs = new URLSearchParams({ q: query }).toString();
    return request(`/api/search/suggestions?${qs}`);
  },
};

/* =====================================================
   CATEGORIES & BRANDS
===================================================== */

export const categoriesApi = {
  list: () => request("/api/categories"),
  
  get: (categoryId: string) => request(`/api/categories/${categoryId}`),
};

export const brandsApi = {
  list: () => request("/api/brands"),
};

/* =====================================================
   NOTIFICATIONS
===================================================== */

export const notificationsApi = {
  list: () => request("/api/notifications"),

  markRead: (notificationId: string) =>
    request(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    }),

  markAllRead: () =>
    request("/api/notifications/read-all", { method: "PATCH" }),

  delete: (notificationId: string) =>
    request(`/api/notifications/${notificationId}`, { method: "DELETE" }),
};

/* =====================================================
   COUPONS
===================================================== */

export const couponsApi = {
  apply: (code: string) =>
    request("/api/coupons/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }),

  remove: () => request("/api/coupons/remove", { method: "DELETE" }),

  getAvailable: () => request("/api/coupons/available"),

  getMy: () => request("/api/coupons/my"),
};

/* =====================================================
   WALLET
===================================================== */

export const walletApi = {
  get: () => request("/api/wallet"),

  getTransactions: () => request("/api/wallet/transactions"),

  redeem: (points: number) =>
    request("/api/wallet/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    }),
};

/* =====================================================
   ADMIN CORE
===================================================== */

export const adminApi = {
  getDashboard: () => request("/api/admin/dashboard"),

  // Analytics
  getAnalyticsOverview: () => request("/api/admin/analytics/overview"),

  getAnalyticsRevenue: (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params).toString() : "";
    return request(`/api/admin/analytics/revenue${qs ? `?${qs}` : ""}`);
  },

  getTopProducts: () => request("/api/admin/analytics/top-products"),

  getDeadStock: () => request("/api/admin/analytics/dead-stock"),

  getStockTurnover: () => request("/api/admin/analytics/stock-turnover"),

  // Orders Analytics
  getOrdersAnalytics: () => request("/api/admin/orders/analytics"),

  getOrdersRevenue: (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params).toString() : "";
    return request(`/api/admin/orders/revenue${qs ? `?${qs}` : ""}`);
  },

  getOrdersConversion: () => request("/api/admin/orders/conversion"),

  // Inventory
  getLowStock: () => request("/api/admin/inventory/low-stock"),

  getOutOfStock: () => request("/api/admin/inventory/out-of-stock"),

  getInventoryReport: () => request("/api/admin/inventory/report"),

  adjustInventory: (payload: {
    product_id: string;
    adjustment: number;
    reason?: string;
  }) =>
    request("/api/admin/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  recordIncoming: (payload: {
    product_id: string;
    quantity: number;
    supplier?: string;
    reference?: string;
  }) =>
    request("/api/admin/inventory/incoming", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  // Stores
  listStores: () => request("/api/admin/stores"),

  createStore: (payload: { name: string; description?: string }) =>
    request("/api/admin/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  updateStore: (storeId: string, payload: any) =>
    request(`/api/admin/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deleteStore: (storeId: string) =>
    request(`/api/admin/stores/${storeId}`, { method: "DELETE" }),

  // Audit Logs
  getLogs: (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params).toString() : "";
    return request(`/api/admin/logs${qs ? `?${qs}` : ""}`);
  },

  getEntityLogs: (entityId: string) =>
    request(`/api/admin/logs/${entityId}`),

  // Verification
  verifyPassword: (password: string) =>
    request("/api/admin/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }),

  updateProductStatus: (productId: string, status: ProductStatus) =>
    request(`/api/admin/products/${productId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
};

/* =====================================================
   ADMIN USERS
===================================================== */

export const adminUsersApi = {
  list: (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params).toString() : "";
    return request(`/api/admin/users${qs ? `?${qs}` : ""}`);
  },

  disable: (userId: string) =>
    request(`/api/admin/users/${userId}/disable`, { method: "POST" }),

  enable: (userId: string) =>
    request(`/api/admin/users/${userId}/enable`, { method: "POST" }),

  changeRole: (userId: string, role: "user" | "admin") =>
    request(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }),

  hardDelete: (userId: string) =>
    request(`/api/admin/users/${userId}`, { method: "DELETE" }),

  forcePasswordReset: (userId: string) =>
    request(`/api/admin/users/${userId}/force-password-reset`, {
      method: "POST",
    }),

  getActivity: (userId: string) =>
    request(`/api/admin/users/${userId}/activity`),

  getAllSessions: () => request("/api/admin/sessions"),

  deleteSession: (sessionId: string) =>
    request(`/api/admin/sessions/${sessionId}`, { method: "DELETE" }),
};

/* =====================================================
   BANK SETTINGS (Admin)
===================================================== */

export const bankSettingsApi = {
  get: () => request("/api/payments/admin/bank-settings"),

  create: (payload: {
    bank_name: string;
    account_name: string;
    account_number: string;
    branch?: string;
    swift_code?: string;
    mobile_money_provider?: string;
    mobile_money_number?: string;
    mobile_money_name?: string;
    instructions?: string;
    is_primary?: boolean;
  }) =>
    request("/api/payments/admin/bank-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  update: (settingsId: string, payload: any) =>
    request(`/api/payments/admin/bank-settings/${settingsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

/* =====================================================
   BACKWARD COMPATIBILITY EXPORTS
===================================================== */

export function getMyOrders(): Promise<Order[]> {
  return ordersApi.getMy();
}

export function uploadAvatar(file: File) {
  return usersApi.uploadAvatar(file);
}

export function updateMe(payload: { full_name?: string; phone?: string }) {
  return usersApi.updateMe(payload);
}