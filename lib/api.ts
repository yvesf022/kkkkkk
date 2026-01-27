const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   HELPERS
====================== */

function authHeaders() {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("token")
    : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ======================
   AUTH
====================== */

export async function getMe() {
  const res = await fetch(`${API}/api/auth/me`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function updateMe(payload: {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}) {
  const res = await fetch(`${API}/api/users/me`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

/* ======================
   ADDRESSES
====================== */

export async function getMyAddresses() {
  const res = await fetch(`${API}/api/addresses/my`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch addresses");
  return res.json();
}

export async function createAddress(payload: {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}) {
  const res = await fetch(`${API}/api/addresses`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create address");
  return res.json();
}

export async function deleteAddress(addressId: string) {
  const res = await fetch(`${API}/api/addresses/${addressId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete address");
  return true;
}

export async function setDefaultAddress(addressId: string) {
  const res = await fetch(`${API}/api/addresses/${addressId}/default`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to set default address");
  return res.json();
}
