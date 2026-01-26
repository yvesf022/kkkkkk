const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* =========================
   TYPES (SINGLE SOURCE)
========================= */
export type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  rating: number;
};

/* =========================
   TOKEN HELPERS
========================= */
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

/* =========================
   AUTH
========================= */
export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error("Invalid email or password");
  }

  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error("Not authenticated");
  }

  return res.json();
}

/* =========================
   PRODUCTS
========================= */
export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/products`);

  if (!res.ok) {
    throw new Error("Failed to load products");
  }

  return res.json();
}

/* ✅ backward compatibility */
export const getProducts = fetchProducts;

export async function createProduct(formData: FormData) {
  const res = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to create product");
  }

  return res.json();
}

export async function deleteProduct(productId: string) {
  const res = await fetch(`${API_BASE}/api/products/${productId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error("Failed to delete product");
  }

  return res.json();
}

/* =========================
   ORDERS (USER)
========================= */
export async function createOrder(payload: any) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to create order");
  }

  return res.json();
}

export async function fetchMyOrders() {
  const res = await fetch(`${API_BASE}/api/orders/my`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load orders");
  }

  return res.json();
}

/* =========================
   ORDERS (ADMIN)
========================= */
export async function fetchAdminOrders() {
  const res = await fetch(`${API_BASE}/api/orders/admin`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load admin orders");
  }

  return res.json();
}

export async function updateOrderStatus(
  orderId: string,
  status: "created" | "pending" | "shipped" | "delivered" | "cancelled"
) {
  const res = await fetch(
    `${API_BASE}/api/orders/admin/${orderId}/status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(status),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to update order status");
  }

  return res.json();
}

/* =========================
   PAYMENT SETTINGS (ADMIN)
========================= */
export async function fetchPaymentSettings() {
  const res = await fetch(`${API_BASE}/api/admin/payment-settings`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load payment settings");
  }

  return res.json();
}

export async function savePaymentSettings(payload: any) {
  const res = await fetch(`${API_BASE}/api/admin/payment-settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to save payment settings");
  }

  return res.json();
}
