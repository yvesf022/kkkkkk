import { create } from "zustand";
import { api } from "@/lib/api";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

type AuthState = {
  user: User | null;
  loading: boolean;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  // ✅ AMAZON-LEVEL HYDRATION
  hydrate: async () => {
    try {
      const res = await api.get("/auth/me"); // MUST exist on backend
      set({ user: res.data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });

    // backend must return user object
    set({ user: res.data.user });

    if (res.data.user.role === "admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/account";
    }
  },

  logout: () => {
    set({ user: null });
    api.post("/auth/logout").catch(() => {});
  },
}));
