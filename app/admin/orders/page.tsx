"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ordersApi, adminApi, adminOrdersAdvancedApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, Badge, Btn, Card, Table, TR, TD,
  Modal, Tabs, Select, fmtMoney, fmtDateTime, shortId, Skeleton, Empty,
} from "@/components/admin/AdminUI";

const STATUS_TABS = [
  { label: "All",       value: "" },
  { label: "Pending",   value: "pending" },
  { label: "Paid",      value: "paid" },
  { label: "Shipped",   value: "shipped" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function AdminOrdersPage() {
  const [orders,     setOrders]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState("");
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<any | null>(null);
  const [shippingModal, setShippingModal] = useState<any | null>(null);
  const [shippingStatus, setShippingStatus] = useState("shipped");
  const [cancelModal, setCancelModal] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [forceModal, setForceModal] = useState<any | null>(null);
  const [forceStatus, setForceStatus] = useState("paid");
  const [forceReason, setForceReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await ordersApi.getAdmin(tab || undefined);
      setOrders((data as any[]) || []);
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [tab]);

  async function updateShipping() {
    if (!shippingModal) return;
    setSubmitting(true);
    try {
      await ordersApi.updateShipping(shippingModal.id, { status: shippingStatus });
      toast.success("Shipping status updated");
      setShippingModal(null); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function cancelOrder() {
    if (!cancelModal || !cancelReason.trim()) { toast.error("Reason required"); return; }
    setSubmitting(true);
    try {
      await adminApi.cancelOrder(cancelModal.id, cancelReason);
      toast.success("Order cancelled");
      setCancelModal(null); setCancelReason(""); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function forceStatusSubmit() {
    if (!forceModal || !forceReason.trim()) { toast.error("Reason required"); return; }
    setSubmitting(true);
    try {
      await adminOrdersAdvancedApi.forceStatus(forceModal.id, { status: forceStatus, reason: forceReason });
      toast.success("Status overridden");
      setForceModal(null); setForceReason(""); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function hardDelete(id: string) {
    if (!confirm("Permanently delete this order?")) return;
    try {
      await adminOrdersAdvancedApi.hardDelete(id);
      toast.success("Order deleted");
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !search || o.id.includes(q) || (o.user_id ?? "").includes(q);
  });

  const counts = Object.fromEntries(
    STATUS_TABS.map(t => [t.value, t.value ? orders.filter(o => o.status === t.value).length : orders.length])
  );

  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageTitle sub={`${orders.length} total orders`}>Orders</PageTitle>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="Search by order ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
              fontSize: 13, outline: "none", width: 220,
            }}
          />
          <Btn small onClick={load}>↺ Refresh</Btn>
        </div>
      </div>

      <Tabs options={STATUS_TABS.map(t => ({ ...t, count: counts[t.value] }))} value={tab} onChange={setTab} />

      <Card>
        {loading ? <Skeleton /> : filtered.length === 0 ? <Empty message="No orders found." /> : (
          <Table headers={["Order ID", "Customer", "Amount", "Status", "Shipping", "Payment", "Date", "Actions"]}>
            {filtered.map(o => (
              <TR key={o.id}>
                <TD mono>
                  <Link href={`/admin/orders/${o.id}`} style={{ color: C.accent, fontWeight: 700, textDecoration: "none" }}>
                    {shortId(o.id)}
                  </Link>
                </TD>
                <TD muted>{shortId(o.user_id)}</TD>
                <TD><strong>{fmtMoney(o.total_amount)}</strong></TD>
                <TD><Badge status={o.status} /></TD>
                <TD><Badge status={o.shipping_status} /></TD>
                <TD><Badge status={o.payment_status ?? "—"} /></TD>
                <TD muted>{fmtDateTime(o.created_at)}</TD>
                <TD>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <Link href={`/admin/orders/${o.id}`}><Btn small>Details</Btn></Link>
                    <Btn small onClick={() => { setShippingModal(o); setShippingStatus(o.shipping_status ?? "shipped"); }}>Ship</Btn>
                    {o.status !== "cancelled" && <Btn small variant="danger" onClick={() => setCancelModal(o)}>Cancel</Btn>}
                    <Btn small variant="ghost" onClick={() => { setForceModal(o); setForceStatus(o.status); }}>Force</Btn>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </Card>

      {/* Shipping modal */}
      <Modal open={!!shippingModal} onClose={() => setShippingModal(null)} title="Update Shipping Status" width={380}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="Shipping Status" value={shippingStatus} onChange={e => setShippingStatus(e.target.value)}>
            {["pending","processing","shipped","delivered","returned"].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => setShippingModal(null)}>Cancel</Btn>
            <Btn variant="primary" disabled={submitting} onClick={updateShipping}>
              {submitting ? "Saving…" : "Update Shipping"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal open={!!cancelModal} onClose={() => { setCancelModal(null); setCancelReason(""); }} title="Cancel Order" width={400}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Reason (required)</label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation…"
              style={{
                marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => { setCancelModal(null); setCancelReason(""); }}>Back</Btn>
            <Btn variant="danger" disabled={submitting || !cancelReason.trim()} onClick={cancelOrder}>
              {submitting ? "Cancelling…" : "Confirm Cancellation"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Force status modal */}
      <Modal open={!!forceModal} onClose={() => { setForceModal(null); setForceReason(""); }} title="Force Order Status" width={400}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="New Status" value={forceStatus} onChange={e => setForceStatus(e.target.value)}>
            {["pending","paid","cancelled","shipped","completed"].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Reason (required)</label>
            <input
              value={forceReason}
              onChange={e => setForceReason(e.target.value)}
              placeholder="Reason for override…"
              style={{ marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => { setForceModal(null); setForceReason(""); }}>Cancel</Btn>
            <Btn variant="warning" disabled={submitting || !forceReason.trim()} onClick={forceStatusSubmit}>
              {submitting ? "Saving…" : "Apply Override"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}