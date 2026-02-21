"use client";

import { create } from "zustand";
import { adminAuthApi } from "./api";

/**
 * BACKEND CONTRACT (DO NOT CHANGE):
 *
 * - Admin auth is cookie-based (HTTP-only)
 * - Cookie name: admin_access_token
 * - Login sets cookie (8 hours)
 * - /api/admin/auth/me is the ONLY source of truth
 * - 401 = not authenticated
 * - 403 = authenticated but not admin / access denied
 */

export type Admin = {
  id: string;
  email: string;
  role: "admin";
};

type AdminAuthState = {
  admin: Admin | null;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
};

export const useAdminAuth = create<AdminAuthState>((set) => ({
  admin: null,
  loading: true,
  error: null,

  /**
   * Hydrate admin session from backend
   * MUST be called on admin app load / refresh
   */
  hydrate: async () => {
    set({ loading: true, error: null });

    try {
      const admin = await adminAuthApi.me();
      set({ admin, loading: false });
    } catch (err: any) {
      if (err?.status === 401) {
        // Not logged in (normal admin state)
        set({ admin: null, loading: false });
      } else if (err?.status === 403) {
        // Logged in but not allowed (should be rare)
        set({
          admin: null,
          loading: false,
          error: "Admin access denied.",
        });
      } else {
        set({
          admin: null,
          loading: false,
          error: "Failed to load admin session.",
        });
      }
    }
  },

  /**
   * Admin login
   * Backend sets HTTP-only admin cookie
   */
  login: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      // login() now saves access_token to adminTokenStorage internally
      await adminAuthApi.login({ email, password });

      // Token is now in localStorage — /me will send it as Authorization header
      const admin = await adminAuthApi.me();
      set({ admin, loading: false });
    } catch (err: any) {
      if (err?.status === 401) {
        set({
          loading: false,
          error: "Invalid admin credentials.",
        });
      } else if (err?.status === 403) {
        set({
          loading: false,
          error: "You do not have admin access.",
        });
      } else {
        set({
          loading: false,
          error: "Admin login failed.",
        });
      }
      throw err;
    }
  },

  /**
   * Admin logout
   * Backend clears admin cookie
   */
  logout: async () => {
    set({ loading: true, error: null });

    try {
      await adminAuthApi.logout();
    } catch {
      // Even if logout fails, clear local state
    } finally {
      set({ admin: null, loading: false });
    }
  },

  /**
   * Local reset (no API call)
   */
  clear: () => {
    set({ admin: null, loading: false, error: null });
  },
}));