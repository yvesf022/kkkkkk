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

// ✅ FIXED: added "archived" | "draft" to match models.py ProductStatus
export type ProductStatus =
  | "active"
  | "inactive"
  | "discontinued"
  | "archived"
  | "draft";

// ✅ FIXED: OrderStatus — separated from PaymentStatus (they are different enums in backend)
export type OrderStatus =
  | "pending"
  | "paid"
  | "cancelled"
  | "shipped"
  | "completed";

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

export type BulkUploadStatus =
  | "processing"
  | "completed"
  | "failed"
  | "partial";

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
  is_primary: boolean;        // ✅ added — exists in model
};

export type ProductVariant = {
  id: string;
  product_id: string;
  title: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price: number;
  compare_price?: number | null;
  stock: number;
  in_stock: boolean;
  image_url?: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string | null;
};

// ✅ FIXED: added all fields that exist in models.py and are used in page.tsx
export type Product = {
  id: string;
  title: string;
  short_description?: string | null;
  description?: string | null;
  sku?: string | null;
  brand?: string | null;
  parent_asin?: string | null;      // ✅ added
  price: number;
  compare_price?: number | null;
  rating?: number | null;
  rating_number?: number | null;    // ✅ added
  sales: number;
  category?: string | null;
  main_category?: string | null;    // ✅ FIXED — was missing, caused build error
  categories?: any | null;          // ✅ added
  specs?: Record<string, any> | null;
  details?: Record<string, any> | null;   // ✅ added
  features?: any | null;            // ✅ added
  stock: number;
  in_stock: boolean;
  low_stock_threshold?: number | null;    // ✅ added
  store?: string | null;            // ✅ added — used in page.tsx line 148
  store_id?: string | null;         // ✅ added
  status: ProductStatus;
  is_deleted?: boolean;             // ✅ added
  deleted_at?: string | null;       // ✅ added
  main_image?: string | null;
  images?: ProductImage[];
  variants?: ProductVariant[];      // ✅ added
  created_at?: string;
  updated_at?: string | null;       // ✅ added
};

/**
 * Product shape returned by GET /api/products
 * (public listing — intentionally slimmer than Product)
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
  status: OrderStatus;
  payment_status?: PaymentStatus | null;
  shipping_status: ShippingStatus;
  shipping_address?: Record<string, any> | null;  // ✅ added
  notes?: string | null;                           // ✅ added
  tracking_number?: string | null;
  created_at: string;
  updated_at?: string | null;                      // ✅ added
  payments?: Payment[];                            // ✅ added — returned by detail endpoints
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
  admin_notes?: string | null;        // ✅ added
  reviewed_by?: string | null;        // ✅ added
  reviewed_at?: string | null;        // ✅ added
  created_at: string;
};

/* =====================================================
   BULK UPLOAD
===================================================== */

export type BulkUpload = {
  id: string;
  filename: string;
  uploaded_by?: string | null;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: BulkUploadStatus;
  errors?: any | null;
  summary?: any | null;
  started_at: string;
  completed_at?: string | null;
};

/* =====================================================
   BANK SETTINGS
===================================================== */

export type BankSettings = {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch?: string | null;
  swift_code?: string | null;
  mobile_money_provider?: string | null;
  mobile_money_number?: string | null;
  mobile_money_name?: string | null;
  qr_code_url?: string | null;
  instructions?: string | null;
  is_active: boolean;
  is_primary: boolean;
};

/* =====================================================
   PRODUCT ANALYTICS
===================================================== */

export type InventoryEntry = {
  type: string;
  before: number;
  change: number;
  after: number;
  note?: string | null;
  created_at: string;
};

export type ProductAnalytics = {
  sales: number;
  revenue_estimate: number;
  rating: number;
  rating_number: number;
  stock: number;
  inventory_history: InventoryEntry[];
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
   API ERROR
===================================================== */

export type ApiError = {
  status: number;
  message: string;
};