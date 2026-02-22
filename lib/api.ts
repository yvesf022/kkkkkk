/**
 * KARABO API CLIENT — TOKEN AUTH VERSION
 */

import type { Admin } from "@/lib/adminAuth";
import type { Order, ProductListItem, Product, ProductStatus, Payment } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

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

async function request<T>(
  path: string,
  options: RequestInit = {},
  useAdminToken = false,
): Promise<T> {
  const token = useAdminToken ? adminTokenStorage.get() : tokenStorage.get();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      if (Array.isArray(data?.detail)) {
        message = (data.detail as Array<{loc: string[]; msg: string}>)
          .map(e => `${e.loc?.slice(-1)[0] ?? "field"}: ${e.msg}`).join("; ");
      } else {
        message = (typeof data?.detail === "string" ? data.detail : null) ?? data?.message ?? message;
      }
    } catch {}
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null as T;
  return res.json();
}

function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options, true);
}

/* ===================================================== SHARED TYPES ===================================================== */

export type PaymentStatus  = "pending" | "on_hold" | "paid" | "rejected";
export type OrderStatus    = "pending" | "paid" | "cancelled" | "shipped" | "completed";
export type ShippingStatus = "pending" | "processing" | "shipped" | "delivered" | "returned";

export type ProductAnalytics = {
  sales: number; revenue_estimate: number; rating: number; rating_number: number; stock: number;
  inventory_history: Array<{ type: string; before: number; change: number; after: number; note?: string; created_at: string }>;
};

export type ProductVariant = {
  id: string; title: string; sku?: string; attributes: Record<string, string>;
  price: number; compare_price?: number; stock: number; in_stock: boolean;
  image_url?: string; is_active: boolean; created_at: string;
};

/* ===================================================== USER AUTH ===================================================== */

