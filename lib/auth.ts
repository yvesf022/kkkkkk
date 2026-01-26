"use client"

import { create } from "zustand"
import { getMe } from "./api"

type User = {
  id: string
  email: string
  role: "user" | "admin"
}

type AuthState = {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  hydrate: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,

  login: async (token) => {
    localStorage.setItem("token", token)
    const user = await getMe()
    set({ token, user, loading: false })
  },

  logout: () => {
    localStorage.removeItem("token")
    set({ user: null, token: null, loading: false })
  },

  hydrate: async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      set({ loading: false })
      return
    }

    try {
      const user = await getMe()
      set({ token, user, loading: false })
    } catch {
      localStorage.removeItem("token")
      set({ user: null, token: null, loading: false })
    }
  },
}))
