"use client";

import { useEffect, useState } from "react";
import { notificationsApi } from "@/lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try { const data = await notificationsApi.list() as any; setNotifications(data ?? []); }
    catch { setNotifications([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(null), 3000); }

  async function markRead(id: string) {
    try { await notificationsApi.markRead(id); load(); }
    catch {}
  }

  async function markAllRead() {
    try { await notificationsApi.markAllRead(); load(); flash("All marked as read"); }
    catch (e: any) { flash(e?.message ?? "Failed"); }
  }

  async function del(id: string) {
    try { await notificationsApi.delete(id); load(); }
    catch {}
  }

  const unread = notifications.filter((n: any) => !n.is_read).length;

  if (loading) return <div style={{ color: "#64748b" }}>Loading notifications...</div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>Notifications</h1>
          {unread > 0 && <span style={{ fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>{unread} unread</span>}
        </div>
        {unread > 0 && <button onClick={markAllRead} style={btn}>Mark all as read</button>}
      </div>

      {msg && <div style={{ padding: "10px 16px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: 14, marginBottom: 16 }}>{msg}</div>}

      {notifications.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔔</div>
          <div style={{ color: "#64748b" }}>No notifications yet.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {notifications.map((n: any) => (
            <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
              style={{ ...card, background: n.is_read ? "#fff" : "#eff6ff", borderColor: n.is_read ? "#e2e8f0" : "#bfdbfe", cursor: n.is_read ? "default" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", marginBottom: 6 }} />}
                <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 14, marginBottom: 4 }}>{n.title ?? n.message}</div>
                {n.title && n.message && <div style={{ fontSize: 13, color: "#64748b" }}>{n.message}</div>}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); del(n.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 13 };