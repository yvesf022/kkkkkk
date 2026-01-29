"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { uploadAvatar } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  async function handleAvatarChange(file: File) {
    try {
      setUploading(true);
      await uploadAvatar(file);
      router.refresh(); // re-fetch /me
    } catch {
      alert("Avatar upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* IDENTITY CARD */}
      <div
        style={{
          display: "flex",
          gap: 32,
          padding: 32,
          borderRadius: 20,
          background: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,.08)",
          marginBottom: 48,
        }}
      >
        {/* AVATAR */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: user.avatar_url
                ? `url(${user.avatar_url}) center/cover`
                : "linear-gradient(135deg,#ff2fa0,#00e6ff)",
              display: "grid",
              placeItems: "center",
              fontSize: 46,
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
            {uploading ? "Uploading..." : "Change photo"}
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

          <p style={{ opacity: 0.75, marginTop: 4 }}>{user.email}</p>

          {user.phone && (
            <p style={{ opacity: 0.6, marginTop: 4 }}>{user.phone}</p>
          )}

          <div style={{ marginTop: 16, fontSize: 13, opacity: 0.55 }}>
            Account type: {user.role} <br />
            Member since:{" "}
            {user.created_at
              ? new Date(user.created_at).toDateString()
              : "—"}
          </div>

          <div style={{ marginTop: 22, display: "flex", gap: 14 }}>
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
              style={dangerButton}
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

const dangerButton: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  background: "#fff",
  color: "#b00020",
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
