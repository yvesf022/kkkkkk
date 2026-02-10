"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { updateMe } from "@/lib/api";

export default function EditProfilePage() {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.loading);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  /* ======================
     REDIRECT AFTER AUTH
  ====================== */
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
    } else {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div style={{ padding: 40, fontWeight: 700 }}>
        Loading profile editor…
      </div>
    );
  }

  if (!user) return null;

  async function handleSave() {
    setSaving(true);

    try {
      // ✅ PASS REQUIRED PAYLOAD
      await updateMe({
        full_name: fullName,
        phone: phone,
      });

      router.replace("/account/profile");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 24 }}>
        Edit profile
      </h1>

      <Field label="Full name">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          style={input}
        />
      </Field>

      <Field label="Email address">
        <input value={user.email} disabled style={disabledInput} />
      </Field>

      <Field label="Phone number">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+250…"
          style={input}
        />
      </Field>

      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <button
          onClick={handleSave}
          disabled={saving || authLoading}
          style={primary}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        <button onClick={() => router.back()} style={secondary}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------ UI helpers ------------------ */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label
        style={{
          fontWeight: 700,
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/* ------------------ styles ------------------ */

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  fontSize: 14,
};

const disabledInput: React.CSSProperties = {
  ...input,
  background: "#f5f5f5",
  cursor: "not-allowed",
};

const primary: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondary: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.2)",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
