"use client";

import Link from "next/link";

const sections = [
  {
    title: "My Orders",
    desc: "View your past and recent orders",
    href: "/account/orders",
  },
  {
    title: "Addresses",
    desc: "Manage shipping addresses",
    href: "/account/addresses",
  },
  {
    title: "Profile",
    desc: "Update personal information",
    href: "/account/profile",
  },
  {
    title: "Settings",
    desc: "Notifications and preferences",
    href: "/account/settings",
  },
];

export default function AccountPage() {
  return (
    <div style={{ display: "grid", gap: 26 }}>
      {/* ================= HEADER ================= */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: `
            radial-gradient(
              420px 200px at 10% 0%,
              rgba(96,165,250,0.22),
              transparent 60%
            ),
            radial-gradient(
              360px 180px at 90% 10%,
              rgba(244,114,182,0.18),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          My Account
        </h1>

        <p
          style={{
            marginTop: 6,
            fontWeight: 600,
            color: "rgba(15,23,42,0.6)",
          }}
        >
          Manage your orders, profile, and account settings.
        </p>
      </section>

      {/* ================= DASHBOARD ================= */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        {sections.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            style={{
              borderRadius: 22,
              padding: 20,
              textDecoration: "none",
              color: "#0f172a",
              background:
                "linear-gradient(135deg,#ffffff,#f8fbff)",
              boxShadow:
                "0 18px 50px rgba(15,23,42,0.14)",
              display: "grid",
              gap: 8,
              transition: "transform .15s ease, box-shadow .15s ease",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
              }}
            >
              {s.title}
            </div>

            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(15,23,42,0.6)",
              }}
            >
              {s.desc}
            </div>
          </Link>
        ))}
      </section>

      {/* ================= ACTIONS ================= */}
      <section
        style={{
          borderRadius: 24,
          padding: 20,
          background:
            "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow:
            "0 18px 50px rgba(15,23,42,0.14)",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link href="/store" className="btn btnGhost">
          ← Back to Store
        </Link>

        <button
          className="btn btnTech"
          onClick={() => {
            // replace with real logout later
            localStorage.removeItem("token");
            window.location.href = "/";
          }}
        >
          Logout
        </button>
      </section>
    </div>
  );
}
