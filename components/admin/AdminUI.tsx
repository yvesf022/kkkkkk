// ─────────────────────────────────────────────────────────────
// ADMIN UI PRIMITIVES  –  shared across all admin pages
// ─────────────────────────────────────────────────────────────
"use client";
import React from "react";

// ── Colour tokens ──────────────────────────────────────────
export const C = {
  bg:        "#f0f2f5",
  surface:   "#ffffff",
  border:    "#e2e8f0",
  borderMid: "#cbd5e1",
  text:      "#0f172a",
  muted:     "#64748b",
  faint:     "#94a3b8",
  accent:    "#0ea5e9",
  danger:    "#ef4444",
  success:   "#22c55e",
  warn:      "#f59e0b",
  navy:      "#0033a0",
  green:     "#009543",
} as const;

// ── Typography helpers ─────────────────────────────────────
export const PageTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 28 }}>
    <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: -0.5 }}>{children}</h1>
    {sub && <p style={{ margin: "4px 0 0", fontSize: 14, color: C.muted }}>{sub}</p>}
  </div>
);

// ── Status badge ───────────────────────────────────────────
const STATUS_COLORS: Record<string, [string, string]> = {
  pending:    ["#fef9c3", "#854d0e"],
  on_hold:    ["#fef3c7", "#92400e"],
  paid:       ["#dcfce7", "#166534"],
  approved:   ["#dcfce7", "#166534"],
  rejected:   ["#fee2e2", "#991b1b"],
  cancelled:  ["#fee2e2", "#991b1b"],
  shipped:    ["#dbeafe", "#1e40af"],
  completed:  ["#d1fae5", "#065f46"],
  processing: ["#e0f2fe", "#075985"],
  delivered:  ["#d1fae5", "#065f46"],
  returned:   ["#f3e8ff", "#6b21a8"],
  active:     ["#dcfce7", "#166534"],
  inactive:   ["#f1f5f9", "#475569"],
  draft:      ["#f1f5f9", "#475569"],
  archived:   ["#fef3c7", "#92400e"],
  discontinued: ["#fee2e2", "#991b1b"],
  partial:    ["#fef3c7", "#92400e"],
  failed:     ["#fee2e2", "#991b1b"],
};

export function Badge({ status, label }: { status: string; label?: string }) {
  const [bg, fg] = STATUS_COLORS[status?.toLowerCase()] ?? ["#f1f5f9", "#475569"];
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 700,
      background: bg,
      color: fg,
      textTransform: "capitalize",
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
    }}>
      {label ?? status}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{title}</h3>
      {action}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────
export function StatCard({
  label, value, sub, color = C.text, alert, icon,
}: {
  label: string; value: string | number; sub?: string;
  color?: string; alert?: boolean; icon?: string;
}) {
  return (
    <div style={{
      background: alert ? "#fff5f5" : C.surface,
      border: `1px solid ${alert ? "#fecaca" : C.border}`,
      borderRadius: 14,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}
        </span>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: alert ? C.danger : color, letterSpacing: -0.5 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.faint }}>{sub}</div>}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────
type BtnVariant = "primary" | "danger" | "ghost" | "success" | "warning";
const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: C.navy,    color: "#fff",     border: "none" },
  danger:  { background: C.danger,  color: "#fff",     border: "none" },
  success: { background: C.success, color: "#fff",     border: "none" },
  warning: { background: C.warn,    color: "#fff",     border: "none" },
  ghost:   { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
};

export function Btn({
  children, onClick, variant = "ghost", disabled, small, style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  small?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "5px 12px" : "9px 18px",
        borderRadius: 8,
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        ...BTN_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Table ─────────────────────────────────────────────────
export function Table({ headers, children, empty }: {
  headers: string[];
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            {headers.map(h => (
              <th key={h} style={{
                padding: "10px 12px",
                textAlign: "left",
                fontSize: 11,
                fontWeight: 800,
                color: C.faint,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {!children || (Array.isArray(children) && children.length === 0) && (
        <div style={{ padding: "32px", textAlign: "center", color: C.faint, fontSize: 14 }}>
          {empty ?? "No data found."}
        </div>
      )}
    </div>
  );
}

export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: `1px solid ${C.border}`,
        cursor: onClick ? "pointer" : undefined,
        transition: "background 0.1s",
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
      onMouseLeave={e => onClick && ((e.currentTarget as HTMLElement).style.background = "")}
    >
      {children}
    </tr>
  );
}

export function TD({ children, muted, right, mono }: {
  children: React.ReactNode; muted?: boolean; right?: boolean; mono?: boolean;
}) {
  return (
    <td style={{
      padding: "12px 12px",
      fontSize: 13,
      color: muted ? C.muted : C.text,
      textAlign: right ? "right" : "left",
      fontFamily: mono ? "monospace" : undefined,
      verticalAlign: "middle",
    }}>
      {children}
    </td>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
      <input
        {...rest}
        style={{
          padding: "9px 12px",
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          fontSize: 14,
          outline: "none",
          background: C.surface,
          color: C.text,
          width: "100%",
          boxSizing: "border-box",
          ...style,
        }}
      />
    </div>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const { label, style, children, ...rest } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
      <select
        {...rest}
        style={{
          padding: "9px 12px",
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          fontSize: 14,
          outline: "none",
          background: C.surface,
          color: C.text,
          width: "100%",
          boxSizing: "border-box",
          ...style,
        }}
      >
        {children}
      </select>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────
export function Empty({ message = "Nothing here yet." }: { message?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: C.faint }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>◎</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────
export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: 48,
          borderRadius: 8,
          background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          opacity: 1 - i * 0.12,
        }} />
      ))}
      <style>{`@keyframes shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }`}</style>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 480 }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background: C.surface,
        borderRadius: 16,
        padding: 28,
        width: "90%",
        maxWidth: width,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: C.muted }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Pill tabs ─────────────────────────────────────────────
export function Tabs({ options, value, onChange }: {
  options: { label: string; value: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20 }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          padding: "7px 16px",
          borderRadius: 99,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          border: "none",
          background: value === opt.value ? C.text : C.surface,
          color: value === opt.value ? "#fff" : C.muted,
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          {opt.label}
          {opt.count !== undefined && (
            <span style={{
              background: value === opt.value ? "rgba(255,255,255,0.25)" : C.border,
              color: value === opt.value ? "#fff" : C.muted,
              borderRadius: 99,
              fontSize: 11,
              padding: "1px 6px",
              fontWeight: 700,
            }}>{opt.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Fmt helpers ───────────────────────────────────────────
export function fmtMoney(n?: number | null) {
  return `R ${(n ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function fmtNum(n?: number | null) {
  return (n ?? 0).toLocaleString();
}
export function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function shortId(id?: string) {
  return id ? "#" + id.slice(0, 8).toUpperCase() : "—";
}