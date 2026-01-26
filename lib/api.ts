const API_URL = process.env.NEXT_PUBLIC_API_URL!

export type Product = {
  id: string
  title: string
  price: number
  img: string
  category: string
  rating: number
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const token = getToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.detail || "API error")
  }

  return res.json()
}

/* ---------------- PRODUCTS ---------------- */

export async function fetchProducts() {
  return apiFetch("/api/products")
}

// backward compatibility
export const getProducts = fetchProducts

/* ---------------- AUTH ---------------- */

export async function login(email: string, password: string) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function register(email: string, password: string) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function getMe() {
  return apiFetch("/api/auth/me")
}

/* ---------------- ORDERS ---------------- */

export async function getMyOrders() {
  return apiFetch("/api/orders/my")
}

export async function getAdminOrders() {
  return apiFetch("/api/orders/admin")
}
