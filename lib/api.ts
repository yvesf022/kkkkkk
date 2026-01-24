const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://127.0.0.1:5000";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    console.error("❌ Network error:", err);
    throw new Error("Backend not reachable");
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  return res.json();
}

export function getProducts() {
  return apiFetch("/api/products");
}
