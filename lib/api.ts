/**
 * API CLIENT – FULL UPGRADED VERSION
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

  me(): Promise<Admin> {
    return request<Admin>("/api/admin/auth/me");
  },

  logout() {
    return request("/api/admin/auth/logout", { method: "POST" });
  },
};

/* =====================================================
   PRODUCTS
===================================================== */

export const productsApi = {

  // ── PUBLIC ──────────────────────────────────────

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

  // ── ADMIN CORE ───────────────────────────────────

  adminList(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });
    const qs = query.toString();
    return request(`/api/products/admin/list${qs ? `?${qs}` : ""}`);
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

  // ── LIFECYCLE ────────────────────────────────────

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

  // ── BULK OPERATIONS ──────────────────────────────

  bulkMutate(payload: {
    ids: string[];
    action: "activate" | "deactivate" | "archive" | "draft" | "discount" | "category" | "store";
    [key: string]: any;
  }) {
    return request("/api/products/admin/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  bulkDelete(ids: string[]) {
    return request("/api/products/admin/bulk-delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  },

  emptyStore() {
    return request("/api/products/admin/empty-store", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
  },

  bulkActivate(ids: string[]) {
    return request("/api/products/admin/bulk-activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  },

  bulkDeactivate(ids: string[]) {
    return request("/api/products/admin/bulk-deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  },

  bulkArchive(ids: string[]) {
    return request("/api/products/admin/bulk-archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  },

  bulkDiscount(ids: string[], discount_percent: number) {
    return request("/api/products/admin/bulk-discount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, discount_percent }),
    });
  },

  bulkCategory(ids: string[], category: string, main_category?: string) {
    return request("/api/products/admin/bulk-category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, category, main_category }),
    });
  },

  bulkStore(ids: string[], store: string) {
    return request("/api/products/admin/bulk-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, store }),
    });
  },

  // ── VARIANTS ─────────────────────────────────────

  listVariants(productId: string) {
    return request(`/api/products/${productId}/variants`);
  },

  createVariant(productId: string, data: {
    title: string;
    sku?: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
    image_url?: string;
  }) {
    return request(`/api/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateVariant(variantId: string, data: Record<string, any>) {
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

  bulkUpdateVariants(ids: string[], updates: Record<string, any>) {
    return request("/api/products/variants/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, updates }),
    });
  },

  // ── INVENTORY ────────────────────────────────────

  updateInventory(productId: string, data: {
    stock: number;
    note?: string;
    type?: string;
    reference?: string;
  }) {
    return request(`/api/products/${productId}/inventory`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateVariantInventory(variantId: string, data: {
    stock: number;
    note?: string;
    type?: string;
    reference?: string;
  }) {
    return request(`/api/products/variants/${variantId}/inventory`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // ── IMAGES ───────────────────────────────────────

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

  bulkAddImages(productId: string, urls: string[]) {
    return request(`/api/products/${productId}/images/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
  },

  setImagePosition(imageId: string, position: number) {
    return request(`/api/products/images/${imageId}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    });
  },

  setImagePrimary(imageId: string) {
    return request(`/api/products/images/${imageId}/set-primary`, {
      method: "PATCH",
    });
  },

  // kept for backward compat
  reorderImages(productId: string, imageIds: string[]) {
    return request(`/api/products/admin/${productId}/images/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(imageIds),
    });
  },

  setMainImage(imageId: string) {
    return request(`/api/products/admin/images/${imageId}/set-main`, {
      method: "POST",
    });
  },

  // ── ANALYTICS ────────────────────────────────────

  getAnalytics(productId: string) {
    return request(`/api/products/admin/${productId}/analytics`);
  },

  // ── IMPORT / EXPORT ──────────────────────────────

  importValidate(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/import-validate", {
      method: "POST",
      body: form,
    });
  },

  importPreview(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/import-preview", {
      method: "POST",
      body: form,
    });
  },

  async exportCsv(params: {
    status?: string;
    store?: string;
    category?: string;
    include_deleted?: boolean;
  } = {}) {
    const qs = new URLSearchParams();
    if (params.status)          qs.set("status", params.status);
    if (params.store)           qs.set("store", params.store);
    if (params.category)        qs.set("category", params.category);
    if (params.include_deleted) qs.set("include_deleted", "true");

    const res = await fetch(
      `${API_BASE_URL}/api/products/admin/export?${qs.toString()}`,
      { credentials: "include" },
    );
    if (!res.ok) throw new Error("Export failed");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_export_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
    return request(`/api/payments/${orderId}`, { method: "POST" });
  },

  uploadProof(paymentId: string, file: File) {
    const form = new FormData();
    form.append("proof", file);
    return request(`/api/payments/${paymentId}/proof`, {
      method: "POST",
      body: form,
    });
  },

  adminList() {
    return request("/api/payments/admin");
  },

  getPaymentDetails(paymentId: string) {
    return request(`/api/payments/admin/${paymentId}`);
  },

  review(paymentId: string, status: "paid" | "rejected") {
    return request(`/api/payments/admin/${paymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },

  getBankDetails() {
    return request("/api/payments/bank-details");
  },

  getBankSettings() {
    return request("/api/payments/admin/bank-settings");
  },

  createBankSettings(data: any) {
    return request("/api/payments/admin/bank-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateBankSettings(bankId: string, data: any) {
    return request(`/api/payments/admin/bank-settings/${bankId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  deleteBankSettings(bankId: string) {
    return request(`/api/payments/admin/bank-settings/${bankId}`, {
      method: "DELETE",
    });
  },

  uploadQrCode(bankId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/payments/admin/bank-settings/${bankId}/qr-code`, {
      method: "POST",
      body: form,
    });
  },
};

/* =====================================================
   ADMIN CORE
===================================================== */

export const adminApi = {
  getDashboard() {
    return request("/api/admin/dashboard");
  },

  // ── ANALYTICS ────────────────────────────────────

  getAnalyticsOverview(days = 30) {
    return request(`/api/admin/analytics/overview?days=${days}`);
  },

  getRevenueAnalytics(days = 30) {
    return request(`/api/admin/analytics/revenue?days=${days}`);
  },

  getTopProducts(limit = 10) {
    return request(`/api/admin/analytics/top-products?limit=${limit}`);
  },

  getDeadStock(days_no_sale = 60) {
    return request(`/api/admin/analytics/dead-stock?days_no_sale=${days_no_sale}`);
  },

  getStockTurnover(limit = 20) {
    return request(`/api/admin/analytics/stock-turnover?limit=${limit}`);
  },

  // ── ORDER INTELLIGENCE ───────────────────────────

  getOrderAnalytics(days = 30) {
    return request(`/api/admin/orders/analytics?days=${days}`);
  },

  getOrderRevenue(days = 30) {
    return request(`/api/admin/orders/revenue?days=${days}`);
  },

  getOrderConversion(days = 30) {
    return request(`/api/admin/orders/conversion?days=${days}`);
  },

  // ── INVENTORY ────────────────────────────────────

  getLowStock() {
    return request("/api/admin/inventory/low-stock");
  },

  getOutOfStock() {
    return request("/api/admin/inventory/out-of-stock");
  },

  getInventoryReport() {
    return request("/api/admin/inventory/report");
  },

  adjustInventory(data: {
    product_id: string;
    quantity_change: number;
    type?: string;
    note?: string;
    reference?: string;
  }) {
    return request("/api/admin/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  incomingStock(data: {
    product_id: string;
    quantity: number;
    note?: string;
    reference?: string;
  }) {
    return request("/api/admin/inventory/incoming", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // ── STORES ───────────────────────────────────────

  listStores() {
    return request("/api/admin/stores");
  },

  createStore(data: {
    name: string;
    description?: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    is_active?: boolean;
  }) {
    return request("/api/admin/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateStore(storeId: string, data: Record<string, any>) {
    return request(`/api/admin/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  deleteStore(storeId: string) {
    return request(`/api/admin/stores/${storeId}`, {
      method: "DELETE",
    });
  },

  // ── AUDIT LOGS ───────────────────────────────────

  getLogs(params: { entity_type?: string; action?: string; page?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.entity_type) qs.set("entity_type", params.entity_type);
    if (params.action)      qs.set("action", params.action);
    if (params.page)        qs.set("page", String(params.page));
    return request(`/api/admin/logs${qs.toString() ? `?${qs}` : ""}`);
  },

  getEntityLogs(entityId: string) {
    return request(`/api/admin/logs/${entityId}`);
  },

  // ── ENTERPRISE SAFETY ────────────────────────────

  verifyPassword(password: string) {
    return request("/api/admin/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  },

  // ── EXISTING (kept) ──────────────────────────────

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
   BULK UPLOAD
===================================================== */

export const bulkUploadApi = {
  upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/bulk-upload", {
      method: "POST",
      body: form,
    });
  },

  validate(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/import-validate", {
      method: "POST",
      body: form,
    });
  },

  preview(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request("/api/products/admin/import-preview", {
      method: "POST",
      body: form,
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
   USER PROFILE
===================================================== */

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request("/api/users/me/avatar", { method: "POST", body: form });
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
   BACKWARD COMPAT
===================================================== */

export function getMyOrders(): Promise<Order[]> {
  return ordersApi.myOrders();
}