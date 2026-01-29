import { create } from "zustand";
import { login, logout, getMe } from "./api";

export type User = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: "user" | "admin";
  created_at?: string;
  avatar_url?: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  updateUser: (user: User | null) => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,

  // ⚡ FAST LOGIN (non-blocking hydration)
  login: async (email, password) => {
    set({ loading: true });

    // 1️⃣ Authenticate (sets cookie)
    await login(email, password);

    // 2️⃣ Immediately unblock UI
    set({ loading: false });

    // 3️⃣ Hydrate user in background (DO NOT AWAIT)
    getMe()
      .then((user) => set({ user }))
      .catch(() => set({ user: null }));
  },

  logout: async () => {
    set({ loading: true });
    await logout();
    set({ user: null, loading: false });
  },

  refreshMe: async () => {
    try {
      set({ loading: true });
      const user = await getMe();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  updateUser: (user) => set({ user }),
}));
