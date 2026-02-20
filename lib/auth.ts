"use client";

import { create } from "zustand";
import { authApi, tokenStorage } from "./api";
import type { User as AppUser } from "./types";

export type User = AppUser;

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  hydrate: async () => {
    // If no token stored, skip the /me call entirely — avoids 401 crash
    if (!tokenStorage.get()) {
      set({ user: null, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const user = (await authApi.me()) as User;
      set({ user, loading: false });
    } catch (err: any) {
      // Token expired or invalid — clear it
      tokenStorage.remove();
      if (err?.status === 403) {
        set({ user: null, loading: false, error: "Your account has been disabled." });
      } else {
        set({ user: null, loading: false });
      }
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      const data: any = await authApi.login({ email, password });

      // ✅ Save token returned from backend into localStorage
      if (data?.access_token) {
        tokenStorage.set(data.access_token);
      }

      // Use the user data returned from login directly (no extra /me call needed)
      const user: User = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        avatar_url: data.avatar_url ?? null,
        is_active: data.is_active ?? true,
        created_at: data.created_at ?? new Date().toISOString(),
      };

      set({ user, loading: false });
    } catch (err: any) {
      tokenStorage.remove();
      if (err?.status === 401) {
        set({ loading: false, error: "Invalid email or password." });
      } else if (err?.status === 403) {
        set({ loading: false, error: "Your account has been disabled." });
      } else {
        set({ loading: false, error: "Login failed. Please try again." });
      }
      throw err;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    tokenStorage.remove();
    try {
      await authApi.logout();
    } finally {
      set({ user: null, loading: false });
    }
  },

  clear: () => {
    tokenStorage.remove();
    set({ user: null, loading: false, error: null });
  },
}));