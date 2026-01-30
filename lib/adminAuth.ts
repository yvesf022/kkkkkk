import { create } from "zustand";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

export type Admin = {
  id: string;
  email: string;
  role: "admin";
};

type AdminAuthState = {
  admin: Admin | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const useAdminAuth = create<AdminAuthState>((set) => ({
  admin: null,
  loading: false,

  // 🔐 ADMIN LOGIN
  login: async (email, password) => {
    set({ loading: true });

    const res = await fetch(`${API}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      set({ loading: false });
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail || "Admin login failed");
    }

    // ⚡ unblock UI immediately
    set({ loading: false });

    // hydrate admin in background
    fetch(`${API}/api/admin/auth/me`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((admin) => {
        if (admin?.role === "admin") {
          set({ admin });
        } else {
          set({ admin: null });
        }
      })
      .catch(() => set({ admin: null }));
  },

  // 🔓 ADMIN LOGOUT
  logout: async () => {
    set({ loading: true });

    await fetch(`${API}/api/admin/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    set({ admin: null, loading: false });
  },

  // 🔄 CHECK EXISTING ADMIN SESSION
  refresh: async () => {
    try {
      set({ loading: true });

      const res = await fetch(`${API}/api/admin/auth/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        set({ admin: null, loading: false });
        return;
      }

      const admin = await res.json();
      if (admin?.role === "admin") {
        set({ admin, loading: false });
      } else {
        set({ admin: null, loading: false });
      }
    } catch {
      set({ admin: null, loading: false });
    }
  },
}));
