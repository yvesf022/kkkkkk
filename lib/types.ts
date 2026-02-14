/**
 * TYPES — AUTHORITATIVE
 *
 * This file mirrors:
 * - app/models.py
 * - actual API response payloads
 *
 * DO NOT invent fields.
 * DO NOT rename enums.
 * DO NOT add frontend-only states here.
 */

/* =====================================================
   ENUMS (EXACT MATCH TO BACKEND)
===================================================== */

export type UserRole = "user" | "admin";

export type ProductStatus = "active" | "inactive" | "discontinued";

/**
 * ✅ ORDER STATUS
 * Backend payment lifecycle:
 * pending → on_hold → paid → rejected
 */
export type OrderStatus =
  | "pending"
  | "on_hold"
  | "paid"
  | "rejected"
  | "cancelled"
  | "shipped"
  | "completed";

/**
 * ✅ SHIPPING STATUS
 * Exact backend match
 */
export type ShippingStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "returned";

export type PaymentStatus =
  | "pending"
  | "on_hold"
  | "paid"
  | "rejected";

export type PaymentMethod =
  | "card"
  | "cash"
  | "mobile_money"
  | "bank_transfer";

/* =====================================================
   USER
===================================================== */

export type User = {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
  avatar_url?: string | null;
};

/* =====================================================
   PRODUCT
===================================================== */

export type ProductImage = {
  id: string;
  image_url: string;
  position: number;
};

export type Product = {
  id: string;
  title: string;
  short_description?: string | null;
  description?: string | null;
  sku?: string | null;
  brand?: string | null;
  price: number;
  compare_price?: number | null;
  rating?: number | null;
  sales: number;
  category?: string | null;
  specs?: Record<string, any> | null;
  stock: number;
  in_stock: boolean;
  status: ProductStatus;
  main_image?: string | null;
  images?: ProductImage[];
  created_at?: string;
};

/**
 * Product shape returned by GET /api/products
 * (public listing)
 */
export type ProductListItem = {
  id: string;
  title: string;
  short_description?: string | null;
  price: number;
  brand?: string | null;
  rating?: number | null;
  sales: number;
  category?: string | null;
  stock: number;
  main_image?: string | null;
  images: string[];
  created_at: string;
};

/* =====================================================
   ORDER
===================================================== */

export type Order = {
  id: string;
  user_id?: string;
  items?: any;
  total_amount: number;

  /**
   * ✅ IMPORTANT
   * Must match OrderStatus union exactly
   */
  status: OrderStatus;

  payment_status?: PaymentStatus | null;
  shipping_status: ShippingStatus;
  tracking_number?: string | null;
  created_at: string;
};

/* =====================================================
   PAYMENT
===================================================== */

export type PaymentProof = {
  id: string;
  file_url: string;
  uploaded_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  proof?: PaymentProof | null;
  created_at: string;
};

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

export type AdminDashboardStats = {
  total_products: number;
  active_products: number;
  total_orders: number;
  paid_orders: number;
};

/* =====================================================
   API ERROR (OPTIONAL USE)
===================================================== */

export type ApiError = {
  status: number;
  message: string;
};
