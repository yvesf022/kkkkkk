"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminUsersAdvancedApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, Btn, Card, Table, TR, TD,
  fmtDateTime, shortId, Skeleton, Empty,
} from "@/components/admin/AdminUI";

type Session = {
  id: string; user_id: string; user_email: string;
  ip_address?: string | null; user_agent?: string | null;
  last_activity: string; created_at: string;
};

export default function AdminSessionsPage() {
  const [sessions,   setSessions]   = useState<Session[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [killing,    setKilling]    = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminUsersAdvancedApi.listSessions(activeOnly);
      setSessions((data as any) || []);
    } catch { toast.error("Failed to load sessions"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [activeOnly]);

  async function killSession(id: string) {
    setKilling(id);
    try {
      await adminUsersAdvancedApi.deleteSession(id);
      toast.success("Session terminated");
      setSessions(s => s.filter(x => x.id !== id));
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setKilling(null); }
  }

  async function killAll() {
    if (!confirm(`Terminate all ${filtered.length} sessions? Users will be logged out.`)) return;
    for (const s of filtered) {
      try { await adminUsersAdvancedApi.deleteSession(s.id); } catch {}
    }
    toast.success("All sessions terminated");
    load();
  }

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    return !search || s.user_email?.toLowerCase().includes(q) || (s.ip_address ?? "").includes(q);
  });

  // Parse UA for a readable label
  function parseUA(ua?: string | null) {
    if (!ua) return "Unknown";
    if (ua.includes("Mobile")) return "Mobile Browser";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    return ua.slice(0, 30) + "…";
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageTitle sub={`${sessions.length} total sessions`}>Active Sessions</PageTitle>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.muted, cursor: "pointer" }}>
            <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} />
            Active only
          </label>
          <input
            placeholder="Search by email or IP…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
              fontSize: 13, outline: "none", width: 220,
            }}
          />
          <Btn variant="ghost" onClick={load} small>↺ Refresh</Btn>
          {filtered.length > 0 && (
            <Btn variant="danger" small onClick={killAll}>Kill All ({filtered.length})</Btn>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Sessions",  value: sessions.length },
          { label: "Unique Users",    value: new Set(sessions.map(s => s.user_id)).size },
          { label: "Unique IPs",      value: new Set(sessions.map(s => s.ip_address).filter(Boolean)).size },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "14px 20px", flex: 1, minWidth: 140,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: 0.6 }}>{stat.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginTop: 4 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <Card>
        {loading ? <Skeleton /> : filtered.length === 0 ? <Empty message="No sessions found." /> : (
          <Table headers={["User", "IP Address", "Browser", "Started", "Last Active", ""]}>
            {filtered.map(s => (
              <TR key={s.id}>
                <TD>
                  <Link href={`/admin/users/${s.user_id}`} style={{ color: C.accent, fontWeight: 600, textDecoration: "none", fontSize: 13 }}>
                    {s.user_email}
                  </Link>
                </TD>
                <TD mono muted>{s.ip_address || "Unknown"}</TD>
                <TD muted>{parseUA(s.user_agent)}</TD>
                <TD muted>{fmtDateTime(s.created_at)}</TD>
                <TD muted>{fmtDateTime(s.last_activity)}</TD>
                <TD>
                  <Btn small variant="danger" disabled={killing === s.id} onClick={() => killSession(s.id)}>
                    {killing === s.id ? "…" : "Kill"}
                  </Btn>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}