"use client";

import AccountSidebar from "@/components/account/AccountSidebar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🔐 AUTH IS HANDLED BY MIDDLEWARE
  // DO NOT guard again here

  return (
    <div
      style={{
        display: "flex",
        gap: 48,
        maxWidth: 1200,
        margin: "40px auto",
        padding: "0 24px",
        alignItems: "flex-start",
      }}
    >
      <AccountSidebar />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
