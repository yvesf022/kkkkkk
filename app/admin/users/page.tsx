"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, adminUsersAdvancedApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, Badge, Btn, Card, Table, TR, TD,
  Modal, Input, Tabs, fmtDateTime, shortId, Skeleton, Empty, Select,
} from "@/components/admin/AdminUI";

type User = {
  id: string; email: string; full_name?: string | null;
  role: string; is_active?: boolean; created_at?: string; last_login?: string | null;
};

export default function AdminUsersPage() {
  const [users,      setUsers]      = useState<User[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [tab,        setTab]        = useState("all");
  const [roleModal,  setRoleModal]  = useState<User | null>(null);
  const [newRole,    setNewRole]    = useState("user");
  const [submitting, setSubmitting] = useState(false);
  const [delModal,   setDelModal]   = useState<User | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.listUsers();
      // FIX #9: API may return { users: [] } or { results: [] } — not a plain array.
      // Calling .filter() on a plain object throws "data.filter is not a function"
      // which Next.js catches and surfaces as "client-side exception".
      const raw = data as any;
      setUsers(Array.isArray(raw) ? raw : raw?.users ?? raw?.results ?? []);
    } catch (e: any) {
      // FIX #9 + #10: 401 means session expired — redirect to admin login
      if (e?.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      toast.error(e?.message ?? "Failed to load users");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(u: User) {
    try {
      if (u.is_active) {
        await adminApi.disableUser(u.id);
        toast.success(`${u.email} disabled`);
      } else {
        await adminApi.enableUser(u.id);
        toast.success(`${u.email} enabled`);
      }
      load();
    } catch (e: any) { toast.error(e.message ?? "Action failed"); }
  }

  async function changeRole() {
    if (!roleModal) return;
    setSubmitting(true);
    try {
      await adminApi.changeUserRole(roleModal.id, newRole);
      toast.success("Role updated");
      setRoleModal(null); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function hardDelete() {
    if (!delModal) return;
    setSubmitting(true);
    try {
      await adminUsersAdvancedApi.hardDelete(delModal.id);
      toast.success("User deleted");
      setDelModal(null); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function forcePasswordReset(u: User) {
    const reason = prompt(`Reason for forcing password reset for ${u.email}?`);
    if (!reason) return;
    try {
      await adminUsersAdvancedApi.forcePasswordReset(u.id, reason);
      toast.success("Password reset forced");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.email.includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
    const matchTab = tab === "all" || (tab === "active" && u.is_active) || (tab === "disabled" && !u.is_active) || (tab === u.role);
    return matchSearch && matchTab;
  });

  const counts = {
    all:      users.length,
    active:   users.filter(u => u.is_active).length,
    disabled: users.filter(u => !u.is_active).length,
    user:     users.filter(u => u.role === "user").length,
    admin:    users.filter(u => u.role === "admin").length,
  };

  return (
    <div style={{ maxWidth: 1300 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageTitle sub={`${counts.all} total customers`}>Customers</PageTitle>
        <input
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
            fontSize: 13, outline: "none", width: 240,
          }}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { label: "All",      value: "all",      count: counts.all },
          { label: "Active",   value: "active",   count: counts.active },
          { label: "Disabled", value: "disabled", count: counts.disabled },
          { label: "Admins",   value: "admin",    count: counts.admin },
        ]}
      />

      <Card>
        {loading ? <Skeleton /> : filtered.length === 0 ? <Empty message="No users found." /> : (
          <Table headers={["Customer", "Role", "Status", "Joined", "Last Login", "Actions"]}>
            {filtered.map(u => (
              <TR key={u.id}>
                <TD>
                  <div>
                    <Link href={`/admin/users/${u.id}`} style={{ color: C.accent, fontWeight: 600, textDecoration: "none", fontSize: 13 }}>
                      {u.full_name || "—"}
                    </Link>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{u.email}</div>
                  </div>
                </TD>
                <TD><Badge status={u.role} label={u.role} /></TD>
                <TD><Badge status={u.is_active ? "active" : "inactive"} label={u.is_active ? "Active" : "Disabled"} /></TD>
                <TD muted>{fmtDateTime(u.created_at)}</TD>
                <TD muted>{fmtDateTime(u.last_login) || "Never"}</TD>
                <TD>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Link href={`/admin/users/${u.id}`}><Btn small>View</Btn></Link>
                    <Btn small variant={u.is_active ? "warning" : "success"} onClick={() => toggleActive(u)}>
                      {u.is_active ? "Disable" : "Enable"}
                    </Btn>
                    <Btn small onClick={() => { setRoleModal(u); setNewRole(u.role); }}>Role</Btn>
                    <Btn small variant="danger" onClick={() => setDelModal(u)}>Delete</Btn>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </Card>

      {/* Change role modal */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title="Change User Role" width={360}>
        {roleModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Changing role for <strong>{roleModal.email}</strong></p>
            <Select label="New Role" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn onClick={() => setRoleModal(null)}>Cancel</Btn>
              <Btn variant="primary" disabled={submitting} onClick={changeRole}>
                {submitting ? "Saving…" : "Update Role"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Hard delete confirm modal */}
      <Modal open={!!delModal} onClose={() => setDelModal(null)} title="Delete User" width={380}>
        {delModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 14 }}>
              <strong style={{ color: C.danger }}>⚠ This is irreversible</strong>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>
                All data associated with <strong>{delModal.email}</strong> will be permanently deleted.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn onClick={() => setDelModal(null)}>Cancel</Btn>
              <Btn variant="danger" disabled={submitting} onClick={hardDelete}>
                {submitting ? "Deleting…" : "Delete Permanently"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}