"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const loading = useAuth((s) => s.loading);

  return (
    <RequireAuth role="user">
      <div
        className="appShell"
        style={{
          display: "flex",
          width: "100%",
          minHeight: "calc(100vh - var(--header-height, 72px))",
        }}
      >
        {/* SIDEBAR */}
        <Sidebar />

        {/* MAIN CONTENT */}
        <main
          className="pageContentWrap"
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          {loading ? (
            <div
              style={{
                padding: 24,
                fontSize: 14,
                opacity: 0.65,
              }}
            >
              Loading your session…
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
