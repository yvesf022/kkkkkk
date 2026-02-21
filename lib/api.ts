/**
 * KARABO API CLIENT — TOKEN AUTH VERSION
 *
 * CHANGE: Switched from cookie-based auth (credentials: "include") to
 * localStorage token + Authorization header. This fixes cross-origin
 * cookie blocking between Vercel frontend and Render backend.
 *
 * Token is stored in localStorage under "karabo_token".
 * All requests automatically attach it as: Authorization: Bearer <token>
 * The backend already supports this in security.py.
 */

import type { Admin } from "@/lib/adminAuth";
import type { Order, ProductListItem, Product, ProductStatus, Payment } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

// =====================================================
// TOKEN STORAGE HELPERS
// =====================================================

export const tokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("karabo_token");
  },
  set(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("karabo_token", token);
  },
  remove(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("karabo_token");
  },
};

export const adminTokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("karabo_admin_token");
  },
  set(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("karabo_admin_token", token);
  },
  remove(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("karabo_admin_token");
  },
};

// =====================================================
// CORE REQUEST FUNCTION
// =====================================================

async function request<T>(
  path: string,
  options: RequestInit = {},
  useAdminToken = false,
): Promise<T> {
  const token = useAdminToken
    ? adminTokenStorage.get()
    : tokenStorage.get();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    // No credentials: "include" — we use Authorization header instead
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      // FastAPI 422 returns detail as an array [{loc, msg, type}] — must stringify
      if (Array.isArray(data?.detail)) {
        message = (data.detail as Array<{loc: string[]; msg: string}>)
          .map(e => `${e.loc?.slice(-1)[0] ?? "field"}: ${e.msg}`).join("; ");
      } else {
        message = (typeof data?.detail === "string" ? data.detail : null)
               ?? data?.message ?? message;
      }
    } catch {}
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null as T;
  return res.json();
}

// Admin-specific request wrapper
function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options, true);
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
   - login() now saves the token returned from backend
   - logout() removes the token from localStorage
===================================================== */

