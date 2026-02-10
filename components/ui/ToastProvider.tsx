"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: "rgba(10, 24, 54, 0.86)",
          color: "rgba(234,246,255,0.95)",
          border: "1px solid rgba(73,215,255,0.28)",
          boxShadow: "0 0 32px rgba(73,215,255,0.15)",
          borderRadius: "16px",
          backdropFilter: "blur(12px)",
          fontWeight: 600,
          fontSize: "14px",
        },
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
