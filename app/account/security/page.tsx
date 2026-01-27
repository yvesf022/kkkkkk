"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

/*
  NOTE:
  Password change & session APIs are not implemented yet.
  This page is UX-complete and ready to wire later.
*/

export default function SecurityPage() {
  const logout = useAuth((s) => s.logout);
  const [loading, setLoading] = useState(false);

  function handlePasswordChange() {
    toast("Password change will be available soon");
  }

  function handleLogoutAll() {
    toast("All sessions will be logged out soon");
  }

  function handleLogout() {
    setLoading(true);

    // 🔐 Only change auth state.
    // Redirect is handled globally by RequireAuth in layout.
    logout();
  }

  return (
    <div style={{ maxWidth: 720, display: "grid", gap: 24 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Security
        </h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Manage your account security and sessions
        </p>
      </header>

      {/* CONTENT */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 22,
          padding: 24,
          display: "grid",
          gap: 18,
        }}
      >
        {/* CHANGE PASSWORD */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 900 }}>
            Change Password
          </h3>
          <p
            style={{
              fontSize: 13,
              opacity: 0.6,
              marginTop: 4,
            }}
          >
            Update your password regularly to keep your
            account secure.
          </p>

          <button
            className="btn btnTech"
            style={{ marginTop: 12 }}
            onClick={handlePasswordChange}
          >
            Change Password
          </button>
        </div>

        <hr />

        {/* LOGOUT ALL */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 900 }}>
            Active Sessions
          </h3>
          <p
            style={{
              fontSize: 13,
              opacity: 0.6,
              marginTop: 4,
            }}
          >
            Log out from all devices and browsers.
          </p>

          <button
            className="btn btnGhost"
            style={{ marginTop: 12 }}
            onClick={handleLogoutAll}
          >
            Log out from all sessions
          </button>
        </div>

        <hr />

        {/* LOGOUT */}
        <div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: "#991b1b",
            }}
          >
            Log Out
          </h3>
          <p
            style={{
              fontSize: 13,
              opacity: 0.6,
              marginTop: 4,
            }}
          >
            End your current session on this device.
          </p>

          <button
            onClick={handleLogout}
            disabled={loading}
            style={{
              marginTop: 12,
              padding: "10px 16px",
              borderRadius: 12,
              fontWeight: 900,
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              cursor: "pointer",
            }}
          >
            {loading ? "Logging out…" : "Log out"}
          </button>
        </div>
      </section>
    </div>
  );
}
