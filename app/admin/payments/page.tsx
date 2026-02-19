"use client";

/**
 * FIX: <TD muted style={{ textTransform: "capitalize" }}> — TD doesn't accept `style` prop.
 * Fixed: <TD muted><span style={{ textTransform: "capitalize" }}>…</span></TD>
 */

import { useEffect, useState } from "react";
import { paymentsApi, adminPaymentsAdvancedApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, Badge, Btn, Card, CardHeader, Table, TR, TD,
  Modal, Tabs, Input, fmtMoney, fmtDateTime, shortId, Skeleton, Empty, Select,
} from "@/components/admin/AdminUI";

type Payment = {
  id: string; order_id: string; amount: number; status: string;
  method: string; proof?: { file_url: string; uploaded_at: string } | null;
  admin_notes?: string | null; created_at: string; reviewed_at?: string | null;
};

const STATUS_TABS = [
  { label: "All",      value: "" },
  { label: "Pending",  value: "pending" },
  { label: "On Hold",  value: "on_hold" },
  { label: "Paid",     value: "paid" },
  { label: "Rejected", value: "rejected" },
];

export default function AdminPaymentsPage() {
  const [payments,    setPayments]   = useState<Payment[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [tab,         setTab]        = useState("");
  const [search,      setSearch]     = useState("");
  const [selected,    setSelected]   = useState<Payment | null>(null);
  const [reviewing,   setReviewing]  = useState<{ id: string; action: "paid" | "rejected" } | null>(null);
  const [notes,       setNotes]      = useState("");
  const [submitting,  setSubmitting] = useState(false);
  const [forceModal,  setForceModal] = useState<Payment | null>(null);
  const [forceStatus, setForceStatus] = useState("paid");
  const [forceReason, setForceReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await paymentsApi.adminList(tab as any || undefined);
      setPayments((data as any) || []);
    } catch { toast.error("Failed to load payments"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [tab]);

  async function review(id: string, status: "paid" | "rejected") {
    setSubmitting(true);
    try {
      await paymentsApi.review(id, status, notes || undefined);
      toast.success(status === "paid" ? "Payment approved ✓" : "Payment rejected");
      setReviewing(null); setSelected(null); setNotes("");
      load();
    } catch (e: any) { toast.error(e.message ?? "Review failed"); }
    finally { setSubmitting(false); }
  }

  async function forceStatusSubmit() {
    if (!forceModal || !forceReason.trim()) { toast.error("Reason required"); return; }
    setSubmitting(true);
    try {
      await adminPaymentsAdvancedApi.forceStatus(forceModal.id, { status: forceStatus, reason: forceReason });
      toast.success("Status overridden");
      setForceModal(null); setForceReason(""); load();
    } catch (e: any) { toast.error(e.message ?? "Override failed"); }
    finally { setSubmitting(false); }
  }

  async function hardDelete(id: string) {
    if (!confirm("Permanently delete this payment? This cannot be undone.")) return;
    try {
      await adminPaymentsAdvancedApi.hardDelete(id);
      toast.success("Payment deleted");
      load();
    } catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  }

  const filtered = payments.filter(p =>
    !search ||
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.order_id.toLowerCase().includes(search.toLowerCase()) ||
    String(p.amount).includes(search)
  );

  const counts = {
    "":        payments.length,
    pending:   payments.filter(p => p.status === "pending").length,
    on_hold:   payments.filter(p => p.status === "on_hold").length,
    paid:      payments.filter(p => p.status === "paid").length,
    rejected:  payments.filter(p => p.status === "rejected").length,
  };

  return (
    <div style={{ maxWidth: 1300 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageTitle sub={`${counts.pending} pending review`}>Payments</PageTitle>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="Search by ID or amount…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
              fontSize: 13, outline: "none", width: 220,
            }}
          />
        </div>
      </div>

      <Tabs
        options={STATUS_TABS.map(t => ({ ...t, count: counts[t.value as keyof typeof counts] }))}
        value={tab}
        onChange={setTab}
      />

      <Card>
        {loading ? <Skeleton /> : filtered.length === 0 ? <Empty message="No payments found." /> : (
          <Table headers={["Payment ID", "Order ID", "Amount", "Method", "Status", "Proof", "Date", "Actions"]}>
            {filtered.map(p => (
              <TR key={p.id}>
                <TD mono>{shortId(p.id)}</TD>
                <TD mono muted>{shortId(p.order_id)}</TD>
                <TD><strong>{fmtMoney(p.amount)}</strong></TD>
                {/* FIX: TD doesn't accept `style` prop — wrap in span */}
                <TD muted>
                  <span style={{ textTransform: "capitalize" }}>
                    {p.method?.replace(/_/g, " ")}
                  </span>
                </TD>
                <TD><Badge status={p.status} /></TD>
                <TD>
                  {p.proof?.file_url
                    ? (
                      <a
                        href={p.proof.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: C.accent, fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                      >
                        View Proof →
                      </a>
                    )
                    : <span style={{ color: C.faint, fontSize: 12 }}>None</span>
                  }
                </TD>
                <TD muted>{fmtDateTime(p.created_at)}</TD>
                <TD>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {p.status === "pending" && (
                      <>
                        <Btn small variant="success" onClick={() => setReviewing({ id: p.id, action: "paid" })}>Approve</Btn>
                        <Btn small variant="danger"  onClick={() => setReviewing({ id: p.id, action: "rejected" })}>Reject</Btn>
                      </>
                    )}
                    <Btn small onClick={() => setSelected(p)}>Details</Btn>
                    <Btn small onClick={() => { setForceModal(p); setForceStatus(p.status); }}>Override</Btn>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </Card>

      {/* ── Review confirm modal ── */}
      <Modal
        open={!!reviewing}
        onClose={() => { setReviewing(null); setNotes(""); }}
        title={reviewing?.action === "paid" ? "Approve Payment" : "Reject Payment"}
        width={440}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
            {reviewing?.action === "paid"
              ? "Confirming this will mark the payment as paid and notify the customer."
              : "Rejecting this payment will require the customer to resubmit proof."}
          </p>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Admin Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Reason for decision…"
              style={{
                marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`, fontSize: 14, resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => { setReviewing(null); setNotes(""); }}>Cancel</Btn>
            <Btn
              variant={reviewing?.action === "paid" ? "success" : "danger"}
              disabled={submitting}
              onClick={() => reviewing && review(reviewing.id, reviewing.action)}
            >
              {submitting ? "Processing…" : reviewing?.action === "paid" ? "Confirm Approval" : "Confirm Rejection"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Detail modal ── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Payment Details" width={520}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["Payment ID",  shortId(selected.id)],
              ["Order ID",    shortId(selected.order_id)],
              ["Amount",      fmtMoney(selected.amount)],
              ["Method",      selected.method?.replace(/_/g, " ")],
              ["Status",      selected.status],
              ["Created",     fmtDateTime(selected.created_at)],
              ["Reviewed At", fmtDateTime(selected.reviewed_at)],
              ["Admin Notes", selected.admin_notes || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, color: C.text, textTransform: "capitalize" }}>{val}</span>
              </div>
            ))}
            {selected.proof?.file_url && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase" }}>
                  Payment Proof
                </div>
                <img
                  src={selected.proof.file_url}
                  alt="Proof"
                  style={{ maxWidth: "100%", borderRadius: 8, border: `1px solid ${C.border}` }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              {selected.status === "pending" && (
                <>
                  <Btn variant="success" small onClick={() => { setSelected(null); setReviewing({ id: selected.id, action: "paid" }); }}>Approve</Btn>
                  <Btn variant="danger"  small onClick={() => { setSelected(null); setReviewing({ id: selected.id, action: "rejected" }); }}>Reject</Btn>
                </>
              )}
              <Btn variant="danger" small onClick={() => { setSelected(null); hardDelete(selected.id); }}>Delete</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Force status override modal ── */}
      <Modal
        open={!!forceModal}
        onClose={() => { setForceModal(null); setForceReason(""); }}
        title="Force Status Override"
        width={400}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            Override the payment status manually. Use with caution — this bypasses normal review flow.
          </p>
          <Select label="New Status" value={forceStatus} onChange={e => setForceStatus(e.target.value)}>
            {["pending", "on_hold", "paid", "rejected"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input
            label="Reason (required)"
            value={forceReason}
            onChange={e => setForceReason(e.target.value)}
            placeholder="Reason for manual override…"
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => { setForceModal(null); setForceReason(""); }}>Cancel</Btn>
            <Btn
              variant="warning"
              disabled={submitting || !forceReason.trim()}
              onClick={forceStatusSubmit}
            >
              {submitting ? "Saving…" : "Apply Override"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}