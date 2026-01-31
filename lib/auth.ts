import { create } from "zustand";
import { login as apiLogin, logout as apiLogout, getMe } from "./api";

/* ======================
   TYPES
====================== */

export type User = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: "user" | "admin";
  avatar_url?: string; // ✅ RESTORED (used by profile page)
  created_at?: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  initialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;

  updateUser: (user: User | null) => void;
};

/* ======================
   STORE
====================== */

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  /* --------------------
     LOGIN (NON-BLOCKING)
  -------------------- */
  login: async (email, password) => {
    set({ loading: true });

    // 1️⃣ Authenticate (cookie-based)
    await apiLogin(email, password);

    // 2️⃣ Try to resolve identity, but NEVER block UI
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const user = await getMe({ signal: controller.signal });
      clearTimeout(timeout);

      set({
        user,
        loading: false,
        initialized: true,
      });
    } catch {
      // Login succeeded; identity will hydrate later
      set({
        loading: false,
        initialized: true,
      });
    }
  },

  /* --------------------
     LOGOUT
  -------------------- */
  logout: async () => {
    set({ loading: true });
    try {
      await apiLogout();
    } finally {
      set({
        user: null,
        loading: false,
        initialized: true,
      });
    }
  },

  /* --------------------
     REFRESH SESSION
  -------------------- */
  refreshMe: async () => {
    if (get().initialized) return;

    set({ loading: true });
    try {
      const user = await getMe();
      set({
        user,
        loading: false,
        initialized: true,
      });
    } catch {
      set({
        user: null,
        loading: false,
        initialized: true,
      });
    }
  },

  /* --------------------
     MANUAL UPDATE
  -------------------- */
  updateUser: (user) => set({ user }),
}));
