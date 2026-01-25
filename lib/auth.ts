export function getSession() {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || !role) return null;

  return { token, role };
}

export function logout(redirect = "/login") {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("role");

  window.location.href = redirect;
}
