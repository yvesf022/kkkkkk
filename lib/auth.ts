"use client";

import { create } from "zustand";

type Role = "admin" | "user";

interface AuthState {
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (token: string, role: Role) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  role: null,
  isAuthenticated: false,
  loading: true,

  // =====================
  // LOGIN
  // =====================
  login: (token, role) => {
    // Ensure localStorage only accessed on client side
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
      localStorage.setItem("role", role);
    }

    set({
      token,
      role,
      isAuthenticated: true,
      loading: false,
    });
  },

  // =====================
  // LOGOUT
  // =====================
  logout: () => {
    // Ensure localStorage only accessed on client side
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("role");
    }

    set({
      token: null,
      role: null,
      isAuthenticated: false,
      loading: false,
    });
  },

  // =====================
  // HYDRATE ON REFRESH
  // =====================
  hydrate: () => {
    // Ensure this runs only on the client
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      const role = localStorage.getItem("role") as Role | null;

      if (token && role) {
        set({
          token,
          role,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        set({
          loading: false,
        });
      }
    }
  },
}));
