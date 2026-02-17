/**
 * TYPES – AUTHORITATIVE ENTERPRISE VERSION
 * Fully aligned with backend models.py and API responses
 */

/* =====================================================
   ENUMS (EXACT MATCH TO BACKEND)
===================================================== */

export type UserRole = "user" | "admin";

export type ProductStatus =
  | "active"
  | "inactive"
  | "discontinued"
  | "archived"
  | "draft";

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

export type NotificationType =
  | "order_status"
  | "payment_status"
  | "product_restock"
  | "promotion"
  | "system";

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
  email_verified?: boolean;
  last_login?: string | null;
};

/* =====================================================
   ADDRESS
===================================================== */

export type Address = {
  id: string;
  user_id: string;
  label?: string | null;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  district?: string | null;
  postal_code?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at?: string | null;
};

/* =====================================================
   PRODUCT
===================================================== */

export type ProductImage = {
  id: string;
  image_url: string;
  position: number;
  is_primary: boolean;
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

export type Product = {
  id: string;
  title: string;
  short_description?: string | null;
  description?: string | null;
  sku?: string | null;
  brand?: string | null;
  parent_asin?: string | null;
  price: number;
  compare_price?: number | null;
  rating?: number | null;
  rating_number?: number | null;
  sales: number;
  category?: string | null;
  main_category?: string | null;
  categories?: any | null;
  specs?: Record<string, any> | null;
  details?: Record<string, any> | null;
  features?: any | null;
  stock: number;
  in_stock: boolean;
  low_stock_threshold?: number | null;
  store?: string | null;
  store_id?: string | null;
  status: ProductStatus;
  is_deleted?: boolean;
  deleted_at?: string | null;
  main_image?: string | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
  created_at?: string;
  updated_at?: string | null;
};

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
   CART
===================================================== */

export type CartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  price: number;
  product?: Product;
  variant?: ProductVariant | null;
  created_at: string;
  updated_at?: string | null;
};

export type Cart = {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  items: CartItem[];
  subtotal: number;
  created_at: string;
  updated_at?: string | null;
};

/* =====================================================
   ORDER
===================================================== */

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string | null;
  title: string;
  price: number;
  quantity: number;
  subtotal: number;
  product?: Product | null;
  variant?: ProductVariant | null;
};

export type OrderNote = {
  id: string;
  order_id: string;
  content: string;
  is_internal: boolean;
  created_by?: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  user_id?: string;
  items?: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  payment_status?: PaymentStatus | null;
  shipping_status: ShippingStatus;
  shipping_address?: Record<string, any> | null;
  notes?: string | null;
  tracking_number?: string | null;
  refund_status?: "none" | "requested" | "processing" | "completed" | "rejected" | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  return_status?: "none" | "requested" | "approved" | "rejected" | "completed" | null;
  return_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  cancelled_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  payments?: Payment[];
  order_notes?: OrderNote[];
};

/* =====================================================
   PAYMENT
===================================================== */

export type PaymentProof = {
  id: string;
  file_url: string;
  uploaded_at: string;
};

export type PaymentStatusHistory = {
  id: string;
  payment_id: string;
  status: PaymentStatus;
  reason?: string | null;
  changed_by?: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  proof?: PaymentProof | null;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  status_history?: PaymentStatusHistory[];
  created_at: string;
  updated_at?: string | null;
};

/* =====================================================
   REVIEWS
===================================================== */

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  verified_purchase: boolean;
  helpful_count: number;
  unhelpful_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string | null;
  user?: Partial<User>;
};

/* =====================================================
   PRODUCT Q&A
===================================================== */

export type ProductQuestion = {
  id: string;
  product_id: string;
  user_id: string;
  question: string;
  answer?: string | null;
  answered_by?: string | null;
  answered_at?: string | null;
  created_at: string;
  user?: Partial<User>;
};

/* =====================================================
   WISHLIST
===================================================== */

export type WishlistItem = {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  created_at: string;
};

/* =====================================================
   NOTIFICATIONS
===================================================== */

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
};

/* =====================================================
   COUPONS
===================================================== */

export type Coupon = {
  id: string;
  code: string;
  description?: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase?: number | null;
  max_discount?: number | null;
  usage_limit?: number | null;
  usage_count: number;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
};

/* =====================================================
   WALLET
===================================================== */

export type WalletTransaction = {
  id: string;
  wallet_id: string;
  type: "earn" | "redeem" | "refund" | "adjustment";
  points: number;
  balance_after: number;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at: string;
};

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  created_at: string;
  updated_at?: string | null;
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
  pending_payments: number;
  low_stock_products: number;
  total_revenue: number;
  revenue_this_month: number;
};

/* =====================================================
   STORES
===================================================== */

export type Store = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at?: string | null;
};

/* =====================================================
   CATEGORIES & BRANDS
===================================================== */

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  description?: string | null;
  image_url?: string | null;
  product_count: number;
  is_active: boolean;
  created_at: string;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  product_count: number;
  is_active: boolean;
  created_at: string;
};

/* =====================================================
   AUDIT LOGS
===================================================== */

export type AuditLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id?: string | null;
  user_email?: string | null;
  changes?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
};

/* =====================================================
   SESSIONS
===================================================== */

export type Session = {
  id: string;
  user_id: string;
  user_email: string;
  ip_address?: string | null;
  user_agent?: string | null;
  last_activity: string;
  created_at: string;
};

/* =====================================================
   ANALYTICS
===================================================== */

export type RevenueData = {
  date: string;
  revenue: number;
  orders: number;
};

export type TopProduct = {
  product_id: string;
  title: string;
  sales: number;
  revenue: number;
  stock: number;
};

export type StockTurnover = {
  product_id: string;
  title: string;
  turnover_rate: number;
  days_in_stock: number;
};

/* =====================================================
   API PAYLOADS (Request types)
===================================================== */

export type RefundPayload = {
  reason?: string;
  notify_customer?: boolean;
};

export type PartialRefundPayload = {
  amount: number;
  reason?: string;
  notify_customer?: boolean;
};

export type StatusOverridePayload = {
  status: OrderStatus | PaymentStatus;
  reason?: string;
};

export type OrderNotePayload = {
  content: string;
  is_internal?: boolean;
};

export type ReviewVotePayload = {
  vote: "up" | "down";
};

export type QuestionCreate = {
  question: string;
};

export type ForcePasswordResetPayload = {
  reason?: string;
};

export type CancelOrderPayload = {
  reason?: string;
};

export type CancelPaymentPayload = {
  reason?: string;
};

export type ReturnOrderPayload = {
  reason: string;
  items?: string[];
};

export type RefundRequestPayload = {
  reason: string;
  amount?: number;
};

export type RedeemPayload = {
  points: number;
};

/* =====================================================
   API ERROR
===================================================== */

export type ApiError = {
  status: number;
  message: string;
  detail?: string;
};

/* =====================================================
   SEARCH
===================================================== */

export type SearchResult = {
  products: ProductListItem[];
  total: number;
  suggestions?: string[];
};

/* =====================================================
   INVENTORY
===================================================== */

export type InventoryAdjustment = {
  product_id: string;
  adjustment: number;
  reason?: string;
  reference?: string;
};

export type IncomingStock = {
  product_id: string;
  quantity: number;
  supplier?: string;
  reference?: string;
};