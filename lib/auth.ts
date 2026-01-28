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

  fetchMe: () => Promise<void>;
  hydrate: () => Promise<void>;
  logoutInternal: () => Promise<void>;
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

  logoutInternal: async () => {
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

/* ✅ LOGIN expects (email, password) */
export async function login(email: string, password: string) {
  await api.login(email, password);
  await useAuth.getState().fetchMe();
}

/* ✅ REGISTER expects payload handled elsewhere, then login */
export async function register(
  email: string,
  password: string,
  full_name?: string,
  phone?: string
) {
  await api.register({ email, password, full_name, phone });
  await useAuth.getState().fetchMe();
}

/* ✅ LOGOUT */
export async function logout() {
  await useAuth.getState().logoutInternal();
}