export const authApi = {
  register: (payload: { email: string; password: string; full_name?: string }) =>
    request("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),

  login: async (payload: { email: string; password: string }): Promise<any> => {
    const data: any = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const token = data?.access_token ?? data?.token ?? null;
    if (token) tokenStorage.set(token);
    return data;
  },

  me: () => request("/api/auth/me"),

  logout: async () => {
    tokenStorage.remove();
    return request("/api/auth/logout", { method: "POST" });
  },

  requestPasswordReset: (email: string) =>
    request("/api/auth/password/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }),

  confirmPasswordReset: (payload: { token: string; new_password: string }) =>
    request("/api/auth/password/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
};

/* ===================================================== ADMIN AUTH ===================================================== */

export const adminAuthApi = {
  login: async (payload: { email: string; password: string }): Promise<Admin> => {
    const data: any = await request("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const token = data?.access_token ?? null;
    if (token) adminTokenStorage.set(token);
    return data as Admin;
  },
  me: (): Promise<Admin> => adminRequest("/api/admin/auth/me"),
  logout: async () => { adminTokenStorage.remove(); return request("/api/admin/auth/logout", { method: "POST" }); },
};

/* ===================================================== PRODUCTS ===================================================== */

export const productsApi = {
  list(params: Record<string, any> = {}): Promise<{ total: number; results: ProductListItem[] }> {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)]))).toString();
    return request<{ total: number; results: ProductListItem[] }>(`/api/products${qs ? `?${qs}` : ""}`);
  },
  get(id: string): Promise<Product> { return request(`/api/products/${id}`); },
  getAdmin(id: string): Promise<Product> { return adminRequest(`/api/products/${id}`); },
  create(payload: any) { return adminRequest("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); },
  update(id: string, payload: any) { return adminRequest(`/api/products/admin/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); },
  getAnalytics(id: string): Promise<ProductAnalytics> { return adminRequest<ProductAnalytics>(`/api/products/admin/${id}/analytics`); },
  listVariants(id: string): Promise<ProductVariant[]> { return adminRequest<ProductVariant[]>(`/api/products/${id}/variants`); },
  lifecycle(id: string, action: "publish" | "archive" | "draft" | "restore") { return adminRequest(`/api/products/${id}/${action}`, { method: "POST" }); },
  publish(id: string) { return adminRequest(`/api/products/${id}/publish`, { method: "POST" }); },
  archive(id: string) { return adminRequest(`/api/products/${id}/archive`, { method: "POST" }); },
  draft(id: string)   { return adminRequest(`/api/products/${id}/draft`,   { method: "POST" }); },
  restore(id: string) { return adminRequest(`/api/products/${id}/restore`, { method: "POST" }); },
  softDelete(id: string) { return adminRequest(`/api/products/${id}`, { method: "DELETE" }); },
  hardDelete(id: string) { return adminRequest(`/api/products/${id}/hard`, { method: "DELETE" }); },
  duplicate(id: string): Promise<{ id: string }> { return adminRequest<{ id: string }>(`/api/products/${id}/duplicate`, { method: "POST" }); },
  bulkAddImages(productId: string, payload: { images: string[] }) { return adminRequest(`/api/products/${productId}/images/bulk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); },
  uploadImage(productId: string, file: File) { const form = new FormData(); form.append("file", file); return adminRequest(`/api/products/${productId}/images/bulk`, { method: "POST", body: form }); },
  setImagePosition(imageId: string, position: number) { return adminRequest(`/api/products/images/${imageId}/position`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position }) }); },
  setImagePrimary(imageId: string) { return adminRequest(`/api/products/images/${imageId}/set-primary`, { method: "PATCH" }); },
  deleteImage(imageId: string) { return adminRequest(`/api/products/images/${imageId}`, { method: "DELETE" }); },
  createVariant(productId: string, payload: { title: string; sku?: string; price: number; stock: number; attributes: Record<string, string>; image_url?: string }) { return adminRequest<ProductVariant>(`/api/products/${productId}/variants`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); },
  updateVariant(variantId: string, payload: Partial<ProductVariant>) { return adminRequest(`/api/products/variants/${variantId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); },
  deleteVariant(variantId: string) { return adminRequest(`/api/products/variants/${variantId}`, { method: "DELETE" }); },
  duplicateVariant(variantId: string) { return adminRequest(`/api/products/variants/${variantId}/duplicate`, { method: "POST" }); },
  bulkUpdateVariants(payload: any) { return adminRequest(`/api/products/variants/bulk`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); },
  reorderImages(_productId: string, imageIds: string[]) { return Promise.all(imageIds.map((id, index) => adminRequest(`/api/products/images/${id}/position`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position: index }) }))); },
  setMainImage(imageId: string) { return adminRequest(`/api/products/images/${imageId}/set-primary`, { method: "PATCH" }); },
  updateInventory(productId: string, payload: { stock: number; note?: string; type?: string; reference?: string }) { return adminRequest(`/api/products/${productId}/inventory`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); },
  async exportCsv(params: { status?: string; store?: string } = {}) {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))).toString();
    const token = adminTokenStorage.get();
    const res = await fetch(`${API_BASE_URL}/api/products/admin/export${qs ? `?${qs}` : ""}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `products-export-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  },
  updateVariantInventory(variantId: string, payload: { stock: number; note?: string }) { return adminRequest(`/api/products/variants/${variantId}/inventory`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); },
};

/* ===================================================== ORDERS ===================================================== */

export const ordersApi = {
  create: (payload: { items?: Array<{ product_id: string; variant_id?: string; quantity: number; price: number }>; total_amount: number; shipping_address?: Record<string, any>; notes?: string }) =>
    request("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  getMy: async (): Promise<Order[]> => { const data: any = await request("/api/orders/my"); return Array.isArray(data) ? data : data?.results ?? data?.orders ?? []; },
  myOrders: async (): Promise<Order[]> => { const data: any = await request("/api/orders/my"); return Array.isArray(data) ? data : data?.results ?? data?.orders ?? []; },
  getById: (id: string): Promise<Order> => request(`/api/orders/${id}`),
  getAdmin: async (statusFilter?: string): Promise<Order[]> => { const qs = statusFilter ? `?status=${statusFilter}` : ""; const data: any = await adminRequest(`/api/orders/admin${qs}`); return Array.isArray(data) ? data : data?.results ?? data?.orders ?? []; },
  adminOrders: (): Promise<Order[]> => adminRequest("/api/orders/admin"),
  getAdminById: (id: string): Promise<Order> => adminRequest(`/api/orders/admin/${id}`),
  updateShipping: (id: string, payload: { status: string }) => adminRequest(`/api/orders/admin/${id}/shipping`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  cancel: (orderId: string, reason: string) => request(`/api/orders/my/${orderId}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }),
  requestReturn: (orderId: string, reason: string) => request(`/api/orders/${orderId}/return`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }),
  requestRefund: (orderId: string, payload: { reason: string; amount: number }) => request(`/api/orders/${orderId}/refund-request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  getTracking: (orderId: string) => request(`/api/orders/${orderId}/tracking`),
  getInvoice: (orderId: string) => request(`/api/orders/${orderId}/invoice`),
};

export function getMyOrders(): Promise<Order[]> { return ordersApi.getMy(); }

/* ===================================================== PAYMENTS ===================================================== */

export const paymentsApi = {
  create: (orderId: string) => request<Payment>(`/api/payments/${orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "bank_transfer" }) }),
  uploadProof: (paymentId: string, file: File) => { const form = new FormData(); form.append("proof", file); return request(`/api/payments/${paymentId}/proof`, { method: "POST", body: form }); },
  getMy: (): Promise<Payment[]> => request<Payment[]>("/api/payments/my"),
  getById: (paymentId: string): Promise<Payment> => request<Payment>(`/api/payments/${paymentId}`),
  getByOrderId: async (orderId: string): Promise<Payment | null> => { try { const all = await request<any>("/api/payments/my"); const list: Payment[] = Array.isArray(all) ? all : all?.results ?? all?.payments ?? []; return list.find((p) => p.order_id === orderId) ?? null; } catch { return null; } },
  adminList: (statusFilter?: PaymentStatus) => { const qs = statusFilter ? `?status_filter=${statusFilter}` : ""; return adminRequest(`/api/payments/admin${qs}`); },
  adminGetById: (paymentId: string) => adminRequest(`/api/payments/admin/${paymentId}`),
  review: (paymentId: string, status: "paid" | "rejected", adminNotes?: string) => adminRequest(`/api/payments/admin/${paymentId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, admin_notes: adminNotes }) }),
  getBankDetails: () => request("/api/payments/bank-details"),
  resubmitProof: (paymentId: string, file: File) => { const form = new FormData(); form.append("proof", file); return request(`/api/payments/${paymentId}/proof`, { method: "POST", body: form }); },
  cancel: (paymentId: string, reason: string) => request(`/api/payments/${paymentId}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }),
  retry: (orderId: string): Promise<Payment> => request<Payment>(`/api/payments/${orderId}/retry`, { method: "POST" }),
  updateMethod: (paymentId: string, method: string) => request(`/api/payments/${paymentId}/method`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method }) }),
  getStatusHistory: (paymentId: string) => request(`/api/payments/${paymentId}/status-history`),
  getPaymentAttempts: (orderId: string) => request(`/api/payments/order/${orderId}/attempts`),
};

