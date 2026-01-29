"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EditProfilePage() {
  const user = useAuth((s) => s.user);
  const updateMe = useAuth((s) => s.updateMe);
  const router = useRouter();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function handleSave() {
    try {
      setSaving(true);
      await updateMe({
        full_name: fullName,
        phone,
      });
      router.replace("/account/profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 24 }}>
        Edit profile
      </h1>

      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 32,
          boxShadow: "0 20px 60px rgba(0,0,0,.08)",
        }}
      >
        <label style={{ display: "block", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Full name</div>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,.15)",
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Phone</div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,.15)",
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg,#ff2fa0,#00e6ff)",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            onClick={() => router.back()}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,.15)",
              background: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
