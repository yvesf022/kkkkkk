import { create } from "zustand";

type User = {
  id: string;
  email: string;
  role: "user" | "admin";
};

type AuthState = {
  user: User | null;
  loading: boolean;

  fetchMe: () => Promise<void>;
  login: () => Promise<void>;   // 🔴 NO ARGUMENTS
  logout: () => Promise<void>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  fetchMe: async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        set({ user: null, loading: false });
        return;
      }

      const user = await res.json();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async () => {
    // Cookie already set by backend
    await useAuth.getState().fetchMe();
  },

  logout: async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      set({ user: null, loading: false });
    }
  },
}));
