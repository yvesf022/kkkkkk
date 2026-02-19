"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import toast from "react-hot-toast";

type Log = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id?: string | null;
  user_email?: string | null;
  changes?: Record<string, any> | null;
  ip_address?: string | null;
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
  const key = Object.keys(ACTION_COLORS).find((k) =>
    action.toLowerCase().includes(k)
  );
  return key ? ACTION_COLORS[key] : { bg: "#f1f5f9", fg: "#475569" };
}

function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.length > 12 ? id.slice(0, 8) + "…" : id;
}

function fmtDateTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return ts;
  }
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
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const entityTypes = [...new Set(logs.map((l) => l.entity_type))].filter(Boolean);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      (l.user_email ?? "").toLowerCase().includes(q) ||
      (l.entity_id ?? "").includes(q);
    const matchType = !type || l.entity_type === type;
    return matchSearch && matchType;
  });

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 1300 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", margin: 0 }}>Audit Logs</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Complete audit trail of all admin actions</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }}>⌕</span>
            <input
              placeholder="Search actions, users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "8px 12px 8px 30px",
                borderRadius: 8, border: "1px solid #e2e8f0",
                fontSize: 13, outline: "none", width: 210,
                background: "#fff", color: "#0f172a",
              }}
            />
          </div>

          {/* Type filter */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 8,
              border: "1px solid #e2e8f0", fontSize: 13,
              outline: "none", background: "#fff", color: "#0f172a",
            }}
          >
            <option value="">All types</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#fff",
              color: "#374151", fontSize: 13, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {!loading && logs.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Total Logs",   value: logs.length },
            { label: "Filtered",     value: filtered.length },
            { label: "Entity Types", value: entityTypes.length },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 16px", minWidth: 110 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 14, borderRadius: 6, background: "#f1f5f9", marginBottom: 14, width: `${90 - (i % 3) * 10}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#475569" }}>No logs found</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
              {search || type ? "Try adjusting your filters" : "No audit logs yet"}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  {["Action", "Entity Type", "Entity ID", "User", "IP Address", "Time", ""].map((h) => (
                    <th key={h} style={{
                      padding: "11px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: "#475569",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const as = actionStyle(l.action);
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelected(l)}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      {/* Action badge */}
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px",
                          borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: as.bg, color: as.fg,
                          textTransform: "capitalize",
                        }}>
                          {l.action}
                        </span>
                      </td>

                      {/* Entity type */}
                      <td style={{ padding: "11px 16px", color: "#475569" }}>
                        <span style={{ textTransform: "capitalize" }}>
                          {l.entity_type?.replace(/_/g, " ") ?? "—"}
                        </span>
                      </td>

                      {/* Entity ID */}
                      <td style={{ padding: "11px 16px" }}>
                        <code style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                          {shortId(l.entity_id)}
                        </code>
                      </td>

                      {/* User */}
                      <td style={{ padding: "11px 16px", color: "#374151", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.user_email ?? shortId(l.user_id) ?? (
                          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>System</span>
                        )}
                      </td>

                      {/* IP */}
                      <td style={{ padding: "11px 16px" }}>
                        <code style={{ fontSize: 12, color: "#94a3b8" }}>
                          {l.ip_address || "—"}
                        </code>
                      </td>

                      {/* Time */}
                      <td style={{ padding: "11px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>
                        {fmtDateTime(l.created_at)}
                      </td>

                      {/* View arrow */}
                      <td style={{ padding: "11px 16px", textAlign: "right" }}>
                        <span style={{ color: "#94a3b8", fontSize: 16 }}>›</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Row count footer */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
            Showing {filtered.length} of {logs.length} log{logs.length !== 1 ? "s" : ""}
            {(search || type) && ` (filtered)`}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(3px)",
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 16, padding: 28,
              width: "90%", maxWidth: 540,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              maxHeight: "85vh", overflowY: "auto",
              animation: "fadeUp 0.2s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Log Detail</h3>
                <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {fmtDateTime(selected.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: 18, color: "#64748b", lineHeight: 1, width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
              >×</button>
            </div>

            {/* Action badge */}
            <div style={{ marginBottom: 20 }}>
              {(() => {
                const as = actionStyle(selected.action);
                return (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, background: as.bg, color: as.fg }}>
                    {selected.action}
                  </span>
                );
              })()}
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                ["Log ID",      shortId(selected.id)],
                ["Entity Type", selected.entity_type?.replace(/_/g, " ")],
                ["Entity ID",   selected.entity_id],
                ["User",        selected.user_email ?? shortId(selected.user_id) ?? "System"],
                ["IP Address",  selected.ip_address || "—"],
                ["Timestamp",   fmtDateTime(selected.created_at)],
              ].map(([label, val]) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "9px 0", borderBottom: "1px solid #f1f5f9", gap: 16,
                }}>
                  <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, flexShrink: 0, textTransform: "capitalize" }}>{label}</span>
                  <span style={{ fontSize: 13, color: "#0f172a", textAlign: "right", wordBreak: "break-all", fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Changes JSON */}
            {selected.changes && Object.keys(selected.changes).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Changes</div>
                <pre style={{
                  background: "#f8fafc", borderRadius: 8, padding: 14,
                  fontSize: 11, overflow: "auto", maxHeight: 200,
                  border: "1px solid #e2e8f0", margin: 0,
                  color: "#374151", lineHeight: 1.6,
                }}>
                  {JSON.stringify(selected.changes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
        select:focus, input:focus { outline: 2px solid #0f172a; outline-offset: 0; border-color: transparent; }
      `}</style>
    </div>
  );
}