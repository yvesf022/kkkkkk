import { create } from "zustand";
import * as api from "@/lib/api";

type User = {
  id: string;
  email: string;
  role: "user" | "admin";
};

type AuthState = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: "user" | "admin" | null;

  fetchMe: () => Promise<User | null>;
  hydrate: () => Promise<void>;
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

      if (!res.ok) throw new Error();

      const user: User = await res.json();
      set({
        user,
        isAuthenticated: true,
        role: user.role,
        loading: false,
      });

      return user;
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        role: null,
        loading: false,
      });
      return null;
    }
  },

  hydrate: async () => {
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

/* =========================================================
   FUNCTION EXPORTS (PAGE CONTRACTS)
========================================================= */

/* ✅ RETURNS USER */
export async function login(email: string, password: string) {
  await api.login(email, password);
  const user = await useAuth.getState().fetchMe();
  return user;
}

/* ✅ RETURNS USER */
export async function register(
  email: string,
  password: string,
  full_name?: string,
  phone?: string
) {
  await api.register({ email, password, full_name, phone });
  const user = await useAuth.getState().fetchMe();
  return user;
}

/* ✅ VOID */
export async function logout() {
  await useAuth.getState().logout();
}
