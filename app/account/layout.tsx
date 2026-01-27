"use client";

import { ReactNode } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import AccountSidebar from "@/components/account/AccountSidebar";

export default function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAuth role="user" allowDuringHydration>
      {(authReady: boolean) => (
        <div
          style={{
            display: "flex",
            minHeight: "calc(100vh - 80px)",
            background: "#f8fafc",
          }}
        >
          {/* SIDEBAR */}
          {authReady ? (
            <AccountSidebar />
          ) : (
            <div
              style={{
                width: 260,
                background: "#f1f5f9",
              }}
            />
          )}

          {/* MAIN */}
          <main
            style={{
              flex: 1,
              padding: "32px 40px",
              background: "#f8fafc",
            }}
          >
            {authReady ? (
              children
            ) : (
              <AccountSkeleton />
            )}
          </main>
        </div>
      )}
    </RequireAuth>
  );
}

/* ======================
   SKELETON
====================== */
function AccountSkeleton() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          width: 240,
          height: 28,
          borderRadius: 8,
          background: "#e5e7eb",
        }}
      />
      <div
        style={{
          width: "100%",
          height: 140,
          borderRadius: 16,
          background: "#e5e7eb",
        }}
      />
      <div
        style={{
          width: "100%",
          height: 220,
          borderRadius: 16,
          background: "#e5e7eb",
        }}
      />
    </div>
  );
}
