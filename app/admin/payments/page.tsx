"use client";

import { useEffect, useState } from "react";
import {
  paymentsApi,
  adminPaymentsAdvancedApi,
} from "@/lib/api";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await paymentsApi.adminList();
      setPayments(data || [] as any || [] as any || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id: string, status: "paid" | "rejected") {
    await paymentsApi.review(id, status, "Admin decision");
    load();
  }

  async function forceStatus(id: string) {
    const status = prompt("New status?");
    if (!status) return;

    await adminPaymentsAdvancedApi.forceStatus(id, {
      status,
      reason: "Manual override",
    });

    load();
  }

  async function hardDelete(id: string) {
    if (!confirm("Hard delete payment?")) return;
    await adminPaymentsAdvancedApi.hardDelete(id);
    load();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Payments Control</h1>

      <div style={{ marginTop: 20 }}>
        {payments.map((p) => (
          <div key={p.id} style={card}>
            <div>
              <strong>#{p.id.slice(0, 8)}</strong>
              <p>Amount: R {p.amount}</p>
              <p>Status: {p.status}</p>
            </div>

            <div>
              {p.status === "pending" && (
                <>
                  <button onClick={() => review(p.id, "paid")} style={btnGreen}>
                    Approve
                  </button>
                  <button onClick={() => review(p.id, "rejected")} style={btnRed}>
                    Reject
                  </button>
                </>
              )}

              <button onClick={() => forceStatus(p.id)} style={btn}>
                Force
              </button>

              <button onClick={() => hardDelete(p.id)} style={btnRed}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const card = {
  display: "flex",
  justifyContent: "space-between",
  padding: 16,
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  marginBottom: 12,
};

const btn = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  marginRight: 6,
  cursor: "pointer",
};

const btnGreen = { ...btn, background: "#dcfce7", color: "#166534" };
const btnRed = { ...btn, background: "#fee2e2", color: "#991b1b" };


