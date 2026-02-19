"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, Btn, Card, Table, TR, TD,
  Modal, Input, Badge, fmtDateTime, fmtNum, Skeleton, Empty,
} from "@/components/admin/AdminUI";

type Store = {
  id: string; name: string; slug: string; description?: string | null;
  is_active: boolean; product_count: number; created_at: string;
};

export default function AdminStoresPage() {
  const [stores,     setStores]     = useState<Store[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [createModal,setCreateModal]= useState(false);
  const [editModal,  setEditModal]  = useState<Store | null>(null);
  const [delModal,   setDelModal]   = useState<Store | null>(null);
  const [form,       setForm]       = useState({ name: "", slug: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.listStores();
      setStores((data as any) || []);
    } catch { toast.error("Failed to load stores"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ name: "", slug: "", description: "" });
    setCreateModal(true);
  }

  function openEdit(s: Store) {
    setForm({ name: s.name, slug: s.slug, description: s.description ?? "" });
    setEditModal(s);
  }

  async function createStore() {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSubmitting(true);
    try {
      await adminApi.createStore({ name: form.name, slug: form.slug || undefined, description: form.description || undefined });
      toast.success("Store created");
      setCreateModal(false); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function updateStore() {
    if (!editModal) return;
    setSubmitting(true);
    try {
      await adminApi.updateStore(editModal.id, { name: form.name, slug: form.slug, description: form.description || undefined });
      toast.success("Store updated");
      setEditModal(null); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function toggleActive(s: Store) {
    try {
      await adminApi.updateStore(s.id, { is_active: !s.is_active });
      toast.success(s.is_active ? "Store deactivated" : "Store activated");
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  async function deleteStore() {
    if (!delModal) return;
    setSubmitting(true);
    try {
      await adminApi.deleteStore(delModal.id);
      toast.success("Store deleted");
      setDelModal(null); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  const StoreForm = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Input label="Store Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Fashion Store" />
      <Input label="Slug (optional)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. fashion-store" />
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={3}
          style={{ marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageTitle sub={`${stores.length} stores`}>Stores</PageTitle>
        <Btn variant="primary" onClick={openCreate}>+ New Store</Btn>
      </div>

      <Card>
        {loading ? <Skeleton /> : stores.length === 0 ? <Empty message="No stores yet." /> : (
          <Table headers={["Name", "Slug", "Products", "Status", "Created", "Actions"]}>
            {stores.map(s => (
              <TR key={s.id}>
                <TD><strong>{s.name}</strong></TD>
                <TD mono muted>{s.slug}</TD>
                <TD>{fmtNum(s.product_count)}</TD>
                <TD><Badge status={s.is_active ? "active" : "inactive"} /></TD>
                <TD muted>{fmtDateTime(s.created_at)}</TD>
                <TD>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small onClick={() => openEdit(s)}>Edit</Btn>
                    <Btn small variant={s.is_active ? "warning" : "success"} onClick={() => toggleActive(s)}>
                      {s.is_active ? "Deactivate" : "Activate"}
                    </Btn>
                    <Btn small variant="danger" onClick={() => setDelModal(s)}>Delete</Btn>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </Card>

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Store" width={440}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <StoreForm />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => setCreateModal(false)}>Cancel</Btn>
            <Btn variant="primary" disabled={submitting || !form.name.trim()} onClick={createStore}>
              {submitting ? "Creating…" : "Create Store"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit — ${editModal?.name}`} width={440}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <StoreForm />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => setEditModal(null)}>Cancel</Btn>
            <Btn variant="primary" disabled={submitting} onClick={updateStore}>
              {submitting ? "Saving…" : "Save Changes"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!delModal} onClose={() => setDelModal(null)} title="Delete Store" width={380}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 14 }}>
            <strong style={{ color: C.danger }}>⚠ This will delete the store</strong>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>
              Products in <strong>{delModal?.name}</strong> will not be deleted but will lose their store assignment.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn onClick={() => setDelModal(null)}>Cancel</Btn>
            <Btn variant="danger" disabled={submitting} onClick={deleteStore}>
              {submitting ? "Deleting…" : "Delete Store"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}