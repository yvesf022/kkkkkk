const API = process.env.NEXT_PUBLIC_API_URL!;

export async function getProducts() {
  const res = await fetch(`${API}/api/products`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }

  return res.json();
}

export async function getProduct(id: string) {
  const res = await fetch(`${API}/api/products/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Product not found");
  }

  return res.json();
}
