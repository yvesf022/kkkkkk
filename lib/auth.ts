"use client";

import { create } from "zustand";
import { authApi, tokenStorage } from "./api";
import type { User as AppUser } from "./types";

export type User = AppUser;

type AuthState = {
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  hydrated: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated) return;

    if (!tokenStorage.get()) {
      set({ user: null, loading: false, hydrated: true });
      return;
    }

    set({ loading: true, error: null });

    try {
      const user = (await authApi.me()) as User;
      set({ user, loading: false, hydrated: true });
    } catch (err: any) {
      tokenStorage.remove();
      if (err?.status === 403) {
        set({ user: null, loading: false, hydrated: true, error: "Your account has been disabled." });
      } else {
        set({ user: null, loading: false, hydrated: true });
      }
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      const data: any = await authApi.login({ email, password });

      if (data?.access_token) {
        tokenStorage.set(data.access_token);
      }

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

      set({ user, loading: false, hydrated: true });
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
      set({ user: null, loading: false, hydrated: false });
    }
  },

  clear: () => {
    tokenStorage.remove();
    set({ user: null, loading: false, hydrated: false, error: null });
  },
}));