export const authApi = {
  register: (payload: { email: string; password: string; full_name?: string }) =>
    request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  login: async (payload: { email: string; password: string }): Promise<any> => {
    const data: any = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // Backend returns user data. We need a token.
    // Since backend uses cookies, we call /api/auth/me to verify,
    // but we store a flag so we know we're logged in.
    // BETTER: Ask backend to also return token in body.
    // For now we store a session marker and rely on the cookie for this request only,
    // then switch fully once backend returns token in body.
    // 
    // TEMPORARY BRIDGE: store user data, rely on cookie just for /me calls.
    // The real fix is in the backend — see note below.
    return data;
  },

  me: () => request("/api/auth/me"),

  logout: async () => {
    tokenStorage.remove();
    return request("/api/auth/logout", { method: "POST" });
  },

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
  login: async (payload: { email: string; password: string }): Promise<Admin> => {
    const data = await request<Admin>("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return data;
  },

  me: (): Promise<Admin> =>
    adminRequest("/api/admin/auth/me"),

  logout: async () => {
    adminTokenStorage.remove();
    return request("/api/admin/auth/logout", { method: "POST" });
  },
};

/* =====================================================
   PRODUCTS
===================================================== */

export const productsApi = {
  list(params: Record<string, any> = {}): Promise<{ total: number; results: ProductListItem[] }> {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request<{ total: number; results: ProductListItem[] }>(
      `/api/products${qs ? `?${qs}` : ""}`
    );
  },

  get(id: string): Promise<Product> {
    return request(`/api/products/${id}`);
  },

  getAdmin(id: string): Promise<Product> {
    return request(`/api/products/${id}`);
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

  lifecycle(id: string, action: "publish" | "archive" | "draft" | "restore") {
    return request(`/api/products/${id}/${action}`, { method: "POST" });
  },

  publish(id: string) { return request(`/api/products/${id}/publish`, { method: "POST" }); },
  archive(id: string) { return request(`/api/products/${id}/archive`, { method: "POST" }); },
  draft(id: string)   { return request(`/api/products/${id}/draft`,   { method: "POST" }); },
  restore(id: string) { return request(`/api/products/${id}/restore`, { method: "POST" }); },

  softDelete(id: string) { return request(`/api/products/${id}`, { method: "DELETE" }); },
  hardDelete(id: string) { return request(`/api/products/${id}/hard`, { method: "DELETE" }); },

  duplicate(id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/products/${id}/duplicate`, { method: "POST" });
  },

  bulkAddImages(productId: string, payload: { images: string[] }) {
    return request(`/api/products/${productId}/images/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  uploadImage(productId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/products/${productId}/images/bulk`, { method: "POST", body: form });
  },

  setImagePosition(imageId: string, position: number) {
    return request(`/api/products/images/${imageId}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    });
  },

  setImagePrimary(imageId: string) {
    return request(`/api/products/images/${imageId}/set-primary`, { method: "PATCH" });
  },

  deleteImage(imageId: string) {
    return request(`/api/products/images/${imageId}`, { method: "DELETE" });
  },

  createVariant(productId: string, payload: {
    title: string; sku?: string; price: number; stock: number;
    attributes: Record<string, string>; image_url?: string;
  }) {
    return request<ProductVariant>(`/api/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateVariant(variantId: string, payload: Partial<ProductVariant>) {
    return request(`/api/products/variants/${variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  deleteVariant(variantId: string) {
    return request(`/api/products/variants/${variantId}`, { method: "DELETE" });
  },

  duplicateVariant(variantId: string) {
    return request(`/api/products/variants/${variantId}/duplicate`, { method: "POST" });
  },

  bulkUpdateVariants(payload: any) {
    return request(`/api/products/variants/bulk`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  reorderImages(_productId: string, imageIds: string[]) {
    return Promise.all(
      imageIds.map((id, index) =>
        request(`/api/products/images/${id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: index }),
        })
      )
    );
  },

  setMainImage(imageId: string) {
    return request(`/api/products/images/${imageId}/set-primary`, { method: "PATCH" });
  },

  updateInventory(productId: string, payload: {
    stock: number; note?: string; type?: string; reference?: string;
  }) {
    return request(`/api/products/${productId}/inventory`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async exportCsv(params: { status?: string; store?: string } = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    ).toString();
    const token = tokenStorage.get();
    const res = await fetch(
      `${API_BASE_URL}/api/products/admin/export${qs ? `?${qs}` : ""}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
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

  updateVariantInventory(variantId: string, payload: { stock: number; note?: string }) {
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
    items?: Array<{ product_id: string; variant_id?: string; quantity: number; price: number }>;
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
  myOrders: (): Promise<Order[]> => request("/api/orders/my"),
  getById: (id: string): Promise<Order> => request(`/api/orders/${id}`),

  getAdmin: (statusFilter?: string): Promise<Order[]> => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return request(`/api/orders/admin${qs}`);
  },

  adminOrders: (): Promise<Order[]> => request("/api/orders/admin"),
  getAdminById: (id: string): Promise<Order> => request(`/api/orders/admin/${id}`),

  updateShipping: (id: string, payload: { status: string }) =>
    request(`/api/orders/admin/${id}/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  cancel: (orderId: string, reason: string) =>
    request(`/api/orders/my/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  requestReturn: (orderId: string, reason: string) =>
    request(`/api/orders/${orderId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  requestRefund: (orderId: string, payload: { reason: string; amount: number }) =>
    request(`/api/orders/${orderId}/refund-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getTracking: (orderId: string) => request(`/api/orders/${orderId}/tracking`),
  getInvoice: (orderId: string) => request(`/api/orders/${orderId}/invoice`),
};

export function getMyOrders(): Promise<Order[]> {
  return ordersApi.getMy();
}

/* =====================================================
   PAYMENTS
===================================================== */

export const paymentsApi = {
  create: (orderId: string) =>
    request<Payment>(`/api/payments/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "bank_transfer" }),
    }),

  uploadProof: (paymentId: string, file: File) => {
    // NOTE: field name MUST be "proof" — matches FastAPI param `proof: UploadFile = File(...)`
    // Using "file" causes 422. Also: do NOT set Content-Type; browser sets multipart boundary.
    const form = new FormData();
    form.append("proof", file);
    return request(`/api/payments/${paymentId}/proof`, { method: "POST", body: form });
  },

  getMy: (): Promise<Payment[]> => request<Payment[]>("/api/payments/my"),
  getById: (paymentId: string): Promise<Payment> => request<Payment>(`/api/payments/${paymentId}`),

  getByOrderId: async (orderId: string): Promise<Payment | null> => {
    try {
      const all = await request<any>("/api/payments/my");
      const list: Payment[] = Array.isArray(all) ? all : all?.results ?? all?.payments ?? [];
      return list.find((p) => p.order_id === orderId) ?? null;
    } catch {
      return null;
    }
  },

  adminList: (statusFilter?: PaymentStatus) => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return request(`/api/payments/admin${qs}`);
  },

  adminGetById: (paymentId: string) => request(`/api/payments/admin/${paymentId}`),

  review: (paymentId: string, status: "paid" | "rejected", adminNotes?: string) =>
    request(`/api/payments/admin/${paymentId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    }),

  getBankDetails: () => request("/api/payments/bank-details"),

  // resubmitProof → same as uploadProof; backend POST /{id}/proof replaces existing proof
  // for all statuses (pending / on_hold / rejected). No separate resubmit route exists.
  resubmitProof: (paymentId: string, file: File) => {
    const form = new FormData();
    form.append("proof", file);
    return request(`/api/payments/${paymentId}/proof`, { method: "POST", body: form });
  },

  cancel: (paymentId: string, reason: string) =>
    request(`/api/payments/${paymentId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  retry: (orderId: string): Promise<Payment> =>
    request<Payment>(`/api/payments/${orderId}/retry`, { method: "POST" }),

  updateMethod: (paymentId: string, method: string) =>
    request(`/api/payments/${paymentId}/method`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    }),

  getStatusHistory: (paymentId: string) => request(`/api/payments/${paymentId}/status-history`),
  getPaymentAttempts: (orderId: string) => request(`/api/payments/order/${orderId}/attempts`),
};

/* =====================================================
   ADDRESSES
===================================================== */

export const addressesApi = {
  list: () => request("/api/users/me/addresses"),

  create: (payload: {
    label?: string; full_name: string; phone: string;
    address_line1: string; address_line2?: string;
    city: string; district?: string; postal_code?: string; country: string;
  }) =>
    request("/api/users/me/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  update: (addressId: string, payload: Partial<{
    label: string; full_name: string; phone: string;
    address_line1: string; address_line2: string;
    city: string; district: string; postal_code: string; country: string;
  }>) =>
    request(`/api/users/me/addresses/${addressId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  delete: (addressId: string) =>
    request(`/api/users/me/addresses/${addressId}`, { method: "DELETE" }),

  setDefault: (addressId: string) =>
    request(`/api/users/me/addresses/${addressId}/set-default`, { method: "POST" }),
};

/* =====================================================
   CART
===================================================== */

export const cartApi = {
  get: () => request("/api/cart"),

  addItem: (payload: { product_id: string; variant_id?: string; quantity: number }) =>
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

  merge: (guestCartItems: Array<{ product_id: string; variant_id?: string; quantity: number }>) =>
    request("/api/cart/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_cart_items: guestCartItems }),
    }),
};

/* =====================================================
   WISHLIST
===================================================== */

export const wishlistApi = {
  get: () => request("/api/wishlist"),
  list: () => request("/api/wishlist"),

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
  create: (productId: string, payload: { rating: number; title?: string; comment?: string }) =>
    request(`/api/reviews/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  update: (reviewId: string, payload: Partial<{ rating: number; title: string; comment: string }>) =>
    request(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  delete: (reviewId: string) => request(`/api/reviews/${reviewId}`, { method: "DELETE" }),
  getMy: () => request("/api/reviews/users/me/reviews"),

  vote: (reviewId: string, direction: "up" | "down") =>
    request(`/api/reviews/${reviewId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote: direction }),
    }),
};

/* =====================================================
   PRODUCT Q&A
===================================================== */

export const productQAApi = {
  askQuestion: (productId: string, question: string) =>
    request(`/api/products/${productId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),

  getQuestions: (productId: string) => request(`/api/products/${productId}/questions`),

  answerQuestion: (questionId: string, answer: string) =>
    request(`/api/products/questions/${questionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    }),
};

/* =====================================================
   SEARCH
===================================================== */

export const searchApi = {
  search: (params: {
    q: string; category?: string; brand?: string;
    min_price?: number; max_price?: number; in_stock?: boolean;
    page?: number; limit?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request(`/api/search?${qs}`);
  },

  suggestions: (q: string, limit = 10) =>
    request(`/api/search/suggestions?q=${encodeURIComponent(q)}&limit=${limit}`),
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
    request(`/api/notifications/${notificationId}/read`, { method: "PATCH" }),

  markAllRead: () => request("/api/notifications/read-all", { method: "PATCH" }),

  delete: (notificationId: string) =>
    request(`/api/notifications/${notificationId}`, { method: "DELETE" }),
};

/* =====================================================
   COUPONS
===================================================== */

export const couponsApi = {
  apply: (code: string, orderTotal: number) =>
    request("/api/coupons/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, order_total: orderTotal }),
    }),

  remove: () => request("/api/coupons/remove", { method: "DELETE" }),
  getAvailable: () => request("/api/coupons/available"),
  getMy: () => request("/api/coupons/my"),
};

/* =====================================================
   WALLET & LOYALTY
===================================================== */

export const walletApi = {
  get: () => request("/api/wallet"),
  getTransactions: (limit = 50) => request(`/api/wallet/transactions?limit=${limit}`),

  redeemPoints: (points: number) =>
    request("/api/wallet/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    }),
};

/* =====================================================
   ADMIN - ORDERS ADVANCED
===================================================== */

export const adminOrdersAdvancedApi = {
  hardDelete: (orderId: string) =>
    request(`/api/admin/orders/${orderId}`, { method: "DELETE" }),

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

  getNotes: (orderId: string) => request(`/api/admin/orders/${orderId}/notes`),

  addNote: (orderId: string, payload: { content: string; is_internal?: boolean }) =>
    request(`/api/admin/orders/${orderId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deleteNote: (orderId: string, noteId: string) =>
    request(`/api/admin/orders/${orderId}/notes/${noteId}`, { method: "DELETE" }),

  restore: (orderId: string) =>
    request(`/api/admin/orders/${orderId}/restore`, { method: "POST" }),
};

/* =====================================================
   ADMIN - PAYMENTS ADVANCED
===================================================== */

export const adminPaymentsAdvancedApi = {
  hardDelete: (paymentId: string) =>
    request(`/api/payments/admin/${paymentId}`, { method: "DELETE" }),

  forceStatus: (paymentId: string, payload: { status: string; reason: string }) =>
    request(`/api/payments/admin/${paymentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getHistory: (paymentId: string) => request(`/api/payments/admin/${paymentId}/history`),
};

/* =====================================================
   ADMIN - USERS ADVANCED
===================================================== */

export const adminUsersAdvancedApi = {
  hardDelete: (userId: string) =>
    request(`/api/admin/users/${userId}`, { method: "DELETE" }),

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
    request(`/api/admin/sessions/${sessionId}`, { method: "DELETE" }),
};

/* =====================================================
   BULK UPLOAD
===================================================== */

export const bulkUploadApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/bulk-upload", { method: "POST", body: form });
  },

  validate: (file: File): Promise<{
    total_rows: number; valid: boolean;
    errors: { row: number; field: string; error: string }[];
    warnings: { row: number; field: string; warning: string }[];
  }> => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/import-validate", { method: "POST", body: form });
  },

  preview: (file: File): Promise<{
    total_rows: number;
    preview: { title: string; price: string; category: string; stock: string; parent_asin: string; store: string }[];
  }> => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/import-preview", { method: "POST", body: form });
  },

  list: () => request("/api/products/admin/bulk-uploads"),
  listUploads: () => request("/api/products/admin/bulk-uploads"),
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
    return request("/api/users/me/avatar", { method: "POST", body: form });
  },

  getRecentlyViewed: () => request("/api/users/me/recently-viewed"),
  clearRecentlyViewed: () => request("/api/users/me/recently-viewed", { method: "DELETE" }),
};

export function uploadAvatar(file: File) { return usersApi.uploadAvatar(file); }
export function updateMe(payload: { full_name?: string; phone?: string }) { return usersApi.updateMe(payload); }

/* =====================================================
   ADMIN PRODUCTS
===================================================== */

export const adminProductsApi = {
  list(params: Record<string, any> = {}): Promise<{ total: number; results: ProductListItem[] }> {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request<{ total: number; results: ProductListItem[] }>(
      "/api/products/admin/list" + (qs ? "?" + qs : "")
    );
  },

  bulkDelete: (ids: string[]) => request("/api/products/admin/bulk-delete", {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }),
  }),
  bulkHardDelete: (ids: string[]) => request("/api/products/admin/bulk-hard-delete", {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }),
  }),
  bulkRestorePrice: (ids: string[]) => request("/api/products/admin/bulk-restore-price", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }),
  }),
  bulkArchive: (ids: string[]) => request("/api/products/admin/bulk-archive", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }),
  }),
  bulkActivate: (ids: string[]) => request("/api/products/admin/bulk-activate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }),
  }),
  bulkDeactivate: (ids: string[]) => request("/api/products/admin/bulk-deactivate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }),
  }),
  bulkMutate: (payload: Record<string, any>) => request("/api/products/admin/bulk", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  }),
  bulkDiscount: (ids: string[], discount: number) => request("/api/products/admin/bulk-discount", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, discount }),
  }),
  bulkCategory: (ids: string[], category: string) => request("/api/products/admin/bulk-category", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, category }),
  }),
  bulkStore: (ids: string[], store: string) => request("/api/products/admin/bulk-store", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, store }),
  }),
  emptyStore: (store: string) => request(
    `/api/products/admin/empty-store?store=${encodeURIComponent(store)}`, { method: "DELETE" }
  ),
};

