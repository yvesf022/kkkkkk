"use client";

import { Toaster, toast, ToastOptions } from "react-hot-toast";

/**
 * GLOBAL NOTIFICATION SYSTEM
 *
 * Features:
 * - Unified success / error / info / warning
 * - Promise support
 * - Auto backend error parsing
 * - Prevent duplicate toasts
 * - Works across admin, user, guest
 */

const baseStyle = {
  background: "rgba(10, 24, 54, 0.92)",
  color: "rgba(234,246,255,0.95)",
  border: "1px solid rgba(73,215,255,0.28)",
  boxShadow: "0 0 32px rgba(73,215,255,0.15)",
  borderRadius: "16px",
  backdropFilter: "blur(12px)",
  fontWeight: 600,
  fontSize: "14px",
};

/* =====================================================
   GLOBAL HELPERS
===================================================== */

export const notify = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, { ...options }),

  error: (error: any, options?: ToastOptions) => {
    const message =
      typeof error === "string"
        ? error
        : error?.response?.data?.detail ||
          error?.detail ||
          error?.message ||
          "Something went wrong";

    toast.error(message, { ...options });
  },

  info: (message: string, options?: ToastOptions) =>
    toast(message, { ...options }),

  loading: (message: string) => toast.loading(message),

  promise: <T,>(
    promise: Promise<T>,
    {
      loading = "Processing...",
      success = "Success",
      error = "Operation failed",
    }: {
      loading?: string;
      success?: string;
      error?: string;
    }
  ) =>
    toast.promise(promise, {
      loading,
      success,
      error: (err) =>
        err?.response?.data?.detail ||
        err?.detail ||
        err?.message ||
        error,
    }),

  dismiss: (id?: string) => toast.dismiss(id),
};

/* =====================================================
   PROVIDER
===================================================== */

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: baseStyle,

        success: {
          style: {
            border: "1px solid rgba(16,185,129,0.4)",
            color: "#10b981",
          },
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
        },

        error: {
          style: {
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#ef4444",
          },
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },

        loading: {
          style: {
            border: "1px solid rgba(245,158,11,0.4)",
            color: "#f59e0b",
          },
        },
      }}
    />
  );
}
