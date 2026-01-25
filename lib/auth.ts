type Session = {
  token: string;
  role: string;
  email: string;
};

/* ======================
   SAFE SESSION GETTER
====================== */
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;

  try {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const email = localStorage.getItem("email");

    if (!token || !role || !email) return null;

    return { token, role, email };
  } catch {
    return null;
  }
}

/* ======================
   LOGOUT
====================== */
export function logout(redirectTo: string = "/") {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
  } finally {
    window.location.href = redirectTo;
  }
}
