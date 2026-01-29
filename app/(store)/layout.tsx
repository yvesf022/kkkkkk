import Sidebar from "@/components/layout/Sidebar";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar /> {/* Sub-Stores — STORE ONLY */}
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
