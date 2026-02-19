"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, Btn, Card, CardHeader, Input, Badge, Skeleton, Modal,
} from "@/components/admin/AdminUI";

type BankSettings = {
  id: string; bank_name: string; account_name: string; account_number: string;
  branch?: string | null; swift_code?: string | null;
  mobile_money_provider?: string | null; mobile_money_number?: string | null;
  mobile_money_name?: string | null; qr_code_url?: string | null;
  instructions?: string | null; is_active: boolean; is_primary: boolean;
};

const EMPTY: Omit<BankSettings, "id"> = {
  bank_name: "", account_name: "", account_number: "",
  branch: "", swift_code: "", mobile_money_provider: "",
  mobile_money_number: "", mobile_money_name: "", qr_code_url: "",
  instructions: "", is_active: true, is_primary: false,
};

export default function AdminBankSettingsPage() {
  const [settings,   setSettings]   = useState<BankSettings[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<"create" | "edit" | null>(null);
  const [editing,    setEditing]    = useState<BankSettings | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.getBankSettings();
      setSettings(Array.isArray(data) ? data : [data].filter(Boolean));
    } catch { toast.error("Failed to load bank settings"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ ...EMPTY });
    setEditing(null);
    setModal("create");
  }

  function openEdit(s: BankSettings) {
    setForm({ ...EMPTY, ...s });
    setEditing(s);
    setModal("edit");
  }

  async function submit() {
    if (!form.bank_name || !form.account_name || !form.account_number) {
      toast.error("Bank name, account name and number are required"); return;
    }
    setSubmitting(true);
    const payload = {
      bank_name:              form.bank_name,
      account_name:           form.account_name,
      account_number:         form.account_number,
      branch:                 form.branch || undefined,
      swift_code:             form.swift_code || undefined,
      mobile_money_provider:  form.mobile_money_provider || undefined,
      mobile_money_number:    form.mobile_money_number || undefined,
      mobile_money_name:      form.mobile_money_name || undefined,
      qr_code_url:            form.qr_code_url || undefined,
      instructions:           form.instructions || undefined,
      is_active:              form.is_active,
      is_primary:             form.is_primary,
    };
    try {
      if (modal === "edit" && editing) {
        await adminApi.updateBankSettings(editing.id, payload);
        toast.success("Settings updated");
      } else {
        await adminApi.createBankSettings(payload);
        toast.success("Bank settings created");
      }
      setModal(null); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  function F(key: keyof typeof form) {
    const val = form[key];
    if (typeof val === "boolean") {
      return (
        <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={val} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
          {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
        </label>
      );
    }
    return (
      <Input
        key={key}
        label={key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
        value={val as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageTitle sub="Payment collection bank accounts and mobile money">Bank Settings</PageTitle>
        <Btn variant="primary" onClick={openCreate}>+ Add Bank Account</Btn>
      </div>

      {loading ? <Skeleton /> : settings.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "48px", color: C.faint }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◻</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No bank settings yet</div>
            <div style={{ fontSize: 13 }}>Add a bank account so customers can make payments.</div>
            <Btn variant="primary" style={{ marginTop: 16 }} onClick={openCreate}>+ Add Bank Account</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {settings.map(s => (
            <Card key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{s.bank_name}</h3>
                    {s.is_primary && <Badge status="paid" label="Primary" />}
                    <Badge status={s.is_active ? "active" : "inactive"} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 24px" }}>
                    {[
                      ["Account Name",           s.account_name],
                      ["Account Number",         s.account_number],
                      ["Branch",                 s.branch || "—"],
                      ["SWIFT Code",             s.swift_code || "—"],
                      ["Mobile Money Provider",  s.mobile_money_provider || "—"],
                      ["Mobile Money Number",    s.mobile_money_number || "—"],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
                        <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {s.instructions && (
                    <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 13, color: C.muted, border: `1px solid ${C.border}` }}>
                      <strong>Instructions: </strong>{s.instructions}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small onClick={() => openEdit(s)}>Edit</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Add Bank Account" : "Edit Bank Account"} width={540}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>Bank Details</div>
          {(["bank_name","account_name","account_number","branch","swift_code"] as const).map(F)}

          <div style={{ fontSize: 12, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginTop: 8 }}>Mobile Money</div>
          {(["mobile_money_provider","mobile_money_number","mobile_money_name"] as const).map(F)}

          <div style={{ fontSize: 12, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginTop: 8 }}>Settings</div>
          {F("qr_code_url")}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Payment Instructions</label>
            <textarea
              value={form.instructions ?? ""}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              rows={3}
              style={{ marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {(["is_active","is_primary"] as const).map(F)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <Btn onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" disabled={submitting} onClick={submit}>
            {submitting ? "Saving…" : modal === "create" ? "Create Settings" : "Save Changes"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}