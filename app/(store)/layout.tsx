import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div style={{ display: "flex" }}>
        <Sidebar /> {/* Sub-Stores */}
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </>
  );
}
