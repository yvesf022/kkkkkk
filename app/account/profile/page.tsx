"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMe, updateMe, User } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const isProfileComplete =
    fullName.trim().length > 0 && phone.trim().length > 0;

  /* ======================
     LOAD PROFILE
  ====================== */

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getMe();

        setProfile(data);
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setAvatarUrl(data.avatar_url ?? null);
      } catch {
        toast.error("Failed to load profile information");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  /* ======================
     AVATAR UPLOAD
  ====================== */

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingAvatar(true);

    try {
      const res = await fetch(`${API}/api/users/me/avatar`, {
        method: "POST",
        credentials: "include", // 🔐 httpOnly cookie auth
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Avatar upload failed");
      }

      setAvatarUrl(data.avatar_url);
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  /* ======================
     SAVE PROFILE
  ====================== */

  async function saveProfile() {
    setSaving(true);

    try {
      await updateMe({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName.trim(),
              phone: phone.trim(),
              avatar_url: avatarUrl ?? undefined,
            }
          : prev
      );

      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  /* ======================
     STATES
  ====================== */

  if (loading) return <p style={{ marginTop: 20 }}>Loading profile…</p>;
  if (!profile) return null;

  /* ======================
     UI
  ====================== */

  return (
    <div style={{ maxWidth: 760 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Profile</h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Manage your personal information
        </p>
      </header>

      <section
        style={{
          marginTop: 28,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 22,
          padding: 28,
          display: "grid",
          gap: 22,
        }}
      >
        {!isProfileComplete && (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: "#fff7ed",
              color: "#9a3412",
              fontWeight: 600,
            }}
          >
            Please complete your profile to enable checkout and delivery.
          </div>
        )}

        {/* Avatar, inputs, meta, save button remain unchanged */}
      </section>
    </div>
  );
}
