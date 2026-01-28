"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { logout } from "@/lib/auth";

export default function SecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (!confirm("Are you sure you want to log out?")) return;

    setLoading(true);
    try {
      await logout();
      toast.success("You have been logged out");
      router.replace("/login");
    } catch {
      toast.error("Failed to log out");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pageContentWrap">
      {/* PAGE HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div className="mutedText">Account › Security</div>
        <h1 className="pageTitle">Security</h1>
        <p className="pageSubtitle">
          Manage your account security and active sessions.
        </p>
      </div>

      {/* SECURITY OVERVIEW */}
      <div className="infoBox">
        🔒 <strong>Your account is protected.</strong>
        <br />
        We use secure authentication and HTTP-only cookies. Sensitive
        actions always require verification.
      </div>

      {/* SECURITY SETTINGS */}
      <section className="card" style={{ marginTop: 28 }}>
        <h2 className="sectionTitle">Account access</h2>

        {/* PASSWORD */}
        <div className="settingsRow">
          <div>
            <strong>Password</strong>
            <p className="mutedText">
              Password changes will be available soon.
            </p>
          </div>
          <button className="btn btnGhost" disabled>
            Change password
          </button>
        </div>

        <hr className="divider" />

        {/* SESSIONS */}
        <div className="settingsRow">
          <div>
            <strong>Active sessions</strong>
            <p className="mutedText">
              You are currently logged in on this device. Session
              management across devices will be available soon.
            </p>
          </div>
          <button className="btn btnGhost" disabled>
            Log out from all sessions
          </button>
        </div>
      </section>

      {/* LOGOUT */}
      <section className="card" style={{ marginTop: 32 }}>
        <h2 className="sectionTitle">Sign out</h2>
        <p className="mutedText">
          Signing out will end your current session and redirect you to
          the login page.
        </p>

        <button
          className="btn btnDanger"
          style={{ marginTop: 16 }}
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? "Signing out…" : "Log out"}
        </button>
      </section>
    </div>
  );
}
