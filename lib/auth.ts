"use client";

import { create } from "zustand";
import { authApi } from "./api";

/**
 * BACKEND CONTRACT (DO NOT CHANGE):
 *
 * - Auth is cookie-based (HTTP-only)
 * - Cookie name: access_token
 * - Login sets cookie
 * - /api/auth/me is the ONLY source of truth
 * - 401 = not authenticated
 * - 403 = user disabled
 */

export type User = {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: "user";
  created_at?: string;
  avatar_url?: string | null;
};

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

  /**
   * Hydrate session from backend
   * MUST be called on app load / refresh
   */
  hydrate: async () => {
    set({ loading: true, error: null });

    try {
      // ✅ FIX: typed return value
      const user = await authApi.me<User>();
      set({ user, loading: false });
    } catch (err: any) {
      if (err?.status === 401) {
        // Not logged in (normal state)
        set({ user: null, loading: false });
      } else if (err?.status === 403) {
        // User disabled
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

  /**
   * Login
   * Backend sets HTTP-only cookie
   */
  login: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      await authApi.login({ email, password });

      // ALWAYS re-hydrate from /me
      const user = await authApi.me<User>(); // ✅ typed
      set({ user, loading: false });
    } catch (err: any) {
      if (err?.status === 401) {
        set({
          loading: false,
          error: "Invalid email or password.",
        });
      } else if (err?.status === 403) {
        set({
          loading: false,
          error: "Your account has been disabled.",
        });
      } else {
        set({
          loading: false,
          error: "Login failed.",
        });
      }
      throw err;
    }
  },

  /**
   * Logout
   * Backend clears cookie
   */
  logout: async () => {
    set({ loading: true, error: null });

    try {
      await authApi.logout();
    } finally {
      set({ user: null, loading: false });
    }
  },

  /**
   * Local reset (no API call)
   */
  clear: () => {
    set({ user: null, loading: false, error: null });
  },
}));
