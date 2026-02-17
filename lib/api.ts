/**
 * KARABO API CLIENT – COMPLETE ENTERPRISE VERSION
 * All 100+ endpoints for your e-commerce platform
 */

import type { Admin } from "@/lib/adminAuth";
import type { Order, ProductListItem, Product, ProductStatus } from "@/lib/types";

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

  getAnalytics(id: string): Promise<ProductAnalytics> {
    return request<ProductAnalytics>(`/api/products/admin/${id}/analytics`);
  },

  listVariants(id: string): Promise<ProductVariant[]> {
    return request<ProductVariant[]>(`/api/products/${id}/variants`);
  },

  lifecycle(id: string, action: "publish" | "archive" | "draft" | "discontinue") {
    return request(`/api/products/admin/${id}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  },

  softDelete(id: string) {
    return request(`/api/products/admin/${id}`, { method: "DELETE" });
  },

  duplicate(id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/products/admin/${id}/duplicate`, {
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

  setImagePrimary(imageId: string) {
    return request(`/api/products/admin/images/${imageId}/primary`, {
      method: "PATCH",
    });
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

  deleteVariant(variantId: string) {
    return request(`/api/products/admin/variants/${variantId}`, {
      method: "DELETE",
    });
  },

  reorderImages(productId: string, imageIds: string[]) {
    return request(`/api/products/admin/${productId}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_ids: imageIds }),
    });
  },

  setMainImage(imageId: string) {
    return request(`/api/products/admin/images/${imageId}/primary`, {
      method: "PATCH",
    });
  },

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

  updateVariantInventory(variantId: string, payload: {
    stock: number;
    note?: string;
  }) {
    return request(`/api/products/admin/variants/${variantId}/inventory`, {
      method: "POST",
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

  // NEW ENTERPRISE FEATURES
  cancel: (orderId: string, payload: { reason: string }) =>
    request(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  requestReturn: (orderId: string, payload: { reason: string }) =>
    request(`/api/orders/${orderId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  requestRefund: (orderId: string, payload: { reason: string; amount: number }) =>
    request(`/api/orders/${orderId}/refund-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getTracking: (orderId: string) =>
    request(`/api/orders/${orderId}/tracking`),

  getInvoice: (orderId: string) =>
    request(`/api/orders/${orderId}/invoice`),
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

  // NEW ENTERPRISE FEATURES
  resubmitProof: (paymentId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/payments/${paymentId}/resubmit-proof`, {
      method: "POST",
      body: form,
    });
  },

  cancel: (paymentId: string, reason: string) =>
    request(`/api/payments/${paymentId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  retry: (orderId: string) =>
    request(`/api/payments/${orderId}/retry`, {
      method: "POST",
    }),

  getStatusHistory: (paymentId: string) =>
    request(`/api/payments/${paymentId}/status-history`),
};

/* =====================================================
   ADDRESSES (NEW ENTERPRISE FEATURE)
===================================================== */

export const addressesApi = {
  list: () =>
    request("/api/users/me/addresses"),

  create: (payload: {
    label: string;
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  }) =>
    request("/api/users/me/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  update: (addressId: string, payload: Partial<{
    label: string;
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }>) =>
    request(`/api/users/me/addresses/${addressId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  delete: (addressId: string) =>
    request(`/api/users/me/addresses/${addressId}`, {
      method: "DELETE",
    }),

  setDefault: (addressId: string) =>
    request(`/api/users/me/addresses/${addressId}/set-default`, {
      method: "POST",
    }),
};

/* =====================================================
   CART (NEW ENTERPRISE FEATURE)
===================================================== */

export const cartApi = {
  get: () =>
    request("/api/cart"),

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
    request(`/api/cart/items/${itemId}`, {
      method: "DELETE",
    }),

  clear: () =>
    request("/api/cart/clear", {
      method: "DELETE",
    }),

  merge: (guestCartItems: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
  }>) =>
    request("/api/cart/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_cart_items: guestCartItems }),
    }),
};

/* =====================================================
   WISHLIST (NEW ENTERPRISE FEATURE)
===================================================== */

export const wishlistApi = {
  get: () =>
    request("/api/wishlist"),

  add: (productId: string) =>
    request(`/api/wishlist/${productId}`, {
      method: "POST",
    }),

  remove: (productId: string) =>
    request(`/api/wishlist/${productId}`, {
      method: "DELETE",
    }),

  moveToCart: (productId: string) =>
    request(`/api/wishlist/${productId}/move-to-cart`, {
      method: "POST",
    }),
};

/* =====================================================
   REVIEWS (NEW ENTERPRISE FEATURE)
===================================================== */

export const reviewsApi = {
  create: (productId: string, payload: {
    rating: number;
    title?: string;
    comment?: string;
  }) =>
    request(`/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  update: (reviewId: string, payload: Partial<{
    rating: number;
    title: string;
    comment: string;
  }>) =>
    request(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  delete: (reviewId: string) =>
    request(`/api/reviews/${reviewId}`, {
      method: "DELETE",
    }),

  getMy: () =>
    request("/api/users/me/reviews"),

  vote: (reviewId: string, isHelpful: boolean) =>
    request(`/api/reviews/${reviewId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_helpful: isHelpful }),
    }),
};

/* =====================================================
   PRODUCT Q&A (NEW ENTERPRISE FEATURE)
===================================================== */

export const productQAApi = {
  askQuestion: (productId: string, question: string) =>
    request(`/api/products/${productId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),

  getQuestions: (productId: string) =>
    request(`/api/products/${productId}/questions`),

  answerQuestion: (questionId: string, answer: string) =>
    request(`/api/questions/${questionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    }),
};

/* =====================================================
   SEARCH (NEW ENTERPRISE FEATURE)
===================================================== */

export const searchApi = {
  search: (params: {
    q: string;
    category?: string;
    brand?: string;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined)
      ) as Record<string, string>
    ).toString();
    return request(`/api/search?${qs}`);
  },

  suggestions: (q: string, limit = 10) =>
    request(`/api/search/suggestions?q=${encodeURIComponent(q)}&limit=${limit}`),
};

/* =====================================================
   CATEGORIES & BRANDS (NEW ENTERPRISE FEATURE)
===================================================== */

export const categoriesApi = {
  list: () =>
    request("/api/categories"),

  get: (categoryId: string) =>
    request(`/api/categories/${categoryId}`),
};

export const brandsApi = {
  list: () =>
    request("/api/brands"),
};

/* =====================================================
   NOTIFICATIONS (NEW ENTERPRISE FEATURE)
===================================================== */

export const notificationsApi = {
  list: () =>
    request("/api/notifications"),

  markRead: (notificationId: string) =>
    request(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    }),

  markAllRead: () =>
    request("/api/notifications/read-all", {
      method: "PATCH",
    }),

  delete: (notificationId: string) =>
    request(`/api/notifications/${notificationId}`, {
      method: "DELETE",
    }),
};

