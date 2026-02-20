"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  C, PageTitle, Btn, Card, Input, Badge, Skeleton, Modal, Empty,
} from "@/components/admin/AdminUI";

type BankSettings = {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch?: string | null;
  swift_code?: string | null;
  mobile_money_provider?: string | null;
  mobile_money_number?: string | null;
  mobile_money_name?: string | null;
  qr_code_url?: string | null;
  instructions?: string | null;
  is_active: boolean;
  is_primary: boolean;
};

const EMPTY: Omit<BankSettings, "id"> = {
  bank_name: "", account_name: "", account_number: "",
  branch: "", swift_code: "",
  mobile_money_provider: "", mobile_money_number: "", mobile_money_name: "",
  qr_code_url: "", instructions: "",
  is_active: true, is_primary: false,
};

/* ── Inline status pill (avoids Badge receiving unknown status values) ── */
function StatusPill({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: active ? "#F0FDF4" : "#FEF2F2",
      color: active ? "#065F46" : "#991B1B",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: active ? "#10B981" : "#EF4444",
        display: "inline-block",
      }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ── Customer-facing payment preview card ── */
function PaymentPreview({ s }: { s: BankSettings }) {
  return (
    <div style={{
      background: "#F8FAFC", border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "16px 18px", marginTop: 16,
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, color: C.faint,
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12,
      }}>
        👁 Customer view — what buyers will see during payment
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          ["Bank",           s.bank_name],
          ["Account name",   s.account_name],
          ["Account number", s.account_number],
          s.branch        ? ["Branch",      s.branch]        : null,
          s.swift_code    ? ["Swift / BIC", s.swift_code]    : null,
          s.mobile_money_number ? [s.mobile_money_provider ?? "Mobile money", s.mobile_money_number] : null,
        ].filter(Boolean).map(([label, value]) => (
          <div key={label as string} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 12px", borderRadius: 8,
            background: "#fff", border: `1px solid #F1F5F9`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label as string}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", fontFamily: "monospace" }}>
              {value as string}
            </span>
          </div>
        ))}
        {s.instructions && (
          <div style={{
            padding: "10px 12px", borderRadius: 8,
            background: "#FFFBEB", border: "1px solid #FDE68A",
            fontSize: 13, color: "#78350F", marginTop: 4,
          }}>
            📋 {s.instructions}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminBankSettingsPage() {
  const [settings,    setSettings]   = useState<BankSettings[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [modal,       setModal]      = useState<"create" | "edit" | null>(null);
  const [editing,     setEditing]    = useState<BankSettings | null>(null);
  const [form,        setForm]       = useState({ ...EMPTY });
  const [submitting,  setSubmitting] = useState(false);
  const [deleting,    setDeleting]   = useState<string | null>(null);
  const [preview,     setPreview]    = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.getBankSettings();
      setSettings(Array.isArray(data) ? data : data ? [data] : []);
    } catch {
      toast.error("Failed to load bank settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ ...EMPTY });
    setEditing(null);
    setModal("create");
  }

  function openEdit(s: BankSettings) {
    setForm({
      bank_name:             s.bank_name,
      account_name:          s.account_name,
      account_number:        s.account_number,
      branch:                s.branch ?? "",
      swift_code:            s.swift_code ?? "",
      mobile_money_provider: s.mobile_money_provider ?? "",
      mobile_money_number:   s.mobile_money_number ?? "",
      mobile_money_name:     s.mobile_money_name ?? "",
      qr_code_url:           s.qr_code_url ?? "",
      instructions:          s.instructions ?? "",
      is_active:             s.is_active,
      is_primary:            s.is_primary,
    });
    setEditing(s);
    setModal("edit");
  }

  async function submit() {
    if (!form.bank_name.trim() || !form.account_name.trim() || !form.account_number.trim()) {
      toast.error("Bank name, account name and account number are required");
      return;
    }
    setSubmitting(true);
    const payload = {
      bank_name:             form.bank_name.trim(),
      account_name:          form.account_name.trim(),
      account_number:        form.account_number.trim(),
      branch:                form.branch?.trim() || undefined,
      swift_code:            form.swift_code?.trim() || undefined,
      mobile_money_provider: form.mobile_money_provider?.trim() || undefined,
      mobile_money_number:   form.mobile_money_number?.trim() || undefined,
      mobile_money_name:     form.mobile_money_name?.trim() || undefined,
      qr_code_url:           form.qr_code_url?.trim() || undefined,
      instructions:          form.instructions?.trim() || undefined,
      is_active:             form.is_active,
      is_primary:            form.is_primary,
    };
    try {
      if (modal === "edit" && editing) {
        await adminApi.updateBankSettings(editing.id, payload);
        toast.success("Bank account updated");
      } else {
        await adminApi.createBankSettings(payload);
        toast.success("Bank account created — customers can now pay!");
      }
      setModal(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(s: BankSettings) {
    try {
      await adminApi.updateBankSettings(s.id, { is_active: !s.is_active });
      toast.success(s.is_active ? "Account deactivated" : "Account activated");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    }
  }

  async function setPrimary(s: BankSettings) {
    if (s.is_primary) return;
    try {
      await adminApi.updateBankSettings(s.id, { is_primary: true });
      toast.success(`${s.bank_name} set as primary`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to set primary");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this bank account? Customers won't be able to use it for payments.")) return;
    setDeleting(id);
    try {
      await adminApi.deleteBankSettings(id);
      toast.success("Bank account deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  const Field = (key: keyof typeof form, label: string, placeholder = "") => {
    const val = form[key];
    if (typeof val === "boolean") {
      return (
        <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={val}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
            style={{ width: 15, height: 15, cursor: "pointer" }}
          />
          <span style={{ fontWeight: 600, color: C.text }}>{label}</span>
        </label>
      );
    }
    return (
      <Input
        key={key}
        label={label}
        value={val as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
      />
    );
  };

  const primaryAccount = settings.find(s => s.is_primary && s.is_active);
  const activeCount = settings.filter(s => s.is_active).length;

  return (
    <div style={{ maxWidth: 960 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageTitle sub="Configure bank accounts and mobile money that customers pay into">
          Bank &amp; Payment Settings
        </PageTitle>
        <Btn variant="primary" onClick={openCreate}>+ Add Bank Account</Btn>
      </div>

      {/* ── Status banner ── */}
      {!loading && (
        <div style={{
          padding: "12px 16px", borderRadius: 10, marginBottom: 20,
          background: activeCount === 0 ? "#FFF1F2" : "#F0FDF4",
          border: `1px solid ${activeCount === 0 ? "#FECDD3" : "#BBF7D0"}`,
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 13, color: activeCount === 0 ? "#9F1239" : "#065F46",
          fontWeight: 600,
        }}>
          <span style={{ fontSize: 16 }}>{activeCount === 0 ? "⚠️" : "✅"}</span>
          {activeCount === 0
            ? "No active bank accounts — customers cannot complete payments right now. Add one below."
            : `${activeCount} active account${activeCount > 1 ? "s" : ""}${primaryAccount ? ` · Primary: ${primaryAccount.bank_name} (${primaryAccount.account_name})` : " · No primary set"}`
          }
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <Skeleton />
      ) : settings.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "56px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏦</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>No bank accounts yet</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>
              Add your bank account or mobile money number so customers can transfer payment for their orders.
            </div>
            <Btn variant="primary" onClick={openCreate}>+ Add Your First Bank Account</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {settings.map(s => (
            <Card key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>

                {/* Left: info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>{s.bank_name}</h3>
                    {s.is_primary && <Badge status="paid" label="⭐ Primary" />}
                    <StatusPill active={s.is_active} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px 24px", marginBottom: 10 }}>
                    {[
                      ["Account Name",   s.account_name],
                      ["Account Number", s.account_number],
                      s.branch         ? ["Branch",         s.branch]         : null,
                      s.swift_code     ? ["SWIFT Code",     s.swift_code]     : null,
                      s.mobile_money_provider && s.mobile_money_number
                        ? [s.mobile_money_provider, s.mobile_money_number]
                        : null,
                    ].filter(Boolean).map(([label, val]) => (
                      <div key={label as string}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>
                          {label as string}
                        </div>
                        <div style={{ fontSize: 13, color: C.text, fontFamily: "monospace", fontWeight: 600 }}>
                          {val as string}
                        </div>
                      </div>
                    ))}
                  </div>

                  {s.instructions && (
                    <div style={{
                      padding: "8px 12px", borderRadius: 8, fontSize: 12, color: C.muted,
                      background: "#FFFBEB", border: "1px solid #FDE68A", marginTop: 4,
                    }}>
                      <strong>Instructions shown to customer: </strong>{s.instructions}
                    </div>
                  )}

                  {/* Expandable customer preview */}
                  {preview === s.id && <PaymentPreview s={s} />}
                </div>

                {/* Right: actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <Btn small variant="primary" onClick={() => openEdit(s)}>Edit</Btn>
                  {!s.is_primary && (
                    <Btn small onClick={() => setPrimary(s)}>
                      Set Primary
                    </Btn>
                  )}
                  <Btn small onClick={() => toggleActive(s)}>
                    {s.is_active ? "Deactivate" : "Activate"}
                  </Btn>
                  <Btn small onClick={() => setPreview(prev => prev === s.id ? null : s.id)}>
                    {preview === s.id ? "Hide Preview" : "Preview"}
                  </Btn>
                  <Btn
                    small variant="danger"
                    disabled={deleting === s.id}
                    onClick={() => handleDelete(s.id)}
                  >
                    {deleting === s.id ? "Deleting…" : "Delete"}
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Add Bank Account" : "Edit Bank Account"}
        width={560}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "68vh", overflowY: "auto", paddingRight: 2 }}>

          <SectionHead>Bank Details</SectionHead>
          {Field("bank_name",     "Bank Name *",       "e.g. Standard Lesotho Bank")}
          {Field("account_name",  "Account Name *",    "e.g. Karabo Online Store")}
          {Field("account_number","Account Number *",  "e.g. 1234567890")}
          {Field("branch",        "Branch",            "e.g. Maseru Main")}
          {Field("swift_code",    "SWIFT / BIC Code",  "e.g. SBLES0LS")}

          <SectionHead>Mobile Money (optional)</SectionHead>
          {Field("mobile_money_provider", "Provider Name",  "e.g. M-Pesa, EcoCash")}
          {Field("mobile_money_number",   "Number",         "e.g. +266 5555 1234")}
          {Field("mobile_money_name",     "Account Name",   "e.g. Karabo Store")}

          <SectionHead>Settings</SectionHead>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Payment Instructions (shown to customer)
            </label>
            <textarea
              value={form.instructions ?? ""}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              rows={3}
              placeholder="e.g. Use your order number as the payment reference."
              style={{
                marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`, fontSize: 14, resize: "vertical",
                boxSizing: "border-box", fontFamily: "inherit", color: C.text,
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 6 }}>
            {Field("is_active",  "Active (visible to customers)")}
            {Field("is_primary", "Set as primary account")}
          </div>
        </div>

        <div style={{
          display: "flex", gap: 10, justifyContent: "flex-end",
          marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16,
        }}>
          <Btn onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" disabled={submitting} onClick={submit}>
            {submitting ? "Saving…" : modal === "create" ? "Create Account" : "Save Changes"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: "#94a3b8",
      textTransform: "uppercase", letterSpacing: "0.1em",
      borderBottom: "1px solid #f1f5f9", paddingBottom: 6,
      marginTop: 12, marginBottom: 4,
    }}>
      {children}
    </div>
  );
}