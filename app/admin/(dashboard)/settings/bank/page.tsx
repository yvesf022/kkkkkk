"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL!;

type BankSettings = {
  id?: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch?: string;
  swift_code?: string;
  mobile_money_provider?: string;
  mobile_money_number?: string;
  mobile_money_name?: string;
  instructions?: string;
  qr_code_url?: string;
  is_active: boolean;
  is_primary?: boolean;
};

export default function AdminBankSettingsPage() {
  const [settings, setSettings] = useState<BankSettings>({
    bank_name: "",
    account_name: "",
    account_number: "",
    branch: "",
    swift_code: "",
    mobile_money_provider: "",
    mobile_money_number: "",
    mobile_money_name: "",
    instructions: "",
    qr_code_url: "",
    is_active: true,
    is_primary: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* =============================
     LOAD SETTINGS
  ============================= */
  async function loadSettings() {
    try {
      const res = await fetch(`${API}/api/payments/admin/bank-settings`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      const bank = Array.isArray(data) ? data[0] : data;

      if (bank) {
        setSettings(bank);
      }
    } catch {
      toast.error("Failed to load bank settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  /* =============================
     SAVE SETTINGS
  ============================= */
  async function handleSave() {
    if (!settings.bank_name || !settings.account_name || !settings.account_number) {
      toast.error("Bank name, account name and account number are required");
      return;
    }

    setSaving(true);

    try {
      // Always POST (backend creates new record)
      const res = await fetch(`${API}/api/payments/admin/bank-settings`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error();

      toast.success("Bank settings saved successfully");
      await loadSettings();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading settings…</div>;
  }

  return (
    <div style={{ display: "grid", gap: 28, maxWidth: 900 }}>
      {/* HEADER */}
      <header>
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          <Link href="/admin">Admin</Link> › Bank Settings
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900 }}>Bank & Payment Settings</h1>

        <p style={{ opacity: 0.6, marginTop: 4 }}>
          Configure bank accounts and mobile money details visible to customers.
        </p>
      </header>

      {/* FORM */}
      <div
        style={{
          padding: 32,
          borderRadius: 22,
          background: "#ffffff",
          boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          display: "grid",
          gap: 20,
        }}
      >
        <Input label="Bank Name" value={settings.bank_name} onChange={(v) => setSettings({ ...settings, bank_name: v })} />
        <Input label="Account Name" value={settings.account_name} onChange={(v) => setSettings({ ...settings, account_name: v })} />
        <Input label="Account Number" value={settings.account_number} onChange={(v) => setSettings({ ...settings, account_number: v })} />
        <Input label="Branch" value={settings.branch || ""} onChange={(v) => setSettings({ ...settings, branch: v })} />
        <Input label="Swift Code" value={settings.swift_code || ""} onChange={(v) => setSettings({ ...settings, swift_code: v })} />
        <Input label="Mobile Money Provider" value={settings.mobile_money_provider || ""} onChange={(v) => setSettings({ ...settings, mobile_money_provider: v })} />
        <Input label="Mobile Money Number" value={settings.mobile_money_number || ""} onChange={(v) => setSettings({ ...settings, mobile_money_number: v })} />
        <Input label="Mobile Money Name" value={settings.mobile_money_name || ""} onChange={(v) => setSettings({ ...settings, mobile_money_name: v })} />
        <Input label="QR Code Image URL" value={settings.qr_code_url || ""} onChange={(v) => setSettings({ ...settings, qr_code_url: v })} />

        {settings.qr_code_url && (
          <img
            src={settings.qr_code_url}
            alt="QR Code"
            style={{ maxWidth: 200, borderRadius: 12, border: "1px solid #e5e7eb" }}
          />
        )}

        <Textarea label="Payment Instructions" value={settings.instructions || ""} onChange={(v) => setSettings({ ...settings, instructions: v })} />

        {/* ACTIVE TOGGLE */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.is_active}
            onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
          />
          <label style={{ fontWeight: 600 }}>Active (visible to customers)</label>
        </div>

        {/* PRIMARY TOGGLE */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.is_primary || false}
            onChange={(e) => setSettings({ ...settings, is_primary: e.target.checked })}
          />
          <label style={{ fontWeight: 600 }}>Primary account</label>
        </div>

        <button className="btn btnPrimary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

/* =============================
   UI COMPONENTS
============================= */

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
  fontSize: 14,
};
