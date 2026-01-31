import { create } from "zustand";
import { login, logout, getMe } from "./api";

/* ======================
   TYPES
====================== */

export type User = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: "user" | "admin";

  // ✅ FIXED — fields actually used by UI
  avatar_url?: string;
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
     LOGIN
  -------------------- */
  login: async (email, password) => {
    set({ loading: true });

    // 1️⃣ Authenticate (cookie-based)
    await login(email, password);

    // 2️⃣ Resolve identity
    const user = await getMe();

    set({
      user,
      loading: false,
      initialized: true,
    });
  },

  /* --------------------
     LOGOUT
  -------------------- */
  logout: async () => {
    set({ loading: true });

    try {
      await logout();
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
