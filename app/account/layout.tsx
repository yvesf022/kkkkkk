"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import AccountSidebar from "@/components/account/AccountSidebar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth role="user">
      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 80px)", // keeps space for header
          background: "#f8fafc",
        }}
      >
        {/* SIDEBAR */}
        <AccountSidebar />

        {/* MAIN CONTENT */}
        <main
          style={{
            flex: 1,
            padding: "32px 40px",
            background: "#f8fafc",
          }}
        >
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
