import { create } from "zustand";

type User = {
  id: string;
  email: string;
  role: "user" | "admin";
};

type AuthState = {
  user: User | null;
  loading: boolean;

  // 👇 expected by existing components
  isAuthenticated: boolean;
  role: "user" | "admin" | null;

  fetchMe: () => Promise<void>;
  hydrate: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  isAuthenticated: false,
  role: null,

  fetchMe: async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        set({
          user: null,
          isAuthenticated: false,
          role: null,
          loading: false,
        });
        return;
      }

      const user: User = await res.json();

      set({
        user,
        isAuthenticated: true,
        role: user.role,
        loading: false,
      });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        role: null,
        loading: false,
      });
    }
  },

  hydrate: async () => {
    await get().fetchMe();
  },

  login: async () => {
    await get().fetchMe();
  },

  logout: async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        role: null,
        loading: false,
      });
    }
  },
}));
