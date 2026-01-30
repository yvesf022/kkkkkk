"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Payment = {
  id: string;
  order_id: string;
  amount: number;
  status: "initiated" | "proof_submitted" | "approved" | "rejected";
  created_at: string;
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/payments/admin`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setPayments)
      .catch(() => toast.error("Failed to load payments"))
      .finally(() => setLoading(false));
  }, []);

  function reviewPayment(
    id: string,
    status: "approved" | "rejected"
  ) {
    fetch(`${API}/api/payments/admin/${id}/review`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        setPayments((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status } : p
          )
        );
        toast.success(`Payment ${status}`);
      })
      .catch(() =>
        toast.error("Failed to update payment")
      );
  }

  if (loading) return <p>Loading payments…</p>;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Payments Review
        </h1>
        <p style={{ opacity: 0.6, marginTop: 4 }}>
          Approve or reject customer payment proofs
        </p>
      </header>

      {payments.length === 0 && (
        <p>No payments found.</p>
      )}

      {payments.map((p) => (
        <div
          key={p.id}
          style={{
            padding: 18,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <div style={{ fontWeight: 800 }}>
            Order: {p.order_id}
          </div>
          <div>Amount: ₹{p.amount}</div>
          <div>Status: {p.status}</div>

          {p.status === "proof_submitted" && (
            <div style={{ marginTop: 12 }}>
              <button
                className="btn btnTech"
                onClick={() =>
                  reviewPayment(p.id, "approved")
                }
              >
                Approve
              </button>

              <button
                className="btn btnGhost"
                style={{ marginLeft: 10 }}
                onClick={() =>
                  reviewPayment(p.id, "rejected")
                }
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
