"use client";

import { useEffect, useState } from "react";
import { notificationsApi } from "@/lib/api";
import type { Notification, NotificationType } from "@/lib/types";

const typeConfig: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  order_status:   { icon: "📦", color: "#1e40af", bg: "#dbeafe" },
  payment_status: { icon: "💳", color: "#166534", bg: "#dcfce7" },
  product_restock:{ icon: "🔔", color: "#92400e", bg: "#fef3c7" },
  promotion:      { icon: "🎉", color: "#7c3aed", bg: "#ede9fe" },
  system:         { icon: "⚙️", color: "#475569", bg: "#f1f5f9" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    try {
      const data = await notificationsApi.list() as any;
      setNotifications(data ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); }

  async function handleMarkRead(id: string) {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      flash("All notifications marked as read");
    } catch (e: any) {
      flash(e?.message ?? "Failed", false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      flash(e?.message ?? "Failed to delete", false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) return <div style={{ color: "#64748b" }}>Loading notifications...</div>;

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Notifications</h1>
          {unreadCount > 0 && (
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={ghostBtn}>
            ✓ Mark all as read
          </button>
        )}
      </div>

      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid", fontSize: 14, marginBottom: 16, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b" }}>
          {msg.text}
        </div>
      )}

      {notifications.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>All caught up!</div>
          <div style={{ color: "#94a3b8", fontSize: 14 }}>No notifications yet.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {notifications.map((n, i) => {
            const cfg = typeConfig[n.type] ?? typeConfig.system;
            return (
              <div
                key={n.id}
                style={{
                  display: "flex", gap: 14, padding: "16px 20px", alignItems: "flex-start",
                  borderBottom: i < notifications.length - 1 ? "1px solid #f1f5f9" : "none",
                  background: n.is_read ? "#fff" : "#f8faff",
                  transition: "background 0.2s",
                }}
              >
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: n.is_read ? 600 : 800, fontSize: 14, color: "#0f172a" }}>{n.title}</span>
                    <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                      {n.type.replace("_", " ")}
                    </span>
                    {!n.is_read && (
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "#475569", margin: "0 0 6px", lineHeight: 1.5 }}>{n.message}</p>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {new Date(n.created_at).toLocaleString()}
                    {n.is_read && n.read_at && ` · Read ${new Date(n.read_at).toLocaleDateString()}`}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      title="Mark as read"
                      style={{ ...iconBtn, color: "#3b82f6" }}
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    title="Delete"
                    style={{ ...iconBtn, color: "#94a3b8" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ghostBtn: React.CSSProperties = { background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569" };
const iconBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" };