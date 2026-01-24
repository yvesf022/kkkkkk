"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 2400,
        style: {
          background: "rgba(10, 24, 54, 0.86)",
          color: "rgba(234,246,255,0.95)",
          border: "1px solid rgba(73,215,255,0.28)",
          boxShadow: "0 0 32px rgba(73,215,255,0.15)",
          borderRadius: "16px",
          backdropFilter: "blur(12px)",
        },
      }}
    />
  );
}
