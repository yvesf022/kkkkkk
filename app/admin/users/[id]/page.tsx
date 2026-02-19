"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, adminUsersAdvancedApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, Badge, Btn, Card, CardHeader, Modal, Input, Select,
  fmtDateTime, shortId, Skeleton,
} from "@/components/admin/AdminUI";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;

  const [user,       setUser]       = useState<any>(null);
  const [activity,   setActivity]   = useState<any[]>([]);
  const [sessions,   setSessions]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roleModal,  setRoleModal]  = useState(false);
  const [newRole,    setNewRole]    = useState("user");
  const [resetModal, setResetModal] = useState(false);
  const [resetReason,setResetReason]= useState("");
  const [delModal,   setDelModal]   = useState(false);

  async function load() {
    try {
      const [users, act, sess] = await Promise.allSettled([
        adminApi.listUsers(),
        adminUsersAdvancedApi.getActivity(id),
        adminUsersAdvancedApi.listSessions(false),
      ]);
      if (users.status === "fulfilled") {
        const found = ((users.value as any[]) ?? []).find((u: any) => u.id === id);
        setUser(found ?? null);
      }
      if (act.status === "fulfilled") setActivity((act.value as any[]) ?? []);
      if (sess.status === "fulfilled") {
        setSessions(((sess.value as any[]) ?? []).filter((s: any) => s.user_id === id));
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function toggleActive() {
    if (!user) return;
    setSubmitting(true);
    try {
      if (user.is_active) { await adminApi.disableUser(id); toast.success("User disabled"); }
      else                { await adminApi.enableUser(id);  toast.success("User enabled"); }
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function changeRole() {
    setSubmitting(true);
    try {
      await adminApi.changeUserRole(id, newRole);
      toast.success("Role updated");
      setRoleModal(false); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function forceReset() {
    if (!resetReason.trim()) { toast.error("Reason required"); return; }
    setSubmitting(true);
    try {
      await adminUsersAdvancedApi.forcePasswordReset(id, resetReason);
      toast.success("Password reset forced");
      setResetModal(false); setResetReason("");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function hardDelete() {
    setSubmitting(true);
    try {
      await adminUsersAdvancedApi.hardDelete(id);
      toast.success("User permanently deleted");
      router.replace("/admin/users");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function killSession(sessionId: string) {
    try {
      await adminUsersAdvancedApi.deleteSession(sessionId);
      toast.success("Session terminated");
      setSessions(s => s.filter(x => x.id !== sessionId));
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  if (loading) return <div style={{ padding: 20 }}><Skeleton rows={8} /></div>;
  if (!user) return (
    <div style={{ padding: 40, textAlign: "center", color: C.faint }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>◎</div>
      <div>User not found</div>
      <Link href="/admin/users"><Btn style={{ marginTop: 16 }}>← Back to Users</Btn></Link>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 13, color: C.muted }}>
        <Link href="/admin/users" style={{ color: C.accent, textDecoration: "none" }}>Customers</Link>
        <span style={{ margin: "0 8px" }}>›</span>
        <span>{user.full_name || user.email}</span>
      </div>

      {/* Header card */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.navy}, ${C.green})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 22, fontWeight: 800,
            }}>
              {(user.full_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{user.full_name || "No Name"}</h2>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>{user.email}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Badge status={user.role} />
                <Badge status={user.is_active ? "active" : "inactive"} label={user.is_active ? "Active" : "Disabled"} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant={user.is_active ? "warning" : "success"} disabled={submitting} onClick={toggleActive}>
              {user.is_active ? "Disable Account" : "Enable Account"}
            </Btn>
            <Btn onClick={() => { setRoleModal(true); setNewRole(user.role); }}>Change Role</Btn>
            <Btn onClick={() => setResetModal(true)}>Force Password Reset</Btn>
            <Btn variant="danger" onClick={() => setDelModal(true)}>Delete</Btn>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>

        {/* Left: profile info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <CardHeader title="Profile" />
            {[
              ["User ID",    shortId(user.id)],
              ["Phone",      user.phone || "—"],
              ["Role",       user.role],
              ["Status",     user.is_active ? "Active" : "Disabled"],
              ["Email Verified", user.email_verified ? "Yes" : "No"],
              ["Joined",     fmtDateTime(user.created_at)],
              ["Last Login", fmtDateTime(user.last_login) || "Never"],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, gap: 12 }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, color: C.text, textAlign: "right", wordBreak: "break-all" }}>{val}</span>
              </div>
            ))}
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader title={`Sessions (${sessions.length})`} />
            {sessions.length === 0
              ? <div style={{ color: C.faint, fontSize: 13, textAlign: "center", padding: "16px 0" }}>No active sessions</div>
              : sessions.map(s => (
                <div key={s.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>IP: {s.ip_address || "Unknown"}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtDateTime(s.created_at)}</div>
                  </div>
                  <Btn small variant="danger" onClick={() => killSession(s.id)}>Kill</Btn>
                </div>
              ))
            }
          </Card>
        </div>

        {/* Right: activity feed */}
        <Card>
          <CardHeader title={`Activity Log (${activity.length})`} />
          {activity.length === 0
            ? <div style={{ color: C.faint, fontSize: 13, textAlign: "center", padding: "32px 0" }}>No activity recorded</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {activity.map((a, i) => (
                  <div key={i} style={{
                    padding: "14px 0",
                    borderBottom: i < activity.length - 1 ? `1px solid ${C.border}` : "none",
                    display: "flex", gap: 14, alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", background: C.accent,
                      marginTop: 5, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>
                        {a.action?.replace(/_/g, " ") ?? "Action"}
                      </div>
                      {a.entity_type && (
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                          {a.entity_type} {a.entity_id ? `· ${shortId(a.entity_id)}` : ""}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{fmtDateTime(a.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Card>
      </div>

      {/* Change Role Modal */}
      <Modal open={roleModal} onClose={() => setRoleModal(false)} title="Change Role" width={340}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="New Role" value={newRole} onChange={e => setNewRole(e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => setRoleModal(false)}>Cancel</Btn>
            <Btn variant="primary" disabled={submitting} onClick={changeRole}>{submitting ? "Saving…" : "Update"}</Btn>
          </div>
        </div>
      </Modal>

      {/* Force Reset Modal */}
      <Modal open={resetModal} onClose={() => setResetModal(false)} title="Force Password Reset" width={380}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Reason (required)" value={resetReason} onChange={e => setResetReason(e.target.value)} placeholder="Reason for reset…" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => setResetModal(false)}>Cancel</Btn>
            <Btn variant="warning" disabled={submitting || !resetReason.trim()} onClick={forceReset}>
              {submitting ? "Forcing…" : "Force Reset"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={delModal} onClose={() => setDelModal(false)} title="Delete User Permanently" width={400}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 14 }}>
            <strong style={{ color: C.danger }}>⚠ Cannot be undone</strong>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>
              All data for <strong>{user.email}</strong> will be permanently erased.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => setDelModal(false)}>Cancel</Btn>
            <Btn variant="danger" disabled={submitting} onClick={hardDelete}>
              {submitting ? "Deleting…" : "Delete Forever"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}