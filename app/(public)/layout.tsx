export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 600px at 10% -10%, rgba(0,153,255,.12), transparent 40%)," +
          "radial-gradient(900px 500px at 90% 10%, rgba(255,80,160,.14), transparent 45%)," +
          "linear-gradient(120deg, #eef2f8 0%, #f9fafe 45%, #fff1f6 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
        }}
      >
        {children}
      </div>
    </main>
  );
}
