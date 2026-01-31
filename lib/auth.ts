import { create } from "zustand";
import { login as apiLogin, logout as apiLogout, getMe } from "./api";

export type User = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: "user" | "admin";
};

type AuthState = {
  user: User | null;
  loading: boolean;
  initialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  // =====================
  // LOGIN (NON-BLOCKING)
  // =====================
  login: async (email, password) => {
    set({ loading: true });

    await apiLogin(email, password);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const user = await getMe({ signal: controller.signal });
      clearTimeout(timeout);

      set({ user, loading: false, initialized: true });
    } catch {
      // Login succeeded; identity will hydrate later
      set({ loading: false, initialized: true });
    }
  },

  // =====================
  // LOGOUT
  // =====================
  logout: async () => {
    set({ loading: true });
    try {
      await apiLogout();
    } finally {
      set({ user: null, loading: false, initialized: true });
    }
  },

  // =====================
  // REFRESH SESSION
  // =====================
  refreshMe: async () => {
    if (get().initialized) return;

    set({ loading: true });
    try {
      const user = await getMe();
      set({ user, loading: false, initialized: true });
    } catch {
      set({ user: null, loading: false, initialized: true });
    }
  },
}));
