export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
}
