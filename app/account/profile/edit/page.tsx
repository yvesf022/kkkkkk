"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { updateMe } from "@/lib/api";

export default function EditProfilePage() {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const initialized = useAuth((s) => s.initialized);
  const updateUser = useAuth((s) => s.updateUser);
  const loading = useAuth((s) => s.loading);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  /* ======================
     REDIRECT AFTER HYDRATION
  ====================== */
  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.replace("/login");
    } else {
      // initialize form values once user is available
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
    }
  }, [initialized, user, router]);

  /* ======================
     LOADING STATE
  ====================== */
  if (!initialized) {
    return (
      <div style={{ padding: 40, fontWeight: 700 }}>
        Loading profile editor…
      </div>
    );
  }

  /* ======================
     BLOCK RENDER AFTER REDIRECT
  ====================== */
  if (!user) return null;

  async function handleSave() {
    setSaving(true);

    try {
      const updatedUser = await updateMe({
        full_name: fullName || undefined,
        phone: phone || undefined,
      });

      updateUser(updatedUser);
      router.replace("/account/profile");
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
          disabled={saving || loading}
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
      <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
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