/* =====================================================
   COUPONS (NEW ENTERPRISE FEATURE)
===================================================== */

export const couponsApi = {
  apply: (code: string, orderTotal: number) =>
    request("/api/coupons/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, order_total: orderTotal }),
    }),

  remove: () =>
    request("/api/coupons/remove", {
      method: "DELETE",
    }),

  getAvailable: () =>
    request("/api/coupons/available"),

  getMy: () =>
    request("/api/coupons/my"),
};

/* =====================================================
   WALLET & LOYALTY (NEW ENTERPRISE FEATURE)
===================================================== */

export const walletApi = {
  get: () =>
    request("/api/wallet"),

  getTransactions: (limit = 50) =>
    request(`/api/wallet/transactions?limit=${limit}`),

  redeemPoints: (points: number) =>
    request("/api/wallet/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    }),
};

/* =====================================================
   ADMIN - ORDERS ADVANCED (NEW ENTERPRISE FEATURES)
===================================================== */

export const adminOrdersAdvancedApi = {
  hardDelete: (orderId: string) =>
    request(`/api/admin/orders/${orderId}`, {
      method: "DELETE",
    }),

  forceStatus: (orderId: string, payload: { status: string; reason: string }) =>
    request(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  processRefund: (orderId: string, payload: { amount: number; reason: string }) =>
    request(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  processPartialRefund: (orderId: string, payload: { amount: number; reason: string }) =>
    request(`/api/admin/orders/${orderId}/partial-refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getNotes: (orderId: string) =>
    request(`/api/admin/orders/${orderId}/notes`),

  addNote: (orderId: string, payload: { note: string; is_internal: boolean }) =>
    request(`/api/admin/orders/${orderId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deleteNote: (orderId: string, noteId: string) =>
    request(`/api/admin/orders/${orderId}/notes/${noteId}`, {
      method: "DELETE",
    }),

  restore: (orderId: string) =>
    request(`/api/admin/orders/${orderId}/restore`, {
      method: "POST",
    }),
};

/* =====================================================
   ADMIN - PAYMENTS ADVANCED (NEW ENTERPRISE FEATURES)
===================================================== */

export const adminPaymentsAdvancedApi = {
  hardDelete: (paymentId: string) =>
    request(`/api/payments/admin/${paymentId}`, {
      method: "DELETE",
    }),

  forceStatus: (paymentId: string, payload: { status: string; reason: string }) =>
    request(`/api/payments/admin/${paymentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getHistory: (paymentId: string) =>
    request(`/api/payments/admin/${paymentId}/history`),
};

/* =====================================================
   ADMIN - USERS ADVANCED (NEW ENTERPRISE FEATURES)
===================================================== */

export const adminUsersAdvancedApi = {
  hardDelete: (userId: string) =>
    request(`/api/admin/users/${userId}`, {
      method: "DELETE",
    }),

  forcePasswordReset: (userId: string, reason: string) =>
    request(`/api/admin/users/${userId}/force-password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  getActivity: (userId: string, limit = 50) =>
    request(`/api/admin/users/${userId}/activity?limit=${limit}`),

  listSessions: (activeOnly = true) =>
    request(`/api/admin/sessions?active_only=${activeOnly}`),

  deleteSession: (sessionId: string) =>
    request(`/api/admin/sessions/${sessionId}`, {
      method: "DELETE",
    }),
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

  updateProductStatus: (productId: string, status: ProductStatus) =>
    request(`/api/products/admin/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
};


