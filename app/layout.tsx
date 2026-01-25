import "@/styles/globals.css";
import ClientShell from "@/components/layout/ClientShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientShell>
          <main className="pageContentWrap">
            {children}
          </main>
        </ClientShell>
      </body>
    </html>
  );
}
