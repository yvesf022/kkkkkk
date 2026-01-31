import "@/styles/globals.css";

import type { Metadata } from "next";
import ClientShell from "@/components/layout/ClientShell";

export const metadata: Metadata = {
  title: "Karabo Online Store",
  description: "Shop smarter with Karabo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
