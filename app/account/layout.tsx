import Header from "@/components/layout/Header";
import AccountSidebar from "@/components/account/AccountSidebar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div
        style={{
          display: "flex",
          gap: 40,
          maxWidth: 1200,
          margin: "40px auto",
          padding: "0 24px",
        }}
      >
        <AccountSidebar />
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </>
  );
}
