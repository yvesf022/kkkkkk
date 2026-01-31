import Sidebar from "@/components/layout/Sidebar";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Store Sidebar */}
      <Sidebar />

      {/* Store Content */}
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
