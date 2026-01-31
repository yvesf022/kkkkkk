"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { uploadAvatar } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const initialized = useAuth((s) => s.initialized);
  const logout = useAuth((s) => s.logout);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  /* ======================
     REDIRECT AFTER HYDRATION
  ====================== */
  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.replace("/login");
    }
  }, [initialized, user, router]);

  /* ======================
     LOADING STATE
  ====================== */
  if (!initialized) {
    return (
      <div style={{ padding: 40, fontWeight: 700 }}>
        Loading profile…
      </div>
    );
  }

  /* ======================
     BLOCK RENDER AFTER REDIRECT
  ====================== */
  if (!user) return null;

  async function handleAvatarChange(file: File) {
    try {
      setUploading(true);
      await uploadAvatar(file);
      router.refresh();
    } catch {
      alert("Avatar upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* PROFILE IDENTITY CARD */}
      <div
        style={{
          display: "flex",
          gap: 36,
          padding: 36,
          borderRadius: 22,
          background: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,.08)",
          marginBottom: 48,
        }}
      >
        {/* AVATAR */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 124,
              height: 124,
              borderRadius: "50%",
              background: user.avatar_url
                ? `url(${user.avatar_url}) center/cover`
                : "linear-gradient(135deg,#ff2fa0,#00e6ff)",
              display: "grid",
              placeItems: "center",
              fontSize: 48,
              fontWeight: 900,
              color: "#fff",
              marginBottom: 12,
            }}
          >
            {!user.avatar_url &&
              (user.full_name?.[0] || user.email[0]).toUpperCase()}
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={linkButton}
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) =>
              e.target.files && handleAvatarChange(e.target.files[0])
            }
          />
        </div>

        {/* DETAILS */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>
            {user.full_name || "Your account"}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 6,
            }}
          >
            <span style={{ opacity: 0.75 }}>{user.email}</span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "4px 8px",
                borderRadius: 999,
                background: "#e6f4ea",
                color: "#137333",
              }}
            >
              Verified
            </span>
          </div>

          {user.phone && (
            <p style={{ opacity: 0.65, marginTop: 6 }}>
              {user.phone}
            </p>
          )}

          <div style={{ marginTop: 18, fontSize: 13, opacity: 0.55 }}>
            Account type: {user.role}
            <br />
            Member since:{" "}
            {user.created_at
              ? new Date(user.created_at).toDateString()
              : "—"}
          </div>

          <div style={{ marginTop: 26, display: "flex", gap: 14 }}>
            <button
              onClick={() => router.push("/account/profile/edit")}
              style={primaryButton}
            >
              Edit profile
            </button>

            <button
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              style={secondaryButton}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ styles ------------------ */

const primaryButton: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const linkButton: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#0066c0",
  fontWeight: 700,
  cursor: "pointer",
};
