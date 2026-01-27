const API_BASE = "https://karabo.onrender.com";

// ---------- helpers ----------
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // 🔐 REQUIRED FOR COOKIES
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API request failed");
  }

  return res.json();
}

// ---------- AUTH ----------
export async function login(email: string, password: string) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(payload: {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------- ORDERS ----------
export type Order = {
  id: string;
  total_amount: number;
  shipping_status?: string;
  created_at: string;
};

export async function getMyOrders(): Promise<Order[]> {
  return apiFetch("/api/orders/my");
}