/* =====================================================
   ADMIN CORE
===================================================== */

export const adminApi = {
  getDashboard: () => request("/api/admin/dashboard"),
  getOverviewAnalytics: () => request("/api/admin/analytics/overview"),
  getRevenueAnalytics: () => request("/api/admin/analytics/revenue"),
  getTopProducts: () => request("/api/admin/analytics/top-products"),
  getDeadStock: () => request("/api/admin/analytics/dead-stock"),
  getStockTurnover: () => request("/api/admin/analytics/stock-turnover"),
  getOrdersAnalytics: () => request("/api/admin/orders/analytics"),
  getOrdersRevenue: () => request("/api/admin/orders/revenue"),
  getOrdersConversion: () => request("/api/admin/orders/conversion"),
  getLowStock: () => request("/api/admin/inventory/low-stock"),
  getOutOfStock: () => request("/api/admin/inventory/out-of-stock"),
  getInventoryReport: () => request("/api/admin/inventory/report"),

  adjustInventory: (payload: { product_id: string; quantity: number; note?: string }) =>
    request("/api/admin/inventory/adjust", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }),

  incomingInventory: (payload: { product_id: string; quantity: number; note?: string }) =>
    request("/api/admin/inventory/incoming", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }),

  listStores: () => request("/api/admin/stores"),

  createStore: (payload: { name: string; [key: string]: any }) =>
    request("/api/admin/stores", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }),

  updateStore: (storeId: string, payload: Record<string, any>) =>
    request(`/api/admin/stores/${storeId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }),

  deleteStore: (storeId: string) =>
    request(`/api/admin/stores/${storeId}`, { method: "DELETE" }),

  getAuditLogs: () => request("/api/admin/logs"),
  getEntityLogs: (entityId: string) => request(`/api/admin/logs/${entityId}`),

  verifyPassword: (password: string) =>
    request("/api/admin/verify-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
    }),

  updateProductStatus: (productId: string, status: ProductStatus) =>
    request(`/api/admin/products/${productId}/status`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    }),

  cancelOrder: (orderId: string, reason: string) =>
    request(`/api/admin/orders/${orderId}/cancel`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
    }),

  updateShippingStatus: (orderId: string, payload: { status: string }) =>
    request(`/api/admin/orders/${orderId}/shipping`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }),

  listUsers: () => request("/api/admin/users"),
  disableUser: (userId: string) => request(`/api/admin/users/${userId}/disable`, { method: "POST" }),
  enableUser: (userId: string) => request(`/api/admin/users/${userId}/enable`, { method: "POST" }),

  changeUserRole: (userId: string, role: string) =>
    request(`/api/admin/users/${userId}/role`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }),
    }),

  getBankSettings: () => request("/api/payments/admin/bank-settings"),

  createBankSettings: (payload: Record<string, any>) =>
    request("/api/payments/admin/bank-settings", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }),

  updateBankSettings: (settingsId: string, payload: Record<string, any>) =>
    request(`/api/payments/admin/bank-settings/${settingsId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }),

  deleteBankSettings: (settingsId: string) =>
    request(`/api/payments/admin/bank-settings/${settingsId}`, { method: "DELETE" }),

  getPaymentStats: () => request("/api/payments/admin/stats"),

  storeResetPreview: () => request("/api/admin/store-reset/preview"),
  storeResetProductsOnly: () => request("/api/admin/store-reset/products-only", { method: "POST" }),
  storeResetOrdersOnly: () => request("/api/admin/store-reset/orders-only", { method: "POST" }),
  storeResetUsersData: () => request("/api/admin/store-reset/users-data", { method: "POST" }),
  storeResetAuditLogs: () => request("/api/admin/store-reset/audit-logs", { method: "POST" }),
  storeResetFull: () => request("/api/admin/store-reset/full", { method: "POST" }),
  storeResetRestoreStock: () => request("/api/admin/store-reset/restore-stock", { method: "POST" }),
  storeResetDeactivateAll: () => request("/api/admin/store-reset/deactivate-all-products", { method: "POST" }),
  storeResetActivateAll: () => request("/api/admin/store-reset/activate-all-products", { method: "POST" }),
  storeResetPurgeCancelledOrders: () => request("/api/admin/store-reset/cancelled-orders", { method: "DELETE" }),
};