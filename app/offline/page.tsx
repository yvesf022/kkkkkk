export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#F8FAFC",
        fontFamily: "'Sora', -apple-system, sans-serif",
        textAlign: "center",
        padding: "40px 24px",
        gap: 20,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>

      {/* Animated icon */}
      <div style={{ fontSize: 72, animation: "float 3s ease-in-out infinite" }}>
        📶
      </div>

      {/* K logo */}
      <div
        style={{
          width: 64, height: 64, borderRadius: 16,
          background: "linear-gradient(135deg, #0033a0, #009543)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, fontWeight: 900, color: "#fff",
          boxShadow: "0 8px 24px rgba(0,51,160,.3)",
        }}
      >
        K
      </div>

      <div style={{ maxWidth: 360 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>
          You're offline
        </h1>
        <p style={{ fontSize: 15, color: "#64748B", lineHeight: 1.7 }}>
          It looks like you've lost your internet connection.
          Check your network and try again — your cart and browsing history are saved.
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "13px 32px", borderRadius: 10,
          background: "#1E3A8A", color: "#fff",
          border: "none", fontWeight: 700, fontSize: 15,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 4px 14px rgba(30,58,138,.3)",
        }}
      >
        Try again
      </button>

      <a
        href="/store"
        style={{ fontSize: 13, color: "#94A3B8", textDecoration: "underline" }}
      >
        Browse cached pages
      </a>
    </div>
  );
}