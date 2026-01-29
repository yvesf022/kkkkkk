"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { updateMe, getMe } from "@/lib/api";

export default function EditProfilePage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || "");
    setPhone(user.phone || "");
  }, [user]);

  if (!user) return null;

  async function handleSave() {
    try {
      setSaving(true);

      await updateMe({
        full_name: fullName,
        phone,
      });

      // 🔁 Re-sync identity (Amazon pattern)
      await getMe();

      router.replace("/account/profile");
      router.refresh();
    } catch (err) {
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 24 }}>
        Edit profile
      </h1>

      <div
        style={{
          background: "#fff",
          padding: 28,
          borderRadius: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,.08)",
        }}
      >
        {/* FULL NAME */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 700, fontSize: 14 }}>Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* PHONE */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontWeight: 700, fontSize: 14 }}>Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", gap: 14 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={primaryBtn}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>

          <button
            onClick={() => router.back()}
            style={secondaryBtn}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  fontSize: 15,
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 22px",
  borderRadius: 12,
  background: "linear-gradient(135deg,#ff2fa0,#00e6ff)",
  border: "none",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "12px 22px",
  borderRadius: 12,
  background: "#fff",
  border: "1px solid rgba(0,0,0,.15)",
  fontWeight: 700,
  cursor: "pointer",
};
