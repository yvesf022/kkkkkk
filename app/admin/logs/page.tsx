"use client";

/**
 * FIX: <TD muted style={{ textTransform: "capitalize" }}> — TD doesn't accept `style` prop.
 * Fixed: <TD muted><span style={{ textTransform: "capitalize" }}>…</span></TD>
 */

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, Btn, Card, Table, TR, TD,
  fmtDateTime, shortId, Skeleton, Empty,
} from "@/components/admin/AdminUI";

type Log = {
  id: string; entity_type: string; entity_id: string; action: string;
  user_id?: string | null; user_email?: string | null;
  changes?: Record<string, any> | null; ip_address?: string | null;
  created_at: string;
};

const ACTION_COLORS: Record<string, { bg: string; fg: string }> = {
  create:   { bg: "#dcfce7", fg: "#15803d" },
  created:  { bg: "#dcfce7", fg: "#15803d" },
  update:   { bg: "#dbeafe", fg: "#1d4ed8" },
  updated:  { bg: "#dbeafe", fg: "#1d4ed8" },
  delete:   { bg: "#fee2e2", fg: "#dc2626" },
  deleted:  { bg: "#fee2e2", fg: "#dc2626" },
  login:    { bg: "#f0fdf4", fg: "#16a34a" },
  logout:   { bg: "#f8fafc", fg: "#64748b" },
  approve:  { bg: "#dcfce7", fg: "#15803d" },
  reject:   { bg: "#fee2e2", fg: "#dc2626" },
  cancel:   { bg: "#fef9c3", fg: "#a16207" },
};

function actionStyle(action: string): { bg: string; fg: string } {
  const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : { bg: "#f8fafc", fg: "#475569" };
}

export default function AdminLogsPage() {
  const [logs,     setLogs]     = useState<Log[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [type,     setType]     = useState("");
  const [selected, setSelected] = useState<Log | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs();
      setLogs((data as any) || []);
    } catch { toast.error("Failed to load logs"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const entityTypes = [...new Set(logs.map(l => l.entity_type))].filter(Boolean);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      (l.user_email ?? "").toLowerCase().includes(q) ||
      (l.entity_id ?? "").includes(q);
    const matchType = !type || l.entity_type === type;
    return matchSearch && matchType;
  });

  return (
    <div style={{ maxWidth: 1300 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageTitle sub="Complete audit trail of all admin actions">Audit Logs</PageTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="Search actions, users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
              fontSize: 13, outline: "none", width: 200,
            }}
          />
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
              fontSize: 13, outline: "none",
            }}
          >
            <option value="">All types</option>
            {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Btn small onClick={load}>↺ Refresh</Btn>
        </div>
      </div>

      <Card>
        {loading ? <Skeleton /> : filtered.length === 0 ? <Empty message="No logs found." /> : (
          <Table headers={["Action", "Entity", "Entity ID", "User", "IP", "Time", ""]}>
            {filtered.map(l => {
              const as = actionStyle(l.action);
              return (
                <TR key={l.id} onClick={() => setSelected(l)}>
                  <TD>
                    <span style={{
                      display: "inline-block", padding: "3px 10px", borderRadius: 99,
                      fontSize: 11, fontWeight: 700, background: as.bg, color: as.fg,
                    }}>
                      {l.action}
                    </span>
                  </TD>
                  {/* FIX: TD doesn't accept `style` prop — wrap content in span */}
                  <TD muted>
                    <span style={{ textTransform: "capitalize" }}>
                      {l.entity_type?.replace(/_/g, " ")}
                    </span>
                  </TD>
                  <TD mono muted>{shortId(l.entity_id)}</TD>
                  <TD muted>{l.user_email ?? shortId(l.user_id) ?? "System"}</TD>
                  <TD mono muted>{l.ip_address || "—"}</TD>
                  <TD muted>{fmtDateTime(l.created_at)}</TD>
                  <TD><span style={{ color: C.accent, fontSize: 12 }}>›</span></TD>
                </TR>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Detail modal */}
      {selected && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 560,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Log Detail</h3>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: C.muted }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Log ID",      shortId(selected.id)],
                ["Action",      selected.action],
                ["Entity Type", selected.entity_type],
                ["Entity ID",   selected.entity_id],
                ["User",        selected.user_email ?? shortId(selected.user_id) ?? "System"],
                ["IP Address",  selected.ip_address || "—"],
                ["Timestamp",   fmtDateTime(selected.created_at)],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, paddingBottom: 8, gap: 12 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 13, color: C.text, textAlign: "right", wordBreak: "break-all" }}>{val}</span>
                </div>
              ))}
              {selected.changes && Object.keys(selected.changes).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>Changes</div>
                  <pre style={{
                    background: "#f8fafc", borderRadius: 8, padding: 12,
                    fontSize: 11, overflow: "auto", maxHeight: 200,
                    border: `1px solid ${C.border}`, margin: 0,
                  }}>{JSON.stringify(selected.changes, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}