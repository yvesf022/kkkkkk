"use client";

import { useEffect, useState } from "react";
import AccountSidebar from "@/components/account/AccountSidebar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* -----------------------
     MOBILE DETECTION
  ----------------------- */
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        maxWidth: 1200,
        margin: "40px auto",
        padding: "0 24px",
        gap: 48,
        width: "100%",
      }}
    >
      {/* =====================
          MOBILE OVERLAY
      ===================== */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.4)",
            zIndex: 40,
          }}
        />
      )}

      {/* =====================
          SIDEBAR
      ===================== */}
      {(!isMobile || sidebarOpen) && (
        <aside
          style={{
            width: 260,
            flexShrink: 0,
            background: "#ffffff",
            borderRight: "1px solid #e5e7eb",
            position: isMobile ? "fixed" : "static",
            inset: isMobile ? "0 auto 0 0" : undefined,
            zIndex: 50,
            height: isMobile ? "100vh" : "auto",
          }}
        >
          <AccountSidebar
            isMobile={isMobile}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>
      )}

      {/* =====================
          MAIN CONTENT
      ===================== */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* MOBILE MENU BUTTON */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 10,
              fontWeight: 800,
              border: "1px solid rgba(0,0,0,.15)",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            ☰ Account menu
          </button>
        )}

        {children}
      </main>
    </div>
  );
}
