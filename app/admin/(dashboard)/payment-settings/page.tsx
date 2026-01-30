"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type PaymentSetting = {
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
};

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  /* =========================
     LOAD SETTINGS
  ========================= */
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

  /* =========================
     ADD BANK
  ========================= */
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

      toast.success("Bank added");
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

  /* =========================
     TOGGLE ACTIVE
  ========================= */
  async function toggleActive(
    id: number,
    active: boolean
  ) {
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

  return (
    <div style={{ maxWidth: 720 }}>
      {/* HEADER */}
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>
        Payment Settings
      </h1>

      <p style={{ marginTop: 8, opacity: 0.6 }}>
        Configure bank accounts customers use for payments.
      </p>

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
            onChange={(e) => setAccountName(e.target.value)}
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

      {/* LIST BANKS */}
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
                    {s.account_number}
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
