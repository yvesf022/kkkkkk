"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES
====================== */

type PaymentSetting = {
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
};

function maskAccount(num: string) {
  if (num.length <= 4) return num;
  return "•••• " + num.slice(-4);
}

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* FORM */
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  /* ======================
     LOAD SETTINGS
  ====================== */
  async function load() {
    try {
      const res = await fetch(
        `${API}/api/admin/payment-settings`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error();
      setSettings(await res.json());
    } catch {
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* ======================
     ADD BANK
  ====================== */
  async function addBank(e: React.FormEvent) {
    e.preventDefault();

    if (!bankName || !accountName || !accountNumber) {
      toast.error("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/admin/payment-settings`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bank_name: bankName,
            account_name: accountName,
            account_number: accountNumber,
          }),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Bank account added");
      setBankName("");
      setAccountName("");
      setAccountNumber("");
      load();
    } catch {
      toast.error("Failed to add bank");
    } finally {
      setSaving(false);
    }
  }

  /* ======================
     TOGGLE ACTIVE
  ====================== */
  async function toggleActive(
    id: number,
    active: boolean
  ) {
    if (
      active &&
      !confirm(
        "Deactivate this bank? Customers will no longer see it."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `${API}/api/admin/payment-settings/${id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !active }),
        }
      );

      if (!res.ok) throw new Error();
      load();
    } catch {
      toast.error("Failed to update status");
    }
  }

  const activeBank = settings.find((s) => s.is_active);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* HEADER */}
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>
        Payment Settings
      </h1>

      <p style={{ marginTop: 8, opacity: 0.6 }}>
        Configure the bank account customers use for payments.
      </p>

      {/* ACTIVE BANK NOTICE */}
      {activeBank && (
        <div
          className="card"
          style={{
            marginTop: 20,
            border: "2px solid #86efac",
            background: "#f0fdf4",
          }}
        >
          <strong>Active bank:</strong>{" "}
          {activeBank.bank_name} ·{" "}
          {maskAccount(activeBank.account_number)}
        </div>
      )}

      {/* ADD BANK */}
      <section className="card" style={{ marginTop: 24 }}>
        <h3 style={{ fontWeight: 800 }}>
          Add Bank Account
        </h3>

        <form
          onSubmit={addBank}
          style={{
            display: "grid",
            gap: 12,
            marginTop: 12,
          }}
        >
          <input
            placeholder="Bank name"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            required
          />

          <input
            placeholder="Account holder name"
            value={accountName}
            onChange={(e) =>
              setAccountName(e.target.value)
            }
            required
          />

          <input
            placeholder="Account number"
            value={accountNumber}
            onChange={(e) =>
              setAccountNumber(e.target.value)
            }
            required
          />

          <button
            className="btn btnTech"
            disabled={saving}
          >
            {saving ? "Saving…" : "Add Bank"}
          </button>
        </form>
      </section>

      {/* BANK LIST */}
      <section style={{ marginTop: 32 }}>
        <h3 style={{ fontWeight: 800 }}>
          Existing Banks
        </h3>

        {loading ? (
          <p>Loading…</p>
        ) : settings.length === 0 ? (
          <div className="card" style={{ marginTop: 12 }}>
            No bank accounts configured yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 14,
              marginTop: 14,
            }}
          >
            {settings.map((s) => (
              <div
                key={s.id}
                className="card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  border: s.is_active
                    ? "2px solid #86efac"
                    : undefined,
                }}
              >
                <div>
                  <strong>{s.bank_name}</strong>
                  <div style={{ fontSize: 13 }}>
                    {s.account_name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      opacity: 0.7,
                    }}
                  >
                    {maskAccount(s.account_number)}
                  </div>
                </div>

                <button
                  className="btn btnGhost"
                  onClick={() =>
                    toggleActive(s.id, s.is_active)
                  }
                >
                  {s.is_active
                    ? "Deactivate"
                    : "Activate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
