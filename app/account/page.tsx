import Link from "next/link";

const sections = [
  {
    title: "My Orders",
    desc: "View your past and recent orders",
    href: "/account/orders",
    icon: "📦",
  },
  {
    title: "Addresses",
    desc: "Manage shipping addresses",
    href: "/account/addresses",
    icon: "🏠",
  },
  {
    title: "Profile",
    desc: "Update personal information",
    href: "/account/profile",
    icon: "👤",
  },
  {
    title: "Settings",
    desc: "Notifications, preferences",
    href: "/account/settings",
    icon: "⚙️",
  },
];

export default function AccountPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* HEADER */}
      <div className="glass neon-border" style={{ padding: 18 }}>
        <div className="neon-text" style={{ fontSize: 24, fontWeight: 1000 }}>
          My Account
        </div>

        <div
          style={{
            marginTop: 8,
            color: "var(--muted)",
            fontWeight: 900,
          }}
        >
          Manage your profile, orders, and settings.
        </div>
      </div>

      {/* DASHBOARD */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {sections.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            className="glass neon-border"
            style={{
              padding: 16,
              display: "grid",
              gap: 8,
              cursor: "pointer",
              transition: "transform .15s ease",
            }}
          >
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontWeight: 1000 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: "var(--muted2)" }}>
              {s.desc}
            </div>
          </Link>
        ))}
      </div>

      {/* ACTIONS */}
      <div
        className="glass neon-border"
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Link href="/store" className="btn">
          ← Back to Store
        </Link>

        <button
          className="btn"
          onClick={() => {
            // later: clear auth + redirect
            alert("Logged out (demo)");
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
