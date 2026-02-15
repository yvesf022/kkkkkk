"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const WHATSAPP_NUMBER = "919253258848";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  /* =====================================================
     CREATE / FETCH PAYMENT
  ===================================================== */

  useEffect(() => {
    async function initializePayment() {
      if (!orderId) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${orderId}`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Failed to initialize payment");
        }

        setPaymentId(data.payment_id);
      } catch (err: any) {
        toast.error(err.message || "Failed to initialize payment.");
      } finally {
        setInitializing(false);
      }
    }

    initializePayment();
  }, [orderId]);

  if (!orderId) {
    return (
      <div style={{ padding: 100, textAlign: "center" }}>
        Invalid payment link.
      </div>
    );
  }

  /* =====================================================
     HANDLE UPLOAD
  ===================================================== */

  async function handleUpload() {
    if (!file) {
      toast.error("Please select a payment proof file.");
      return;
    }

    if (!paymentId) {
      toast.error("Payment not initialized yet.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("proof", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}/proof`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setUploaded(true);
      toast.success("Payment proof uploaded successfully.");
    } catch (err: any) {
      toast.error(err.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

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
        {/* HEADER */}
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

          {initializing && (
            <p style={{ marginTop: 15, fontSize: 14, opacity: 0.6 }}>
              Initializing payment...
            </p>
          )}
        </div>

        {/* STEP 1 */}
        <SectionTitle number="1" title="Make Bank Transfer" />

        <div style={bankBox}>
          <BankRow label="Bank" value="Standard Lesotho Bank" />
          <BankRow label="Account Name" value="Karabo Online Store" />
          <BankRow label="Account Number" value="123456789" />
          <BankRow label="Reference" value={orderId} strong />
        </div>

        {/* STEP 2 */}
        <SectionTitle number="2" title="Upload Payment Proof" />

        <div style={uploadBox}>
          <div style={infoBox}>
            Please upload a clear proof of payment such as:
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              <li>Bank transfer receipt photo</li>
              <li>Mobile banking screenshot</li>
              <li>ATM deposit slip image</li>
              <li>PDF payment confirmation</li>
            </ul>
            Ensure the transaction reference and amount are clearly visible.
          </div>

          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setUploaded(false);
            }}
            style={fileInputStyle}
          />

          {file && (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Selected: {file.name}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!paymentId || uploading || uploaded}
            style={{
              ...uploadButtonStyle,
              background: uploaded ? "#16a34a" : "#111827",
              opacity: !paymentId ? 0.6 : 1,
            }}
          >
            {uploading
              ? "Uploading..."
              : uploaded
              ? "Uploaded ✓"
              : "Upload Payment Proof"}
          </button>

          {uploaded && (
            <div style={successText}>
              ✓ Your proof has been received and is awaiting admin verification.
            </div>
          )}
        </div>

        {/* STEP 3 */}
        <SectionTitle number="3" title="Notify on WhatsApp" />

        <div style={whatsappBox}>
          <a
            href={whatsappLink}
            target="_blank"
            style={whatsappButtonStyle}
          >
            Open WhatsApp →
          </a>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   UI COMPONENTS
===================================================== */

function SectionTitle({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div style={{ marginBottom: 20, marginTop: 50 }}>
      <h2 style={{ fontSize: 22, fontWeight: 900 }}>
        {number}. {title}
      </h2>
    </div>
  );
}

function BankRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: strong ? 900 : 700 }}>{value}</span>
    </div>
  );
}

/* =====================================================
   STYLES
===================================================== */

const bankBox: React.CSSProperties = {
  padding: 35,
  borderRadius: 24,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: 14,
};

const uploadBox: React.CSSProperties = {
  padding: 35,
  borderRadius: 24,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: 20,
};

const infoBox: React.CSSProperties = {
  background: "#f8fafc",
  padding: "16px 18px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  lineHeight: 1.6,
  color: "#334155",
};

const fileInputStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  fontSize: 14,
};

const uploadButtonStyle: React.CSSProperties = {
  padding: "16px",
  borderRadius: 14,
  border: "none",
  fontWeight: 900,
  color: "#fff",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const successText: React.CSSProperties = {
  fontSize: 14,
  color: "#166534",
  fontWeight: 600,
};

const whatsappBox: React.CSSProperties = {
  padding: 45,
  borderRadius: 28,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  textAlign: "center",
};

const whatsappButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "18px 50px",
  borderRadius: 18,
  fontWeight: 900,
  background: "#25D366",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: 16,
};
