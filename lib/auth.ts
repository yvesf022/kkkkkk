"use client";

import { create } from "zustand";
import { authApi } from "./api";
import type { User as AppUser } from "./types";

/**
 * IMPORTANT:
 * We reuse the authoritative User type from lib/types.ts
 * DO NOT redefine User here.
 */

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
    set({ loading: true, error: null });

    try {
      const user = (await authApi.me()) as User;
      set({ user, loading: false });
    } catch (err: any) {
      if (err?.status === 401) {
        set({ user: null, loading: false });
      } else if (err?.status === 403) {
        set({
          user: null,
          loading: false,
          error: "Your account has been disabled.",
        });
      } else {
        set({
          user: null,
          loading: false,
          error: "Failed to load session.",
        });
      }
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      await authApi.login({ email, password });
      const user = (await authApi.me()) as User;
      set({ user, loading: false });
    } catch (err: any) {
      if (err?.status === 401) {
        set({ loading: false, error: "Invalid email or password." });
      } else if (err?.status === 403) {
        set({ loading: false, error: "Your account has been disabled." });
      } else {
        set({ loading: false, error: "Login failed." });
      }
      throw err;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await authApi.logout();
    } finally {
      set({ user: null, loading: false });
    }
  },

  clear: () => {
    set({ user: null, loading: false, error: null });
  },
}));
