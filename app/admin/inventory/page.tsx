"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, StatCard, Badge, Btn, Card, CardHeader, Table, TR, TD,
  Modal, Input, Tabs, fmtNum, fmtDateTime, Skeleton, Empty,
} from "@/components/admin/AdminUI";

const TABS = [
  { label: "Low Stock",    value: "low-stock" },
  { label: "Out of Stock", value: "out-of-stock" },
  { label: "Full Report",  value: "report" },
];

export default function AdminInventoryPage() {
  const [tab,        setTab]        = useState("low-stock");
  const [items,      setItems]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [adjustModal, setAdjustModal] = useState<any | null>(null);
  const [incomingModal, setIncomingModal] = useState<any | null>(null);
  const [adjQty,     setAdjQty]     = useState("");
  const [adjNote,    setAdjNote]    = useState("");
  const [incQty,     setIncQty]     = useState("");
  const [incNote,    setIncNote]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stats,      setStats]      = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const loaders: Record<string, () => Promise<any>> = {
        "low-stock":    () => adminApi.getLowStock(),
        "out-of-stock": () => adminApi.getOutOfStock(),
        report:         () => adminApi.getInventoryReport(),
      };
      const data = await loaders[tab]();
      setItems(Array.isArray(data) ? data : (data as any)?.products ?? (data as any)?.items ?? []);
      if (!stats) {
        const [low, out] = await Promise.allSettled([adminApi.getLowStock(), adminApi.getOutOfStock()]);
        setStats({
          low:  low.status  === "fulfilled" ? (low.value  as any[]).length : 0,
          out:  out.status  === "fulfilled" ? (out.value  as any[]).length : 0,
        });
      }
    } catch { toast.error("Failed to load inventory"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [tab]);

  async function adjust() {
    if (!adjustModal || !adjQty) { toast.error("Quantity required"); return; }
    setSubmitting(true);
    try {
      await adminApi.adjustInventory({ product_id: adjustModal.id, quantity: Number(adjQty), note: adjNote || undefined });
      toast.success("Inventory adjusted");
      setAdjustModal(null); setAdjQty(""); setAdjNote(""); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function incoming() {
    if (!incomingModal || !incQty) { toast.error("Quantity required"); return; }
    setSubmitting(true);
    try {
      await adminApi.incomingInventory({ product_id: incomingModal.id, quantity: Number(incQty), note: incNote || undefined });
      toast.success("Stock added");
      setIncomingModal(null); setIncQty(""); setIncNote(""); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ maxWidth: 1300 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageTitle sub="Monitor and adjust product stock levels">Inventory</PageTitle>
        <Btn small onClick={load}>↺ Refresh</Btn>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
          <StatCard label="Low Stock"    value={stats.low} alert={stats.low > 0} icon="▦" />
          <StatCard label="Out of Stock" value={stats.out} alert={stats.out > 0} icon="✗" />
        </div>
      )}

      <Tabs options={TABS} value={tab} onChange={setTab} />

      <Card>
        {loading ? <Skeleton /> : items.length === 0
          ? <div style={{ textAlign: "center", padding: "48px", color: C.success, fontSize: 14 }}>✓ All good — no issues found</div>
          : (
          <Table headers={["Product", "SKU", "Stock", "Status", "Actions"]}>
            {items.map(p => (
              <TR key={p.id ?? p.product_id}>
                <TD>
                  <div>
                    <Link href={`/admin/products/${p.id ?? p.product_id}`} style={{ color: C.accent, fontWeight: 600, textDecoration: "none", fontSize: 13 }}>
                      {p.title}
                    </Link>
                    {p.category && <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{p.category}</div>}
                  </div>
                </TD>
                <TD mono muted>{p.sku || "—"}</TD>
                <TD>
                  <span style={{
                    fontWeight: 800, fontSize: 15,
                    color: p.stock === 0 ? C.danger : p.stock < 5 ? C.danger : p.stock < 20 ? C.warn : C.text,
                  }}>
                    {fmtNum(p.stock)}
                  </span>
                  {p.low_stock_threshold && (
                    <span style={{ fontSize: 11, color: C.faint, marginLeft: 6 }}>/ {p.low_stock_threshold} threshold</span>
                  )}
                </TD>
                <TD>
                  <Badge status={p.stock === 0 ? "inactive" : p.stock < 10 ? "on_hold" : "active"}
                         label={p.stock === 0 ? "Out of Stock" : p.stock < 10 ? "Low Stock" : "In Stock"} />
                </TD>
                <TD>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="success" onClick={() => { setIncomingModal(p); setIncQty(""); setIncNote(""); }}>+ Add Stock</Btn>
                    <Btn small onClick={() => { setAdjustModal(p); setAdjQty(""); setAdjNote(""); }}>Adjust</Btn>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </Card>

      {/* Adjust Modal */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={`Adjust Inventory — ${adjustModal?.title}`} width={400}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            Use a negative number to reduce stock (e.g. -5), or a positive number to increase.
          </p>
          <Input label="Adjustment Amount" type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="e.g. -5 or 10" />
          <Input label="Note (optional)" value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="Reason for adjustment…" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => setAdjustModal(null)}>Cancel</Btn>
            <Btn variant="primary" disabled={submitting || !adjQty} onClick={adjust}>
              {submitting ? "Saving…" : "Apply Adjustment"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Incoming Modal */}
      <Modal open={!!incomingModal} onClose={() => setIncomingModal(null)} title={`Add Incoming Stock — ${incomingModal?.title}`} width={400}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Quantity to Add" type="number" min="1" value={incQty} onChange={e => setIncQty(e.target.value)} placeholder="e.g. 50" />
          <Input label="Note / Supplier (optional)" value={incNote} onChange={e => setIncNote(e.target.value)} placeholder="Supplier name or PO number…" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => setIncomingModal(null)}>Cancel</Btn>
            <Btn variant="success" disabled={submitting || !incQty || Number(incQty) <= 0} onClick={incoming}>
              {submitting ? "Adding…" : "Add Stock"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}