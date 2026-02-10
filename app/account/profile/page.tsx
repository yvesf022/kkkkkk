"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { uploadAvatar } from "@/lib/api";

export default function AccountProfilePage() {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.loading);
  const logout = useAuth((s) => s.logout);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  /* ======================
     REDIRECT AFTER AUTH RESOLVES
  ====================== */
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [authLoading, user, router]);

  /* ======================
     LOADING STATE
  ====================== */
  if (authLoading) {
    return (
      <div style={{ padding: 40, fontWeight: 700 }}>
        Loading profile…
      </div>
    );
  }

  if (!user) return null;

  async function handleAvatarChange(file: File) {
    try {
      setUploading(true);
      await uploadAvatar(file);

      // 🔒 reset file input so same image can be re-selected
      if (fileRef.current) fileRef.current.value = "";

      router.refresh();
    } catch {
      alert("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div
        style={{
          display: "flex",
          gap: 36,
          padding: 36,
          borderRadius: 22,
          background: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,.08)",
        }}
      >
        {/* AVATAR */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 128,
              height: 128,
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

          <p style={{ opacity: 0.7, marginTop: 4 }}>{user.email}</p>

          {user.phone && (
            <p style={{ opacity: 0.6, marginTop: 6 }}>{user.phone}</p>
          )}

          <div style={{ marginTop: 18, fontSize: 13, opacity: 0.55 }}>
            Account type: {user.is_admin ? "Admin" : "User"}
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

/* ======================
   STYLES
====================== */

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