/* ===================================================== ADDRESSES ===================================================== */

export const addressesApi = {
  list: () => request("/api/users/me/addresses"),
  create: (payload: { label?: string; full_name: string; phone: string; address_line1: string; address_line2?: string; city: string; district?: string; postal_code?: string; country: string }) => request("/api/users/me/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  update: (addressId: string, payload: Partial<{ label: string; full_name: string; phone: string; address_line1: string; address_line2: string; city: string; district: string; postal_code: string; country: string }>) => request(`/api/users/me/addresses/${addressId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  delete: (addressId: string) => request(`/api/users/me/addresses/${addressId}`, { method: "DELETE" }),
  setDefault: (addressId: string) => request(`/api/users/me/addresses/${addressId}/set-default`, { method: "POST" }),
};

/* ===================================================== CART ===================================================== */

export const cartApi = {
  get: () => request("/api/cart"),
  addItem: (payload: { product_id: string; variant_id?: string; quantity: number }) => request("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  updateItem: (itemId: string, payload: { quantity: number }) => request(`/api/cart/items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  removeItem: (itemId: string) => request(`/api/cart/items/${itemId}`, { method: "DELETE" }),
  clear: () => request("/api/cart/clear", { method: "DELETE" }),
  merge: (guestCartItems: Array<{ product_id: string; variant_id?: string; quantity: number }>) => request("/api/cart/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guest_cart_items: guestCartItems }) }),
};

/* ===================================================== WISHLIST ===================================================== */

export const wishlistApi = {
  get: () => request("/api/wishlist"),
  list: () => request("/api/wishlist"),
  add: (productId: string) => request(`/api/wishlist/${productId}`, { method: "POST" }),
  remove: (productId: string) => request(`/api/wishlist/${productId}`, { method: "DELETE" }),
  moveToCart: (productId: string) => request(`/api/wishlist/${productId}/move-to-cart`, { method: "POST" }),
};

/* ===================================================== REVIEWS ===================================================== */

export const reviewsApi = {
  create: (productId: string, payload: { rating: number; title?: string; comment?: string }) => request(`/api/reviews/products/${productId}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  update: (reviewId: string, payload: Partial<{ rating: number; title: string; comment: string }>) => request(`/api/reviews/${reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  delete: (reviewId: string) => request(`/api/reviews/${reviewId}`, { method: "DELETE" }),
  getMy: () => request("/api/reviews/users/me/reviews"),
  vote: (reviewId: string, direction: "up" | "down") => request(`/api/reviews/${reviewId}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vote: direction }) }),
};

/* ===================================================== PRODUCT Q&A ===================================================== */

export const productQAApi = {
  askQuestion: (productId: string, question: string) => request(`/api/products/${productId}/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }),
  getQuestions: (productId: string) => request(`/api/products/${productId}/questions`),
  answerQuestion: (questionId: string, answer: string) => request(`/api/products/questions/${questionId}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer }) }),
};

/* ===================================================== SEARCH ===================================================== */

export const searchApi = {
  search: (params: { q: string; category?: string; brand?: string; min_price?: number; max_price?: number; in_stock?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))).toString();
    return request(`/api/search?${qs}`);
  },
  suggestions: (q: string, limit = 10) => request(`/api/search/suggestions?q=${encodeURIComponent(q)}&limit=${limit}`),
};

/* ===================================================== CATEGORIES & BRANDS ===================================================== */

export const categoriesApi = {
  list: () => request("/api/categories"),
  get: (categoryId: string) => request(`/api/categories/${categoryId}`),
};

export const brandsApi = { list: () => request("/api/brands") };

/* ===================================================== NOTIFICATIONS ===================================================== */

export const notificationsApi = {
  list: () => request("/api/notifications"),
  markRead: (notificationId: string) => request(`/api/notifications/${notificationId}/read`, { method: "PATCH" }),
  markAllRead: () => request("/api/notifications/read-all", { method: "PATCH" }),
  delete: (notificationId: string) => request(`/api/notifications/${notificationId}`, { method: "DELETE" }),
};

/* ===================================================== COUPONS ===================================================== */

export const couponsApi = {
  apply: (code: string, orderTotal: number) => request("/api/coupons/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, order_total: orderTotal }) }),
  remove: () => request("/api/coupons/remove", { method: "DELETE" }),
  getAvailable: () => request("/api/coupons/available"),
  getMy: () => request("/api/coupons/my"),
};

/* ===================================================== WALLET & LOYALTY ===================================================== */

export const walletApi = {
  get: () => request("/api/wallet"),
  getTransactions: (limit = 50) => request(`/api/wallet/transactions?limit=${limit}`),
  redeemPoints: (points: number) => request("/api/wallet/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points }) }),
};

/* ===================================================== ADMIN - ORDERS ADVANCED ===================================================== */

export const adminOrdersAdvancedApi = {
  hardDelete: (orderId: string) => adminRequest(`/api/admin/orders/${orderId}`, { method: "DELETE" }),
  forceStatus: (orderId: string, payload: { status: string; reason: string }) => adminRequest(`/api/admin/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  processRefund: (orderId: string, payload: { amount: number; reason: string }) => adminRequest(`/api/admin/orders/${orderId}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  processPartialRefund: (orderId: string, payload: { amount: number; reason: string }) => adminRequest(`/api/admin/orders/${orderId}/partial-refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  getNotes: (orderId: string) => adminRequest(`/api/admin/orders/${orderId}/notes`),
  addNote: (orderId: string, payload: { content: string; is_internal?: boolean }) => adminRequest(`/api/admin/orders/${orderId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  deleteNote: (orderId: string, noteId: string) => adminRequest(`/api/admin/orders/${orderId}/notes/${noteId}`, { method: "DELETE" }),
  restore: (orderId: string) => adminRequest(`/api/admin/orders/${orderId}/restore`, { method: "POST" }),
};

/* ===================================================== ADMIN - PAYMENTS ADVANCED ===================================================== */

export const adminPaymentsAdvancedApi = {
  hardDelete: (paymentId: string) => adminRequest(`/api/payments/admin/${paymentId}`, { method: "DELETE" }),
  forceStatus: (paymentId: string, payload: { status: string; reason: string }) => adminRequest(`/api/payments/admin/${paymentId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  getHistory: (paymentId: string) => adminRequest(`/api/payments/admin/${paymentId}/history`),
};

/* ===================================================== ADMIN - USERS ADVANCED ===================================================== */

export const adminUsersAdvancedApi = {
  hardDelete: (userId: string) => adminRequest(`/api/admin/users/${userId}`, { method: "DELETE" }),
  forcePasswordReset: (userId: string, reason: string) => adminRequest(`/api/admin/users/${userId}/force-password-reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }),
  getActivity: (userId: string, limit = 50) => adminRequest(`/api/admin/users/${userId}/activity?limit=${limit}`),
  listSessions: (activeOnly = true) => adminRequest(`/api/admin/sessions?active_only=${activeOnly}`),
  deleteSession: (sessionId: string) => adminRequest(`/api/admin/sessions/${sessionId}`, { method: "DELETE" }),
};

/* ===================================================== BULK UPLOAD ===================================================== */

export const bulkUploadApi = {
  upload: (file: File) => { const form = new FormData(); form.append("file", file); return adminRequest("/api/products/admin/bulk-upload", { method: "POST", body: form }); },
  validate: (file: File): Promise<{ total_rows: number; valid: boolean; errors: { row: number; field: string; error: string }[]; warnings: { row: number; field: string; warning: string }[] }> => { const form = new FormData(); form.append("file", file); return adminRequest("/api/products/admin/import-validate", { method: "POST", body: form }); },
  preview: (file: File): Promise<{ total_rows: number; preview: { title: string; price: string; category: string; stock: string; parent_asin: string; store: string }[] }> => { const form = new FormData(); form.append("file", file); return adminRequest("/api/products/admin/import-preview", { method: "POST", body: form }); },
  list: () => adminRequest("/api/products/admin/bulk-uploads"),
  listUploads: () => adminRequest("/api/products/admin/bulk-uploads"),
};

/* ===================================================== USER PROFILE ===================================================== */

export const usersApi = {
  getMe: () => request("/api/users/me"),
  updateMe: (payload: { full_name?: string; phone?: string }) => request("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  uploadAvatar: (file: File) => { const form = new FormData(); form.append("file", file); return request("/api/users/me/avatar", { method: "POST", body: form }); },
  getRecentlyViewed: () => request("/api/users/me/recently-viewed"),
  clearRecentlyViewed: () => request("/api/users/me/recently-viewed", { method: "DELETE" }),
};

export function uploadAvatar(file: File) { return usersApi.uploadAvatar(file); }
export function updateMe(payload: { full_name?: string; phone?: string }) { return usersApi.updateMe(payload); }

/* ===================================================== ADMIN PRODUCTS ===================================================== */

export const adminProductsApi = {
  list(params: Record<string, any> = {}): Promise<{ total: number; results: ProductListItem[] }> {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))).toString();
    return adminRequest<{ total: number; results: ProductListItem[] }>("/api/products/admin/list" + (qs ? "?" + qs : ""));
  },
  bulkDelete: (ids: string[]) => adminRequest("/api/products/admin/bulk-delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }),
  bulkHardDelete: (ids: string[]) => adminRequest("/api/products/admin/bulk-hard-delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }),
  bulkRestorePrice: (ids: string[]) => adminRequest("/api/products/admin/bulk-restore-price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }),
  bulkArchive: (ids: string[]) => adminRequest("/api/products/admin/bulk-archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }),
  bulkActivate: (ids: string[]) => adminRequest("/api/products/admin/bulk-activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }),
  bulkDeactivate: (ids: string[]) => adminRequest("/api/products/admin/bulk-deactivate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }),
  bulkMutate: (payload: Record<string, any>) => adminRequest("/api/products/admin/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  bulkDiscount: (ids: string[], discount: number) => adminRequest("/api/products/admin/bulk-discount", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, discount }) }),
  bulkCategory: (ids: string[], category: string) => adminRequest("/api/products/admin/bulk-category", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, category }) }),
  bulkStore: (ids: string[], store: string) => adminRequest("/api/products/admin/bulk-store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, store }) }),
  emptyStore: (confirm = true) => adminRequest(`/api/products/admin/empty-store?confirm=true`, { method: "DELETE" }),
  resetSalesCount: (ids: string[]) => adminRequest("/api/products/admin/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, action: "reset_sales" }) }),
};

/* ===================================================== ADMIN CORE ===================================================== */

export const adminApi = {
  getDashboard: () => adminRequest("/api/admin/dashboard"),
  getOverviewAnalytics: () => adminRequest("/api/admin/analytics/overview"),
  getRevenueAnalytics: () => adminRequest("/api/admin/analytics/revenue"),
  getTopProducts: () => adminRequest("/api/admin/analytics/top-products"),
  getDeadStock: () => adminRequest("/api/admin/analytics/dead-stock"),
  getStockTurnover: () => adminRequest("/api/admin/analytics/stock-turnover"),
  getOrdersAnalytics: () => adminRequest("/api/admin/orders/analytics"),
  getOrdersRevenue: () => adminRequest("/api/admin/orders/revenue"),
  getOrdersConversion: () => adminRequest("/api/admin/orders/conversion"),
  getLowStock: () => adminRequest("/api/admin/inventory/low-stock"),
  getOutOfStock: () => adminRequest("/api/admin/inventory/out-of-stock"),
  getInventoryReport: () => adminRequest("/api/admin/inventory/report"),
  adjustInventory: (payload: { product_id: string; quantity: number; note?: string }) => adminRequest("/api/admin/inventory/adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  incomingInventory: (payload: { product_id: string; quantity: number; note?: string }) => adminRequest("/api/admin/inventory/incoming", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  listStores: () => adminRequest("/api/admin/stores"),
  createStore: (payload: { name: string; [key: string]: any }) => adminRequest("/api/admin/stores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  updateStore: (storeId: string, payload: Record<string, any>) => adminRequest(`/api/admin/stores/${storeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  deleteStore: (storeId: string) => adminRequest(`/api/admin/stores/${storeId}`, { method: "DELETE" }),
  getAuditLogs: () => adminRequest("/api/admin/logs"),
  getEntityLogs: (entityId: string) => adminRequest(`/api/admin/logs/${entityId}`),
  verifyPassword: (password: string) => adminRequest("/api/admin/verify-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }),
  updateProductStatus: (productId: string, status: ProductStatus) => adminRequest(`/api/admin/products/${productId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }),
  cancelOrder: (orderId: string, reason: string) => adminRequest(`/api/admin/orders/${orderId}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }),
  updateShippingStatus: (orderId: string, payload: { status: string }) => adminRequest(`/api/admin/orders/${orderId}/shipping`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  listUsers: () => adminRequest("/api/admin/users"),
  disableUser: (userId: string) => adminRequest(`/api/admin/users/${userId}/disable`, { method: "POST" }),
  enableUser: (userId: string) => adminRequest(`/api/admin/users/${userId}/enable`, { method: "POST" }),
  changeUserRole: (userId: string, role: string) => adminRequest(`/api/admin/users/${userId}/role`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) }),
  getBankSettings: () => adminRequest("/api/payments/admin/bank-settings"),
  createBankSettings: (payload: Record<string, any>) => adminRequest("/api/payments/admin/bank-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  updateBankSettings: (settingsId: string, payload: Record<string, any>) => adminRequest(`/api/payments/admin/bank-settings/${settingsId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  deleteBankSettings: (settingsId: string) => adminRequest(`/api/payments/admin/bank-settings/${settingsId}`, { method: "DELETE" }),
  getPaymentStats: () => adminRequest("/api/payments/admin/stats"),
  storeResetPreview: () => adminRequest("/api/admin/store-reset/preview"),
  storeResetProductsOnly: () => adminRequest("/api/admin/store-reset/products-only", { method: "POST" }),
  storeResetOrdersOnly: () => adminRequest("/api/admin/store-reset/orders-only", { method: "POST" }),
  storeResetUsersData: () => adminRequest("/api/admin/store-reset/users-data", { method: "POST" }),
  storeResetAuditLogs: () => adminRequest("/api/admin/store-reset/audit-logs", { method: "POST" }),
  storeResetFull: () => adminRequest("/api/admin/store-reset/full", { method: "POST" }),
  storeResetRestoreStock: () => adminRequest("/api/admin/store-reset/restore-stock", { method: "POST" }),
  storeResetDeactivateAll: () => adminRequest("/api/admin/store-reset/deactivate-all-products", { method: "POST" }),
  storeResetActivateAll: () => adminRequest("/api/admin/store-reset/activate-all-products", { method: "POST" }),
  storeResetPurgeCancelledOrders: () => adminRequest("/api/admin/store-reset/cancelled-orders", { method: "DELETE" }),
  resetProductSales: (ids?: string[]) => adminRequest("/api/admin/store-reset/reset-sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids ? { ids } : {}) }),
  resetProductRatings: (ids?: string[]) => adminRequest("/api/admin/store-reset/reset-ratings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids ? { ids } : {}) }),
  hardDeleteAllProducts: () => adminRequest("/api/admin/store-reset/hard-delete-all", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) }),
};

/* =====================================================
   PRICING — INR → LSL CALCULATOR + BULK APPLY
   ─────────────────────────────────────────────────────
   Formula (fixed by management):
     market_price_inr  (actual product cost in India)
   + shipping = ₹700  (fixed shipping charge)
   + profit   = ₹500  (fixed company profit)
   ─────────────────────────────────────────────────────
   = total_inr  × exchange_rate  =  final_price in Maloti (M)

   compare_price = (market + shipping) × rate × 1.05
   (slightly above cost so customer sees a real discount)
===================================================== */

export const exchangeApi = {
  /**
   * Fetches the live INR → LSL exchange rate.
   * Source: open.er-api.com (free, no API key needed).
   * Falls back to 0.21 if the request fails or times out.
   */
  async getINRtoLSL(): Promise<{ rate: number; source: "live" | "fallback" }> {
    const FALLBACK = 0.21; // update this periodically if needed
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/INR", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { rate: FALLBACK, source: "fallback" };
      const data = await res.json();
      const r = data?.rates?.LSL;
      return typeof r === "number" && r > 0
        ? { rate: r, source: "live" }
        : { rate: FALLBACK, source: "fallback" };
    } catch {
      return { rate: FALLBACK, source: "fallback" };
    }
  },
};

export type PricingInput = {
  market_price_inr: number;
  shipping_cost_inr?: number; // default 700
  profit_inr?: number;        // default 500
  exchange_rate: number;      // 1 INR = X LSL
};

export type PricingResult = {
  market_price_inr: number;
  shipping_cost_inr: number;
  profit_inr: number;
  total_cost_inr: number;
  final_price_lsl: number;    // → save as product.price
  compare_price_lsl: number;  // → save as product.compare_price
  savings_lsl: number;
  discount_pct: number;
  exchange_rate: number;
};

/** Pure function — calculates Maloti price from INR market price. No side effects. */
export function calculatePrice(input: PricingInput): PricingResult {
  const shipping = input.shipping_cost_inr ?? 700;
  const profit   = input.profit_inr ?? 500;

  const total_cost_inr    = input.market_price_inr + shipping + profit;
  const final_price_lsl   = parseFloat((total_cost_inr * input.exchange_rate).toFixed(2));
  const compare_price_lsl = parseFloat(
    ((input.market_price_inr + shipping) * input.exchange_rate * 1.05).toFixed(2)
  );
  const savings_lsl  = parseFloat((compare_price_lsl - final_price_lsl).toFixed(2));
  const discount_pct = compare_price_lsl > 0
    ? parseFloat(((savings_lsl / compare_price_lsl) * 100).toFixed(1))
    : 0;

  return {
    market_price_inr: input.market_price_inr,
    shipping_cost_inr: shipping,
    profit_inr: profit,
    total_cost_inr,
    final_price_lsl,
    compare_price_lsl,
    savings_lsl,
    discount_pct,
    exchange_rate: input.exchange_rate,
  };
}

export const pricingApi = {
  /** Apply price to a single product via PATCH /api/products/admin/{id} */
  applyToProduct(productId: string, price_lsl: number, compare_price_lsl?: number): Promise<void> {
    return adminRequest(`/api/products/admin/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: price_lsl,
        ...(compare_price_lsl != null ? { compare_price: compare_price_lsl } : {}),
      }),
    });
  },

  /**
   * BULK PRICING — apply prices to many products at once.
   * Runs all PATCHes in parallel. Returns how many succeeded vs failed.
   * Use this from the Batch Pricing tab on /admin/pricing.
   */
  async bulkApply(
    items: Array<{ product_id: string; price_lsl: number; compare_price_lsl?: number }>,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const settled = await Promise.allSettled(
      items.map(item =>
        adminRequest(`/api/products/admin/${item.product_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            price: item.price_lsl,
            ...(item.compare_price_lsl != null ? { compare_price: item.compare_price_lsl } : {}),
          }),
        })
      )
    );
    const errors: string[] = [];
    let success = 0;
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") { success++; }
      else { errors.push(`${items[i].product_id}: ${(r.reason as Error)?.message ?? "error"}`); }
    });
    return { success, failed: errors.length, errors };
  },
};