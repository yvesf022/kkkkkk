import { create } from "zustand";
import { login, logout, getMe } from "./api";

export type User = {
  id: string;
  email: string;
  role: "user" | "admin";
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
  loading: true,

  login: async (email, password) => {
    set({ loading: true });
    await login(email, password);
    await useAuth.getState().refreshMe();
    set({ loading: false });
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
