import { create } from "zustand";
import {
  login as apiLogin,
  logout as apiLogout,
  getMe,
  updateMe as apiUpdateMe,
} from "@/lib/api";

/* ======================
   TYPES
====================== */

export type User = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: "user" | "admin";
  avatar_url?: string;
  created_at?: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;

  // actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  updateUser: (payload: Partial<User>) => Promise<void>;
};

/* ======================
   STORE
====================== */

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  /* ---------- LOGIN ---------- */
  async login(email, password) {
    set({ loading: true });

    const res = await apiLogin(email, password);

    // token handled by backend cookie (Amazon-style)
    localStorage.setItem("role", res.role);

    const me = await getMe();

    set({
      user: me,
      loading: false,
    });
  },

  /* ---------- LOGOUT ---------- */
  async logout() {
    set({ loading: true });

    try {
      await apiLogout();
    } catch {
      // ignore network errors on logout
    }

    localStorage.removeItem("role");

    set({
      user: null,
      loading: false,
    });
  },

  /* ---------- REFRESH /ME ---------- */
  async refreshMe() {
    set({ loading: true });

    try {
      const me = await getMe();
      set({ user: me, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  /* ---------- UPDATE USER (PROFILE) ---------- */
  async updateUser(payload) {
    set({ loading: true });

    const updated = await apiUpdateMe(payload);

    set({
      user: updated,
      loading: false,
    });
  },
}));
