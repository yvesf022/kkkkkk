"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminUsersAdvancedApi } from "@/lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      // Fetch user from list endpoint
      const users = await fetch(`${API_BASE}/api/admin/users`, {
        credentials: "include",
      }).then(res => res.json());

      const found = users.find((u: any) => u.id === id);
      setUser(found);

      const act = await adminUsersAdvancedApi.getActivity(id);
      setActivity(act || [] as any || []);

      const sess = await adminUsersAdvancedApi.listSessions(false);
      const userSessions = ((sess as any[]) || []).filter((s: any) => s.user_id === id);
      setSessions(userSessions);

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function disableUser() {
    await fetch(`${API_BASE}/api/admin/users/${id}/disable`, {
      method: "POST",
      credentials: "include",
    });
    load();
  }

  async function enableUser() {
    await fetch(`${API_BASE}/api/admin/users/${id}/enable`, {
      method: "POST",
      credentials: "include",
    });
    load();
  }

  async function forcePasswordReset() {
    const reason = prompt("Reason for forced password reset?");
    if (!reason) return;

    await adminUsersAdvancedApi.forcePasswordReset(id, reason);
    alert("Password reset forced.");
  }

  async function hardDelete() {
    if (!confirm("Hard delete this user?")) return;
    await adminUsersAdvancedApi.hardDelete(id);
    alert("User deleted");
  }

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div style={{ padding: 30, display: "flex", flexDirection: "column", gap: 30 }}>

      <h1>User: {user.email}</h1>

      {/* USER INFO */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <p><strong>Name:</strong> {user.full_name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Status:</strong> {user.is_active ? "Active" : "Disabled"}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
      </div>

      {/* GOVERNANCE ACTIONS */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Governance Actions</h3>
        <div style={{ display: "flex", gap: 10 }}>
          {user.is_active ? (
            <button onClick={disableUser}>Disable</button>
          ) : (
            <button onClick={enableUser}>Enable</button>
          )}

          <button onClick={forcePasswordReset}>
            Force Password Reset
          </button>

          <button onClick={hardDelete} style={{ color: "red" }}>
            Hard Delete
          </button>
        </div>
      </div>

      {/* USER ACTIVITY */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>User Activity</h3>
        {activity.length === 0 && <div>No activity</div>}
        {activity.map((a, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div>{a.action}</div>
            <small>{new Date(a.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>

      {/* SESSIONS */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Sessions</h3>
        {sessions.length === 0 && <div>No sessions</div>}
        {sessions.map((s) => (
          <div key={s.id} style={{ marginBottom: 10 }}>
            <div>IP: {s.ip_address}</div>
            <small>
              Started: {new Date(s.created_at).toLocaleString()}
            </small>
          </div>
        ))}
      </div>

    </div>
  );
}

