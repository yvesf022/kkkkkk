"use client";

import { useEffect, useState } from "react";
import { notify } from "@/components/ui/ToastProvider";
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

  async function loadSettings() {
    try {
      const res = await fetch(`${API}/api/payments/admin/bank-settings`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      const bank = Array.isArray(data) ? data[0] : data;

      if (bank) setSettings(bank);
    } catch (err) {
      notify.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave() {
    if (!settings.bank_name || !settings.account_name || !settings.account_number) {
      notify.error("Bank name, account name and account number are required");
      return;
    }

    setSaving(true);

    try {
      await notify.promise(
        fetch(`${API}/api/payments/admin/bank-settings`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }).then((r) => {
          if (!r.ok) throw new Error("Failed to save");
        }),
        {
          loading: "Saving payment configuration...",
          success: "Payment configuration updated",
          error: "Failed to save configuration",
        }
      );

      await loadSettings();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="adminContainer">
        <div className="card skeleton" />
        <div className="card skeleton" />
      </div>
    );
  }

  return (
    <div className="adminContainer">
      {/* HEADER */}
      <div className="pageHeader">
        <div>
          <div className="breadcrumb">
            <Link href="/admin">Admin</Link> / Payment Configuration
          </div>
          <h1>Payment Infrastructure</h1>
          <p>
            Configure bank accounts and mobile money details customers will use
            to complete payments.
          </p>
        </div>

        {settings.is_primary && <div className="primaryBadge">PRIMARY</div>}
      </div>

      {/* BANK SECTION */}
      <Section title="Bank Account">
        <Grid>
          <Input label="Bank Name" value={settings.bank_name} onChange={(v) => setSettings({ ...settings, bank_name: v })} />
          <Input label="Account Name" value={settings.account_name} onChange={(v) => setSettings({ ...settings, account_name: v })} />
          <Input label="Account Number" value={settings.account_number} onChange={(v) => setSettings({ ...settings, account_number: v })} />
          <Input label="Branch" value={settings.branch || ""} onChange={(v) => setSettings({ ...settings, branch: v })} />
          <Input label="SWIFT Code" value={settings.swift_code || ""} onChange={(v) => setSettings({ ...settings, swift_code: v })} />
        </Grid>
      </Section>

      {/* MOBILE MONEY */}
      <Section title="Mobile Money">
        <Grid>
          <Input label="Provider" value={settings.mobile_money_provider || ""} onChange={(v) => setSettings({ ...settings, mobile_money_provider: v })} />
          <Input label="Number" value={settings.mobile_money_number || ""} onChange={(v) => setSettings({ ...settings, mobile_money_number: v })} />
          <Input label="Account Name" value={settings.mobile_money_name || ""} onChange={(v) => setSettings({ ...settings, mobile_money_name: v })} />
        </Grid>
      </Section>

      {/* QR + INSTRUCTIONS */}
      <Section title="Customer Instructions">
        <Textarea
          label="Payment Instructions"
          value={settings.instructions || ""}
          onChange={(v) => setSettings({ ...settings, instructions: v })}
        />

        <Input
          label="QR Code URL"
          value={settings.qr_code_url || ""}
          onChange={(v) => setSettings({ ...settings, qr_code_url: v })}
        />

        {settings.qr_code_url && (
          <div className="qrPreview">
            <img src={settings.qr_code_url} alt="QR Code" />
          </div>
        )}
      </Section>

      {/* CONTROLS */}
      <div className="toggleRow">
        <Toggle
          label="Active (visible to customers)"
          checked={settings.is_active}
          onChange={(v) => setSettings({ ...settings, is_active: v })}
        />
        <Toggle
          label="Primary account"
          checked={settings.is_primary || false}
          onChange={(v) => setSettings({ ...settings, is_primary: v })}
        />
      </div>

      {/* SAVE BAR */}
      <div className="saveBar">
        <button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}

/* ============================= COMPONENTS ============================= */

function Section({ title, children }: any) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: any) {
  return <div className="grid">{children}</div>;
}

function Input({ label, value, onChange }: any) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Textarea({ label, value, onChange }: any) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Toggle({ label, checked, onChange }: any) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
      {label}
    </label>
  );
}
