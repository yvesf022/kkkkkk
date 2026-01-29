"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
};

type AuthState = {
  user: User | null;
  loading: boolean;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  // 🔑 AMAZON-LEVEL AUTH HYDRATION
  hydrate: async () => {
    try {
      const res = await api.get("/auth/me", {
        withCredentials: true,
      });

      set({
        user: res.data,
        loading: false,
      });
    } catch {
      // ❌ No identity → not logged in
      set({
        user: null,
        loading: false,
      });
    }
  },

  // 🔐 LOGIN = get identity, then route
  login: async (email, password) => {
    const res = await api.post(
      "/auth/login",
      { email, password },
      { withCredentials: true }
    );

    const user: User = {
      id: res.data.id,
      email: res.data.email,
      full_name: res.data.full_name,
      role: res.data.role,
    };

    set({ user });

    // 🎯 ROLE-BASED REDIRECT (FINAL)
    if (user.role === "admin") {
      window.location.replace("/admin");
    } else {
      window.location.replace("/account");
    }
  },

  // 🚪 LOGOUT = destroy identity
  logout: async () => {
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch {
      // ignore
    }

    set({ user: null });
  },
}));
