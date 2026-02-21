"use client";

import { create } from "zustand";
import { adminAuthApi, adminTokenStorage } from "./api";

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

  hydrate: async () => {
    if (!adminTokenStorage.get()) {
      set({ admin: null, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const admin = await adminAuthApi.me();
      set({ admin, loading: false });
    } catch (err: any) {
      adminTokenStorage.remove();
      set({ admin: null, loading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      await adminAuthApi.login({ email, password });
      const admin = await adminAuthApi.me();
      set({ admin, loading: false });
    } catch (err: any) {
      adminTokenStorage.remove();
      if (err?.status === 401) {
        set({ loading: false, error: "Invalid admin credentials." });
      } else if (err?.status === 403) {
        set({ loading: false, error: "You do not have admin access." });
      } else {
        set({ loading: false, error: "Admin login failed." });
      }
      throw err;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    adminTokenStorage.remove();
    try {
      await adminAuthApi.logout();
    } catch {
    } finally {
      set({ admin: null, loading: false });
    }
  },

  clear: () => {
    adminTokenStorage.remove();
    set({ admin: null, loading: false, error: null });
  },
}));