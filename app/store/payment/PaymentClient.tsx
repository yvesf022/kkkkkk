"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const WHATSAPP_NUMBER = "919253258848";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  /* ================= CREATE PAYMENT ================= */

  useEffect(() => {
    async function createPayment() {
      if (!orderId) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${orderId}`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!res.ok) throw new Error();

        const data = await res.json();
        setPaymentId(data.id);
      } catch {
        toast.error("Failed to initialize payment.");
      }
    }

    createPayment();
  }, [orderId]);

  if (!orderId) {
    return (
      <div style={{ padding: 100, textAlign: "center" }}>
        Invalid payment link.
      </div>
    );
  }

  /* ================= UPLOAD ================= */

  async function handleUpload() {
    if (!file) {
      toast.error("Select payment proof first.");
      return;
    }

    if (!paymentId) {
      toast.error("Payment not initialized yet.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}/proof`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error();

      setUploaded(true);
      toast.success("Payment proof uploaded successfully.");
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  /* ================= WHATSAPP ================= */

  const message = encodeURIComponent(
    `Hello, I have completed payment for Order ${orderId}. Please verify.`
  );

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#f8fafc,#ffffff)",
        padding: "100px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 32,
          padding: 70,
          boxShadow: "0 50px 120px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 70 }}>
          <div
            style={{
              width: 80,
              height: 80,
              margin: "0 auto 25px",
              borderRadius: "50%",
              background: "#111827",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            1
          </div>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              marginBottom: 12,
            }}
          >
            Complete Your Payment
          </h1>

          <p style={{ opacity: 0.6 }}>
            Order Reference: <strong>{orderId}</strong>
          </p>
        </div>

        <SectionTitle number="1" title="Make Bank Transfer" />

        <div style={bankBox}>
          <BankRow label="Bank" value="Standard Lesotho Bank" />
          <BankRow label="Account Name" value="Karabo Online Store" />
          <BankRow label="Account Number" value="123456789" />
          <BankRow label="Reference" value={orderId} strong />
        </div>

        <SectionTitle number="2" title="Upload Payment Proof" />

        <div style={uploadBox}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button
            onClick={handleUpload}
            disabled={uploading || uploaded}
            style={{
              padding: "16px",
              borderRadius: 14,
              border: "none",
              fontWeight: 900,
              background: uploaded ? "#16a34a" : "#111827",
              color: "#fff",
              cursor: uploading ? "wait" : "pointer",
            }}
          >
            {uploading
              ? "Uploading..."
              : uploaded
              ? "Uploaded ✓"
              : "Upload Proof"}
          </button>
        </div>

        <SectionTitle number="3" title="Notify on WhatsApp" />

        <div style={whatsappBox}>
          <a
            href={whatsappLink}
            target="_blank"
            style={{
              display: "inline-block",
              padding: "18px 50px",
              borderRadius: 18,
              fontWeight: 900,
              background: "#25D366",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: 16,
            }}
          >
            Open WhatsApp →
          </a>
        </div>
      </div>
    </div>
  );
}
