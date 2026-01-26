"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMe, updateMe } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   BACKEND-ALIGNED TYPES
====================== */

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;

  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface UpdateProfilePayload {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

/* ======================
   PAGE
====================== */

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
        const data: UserProfile = await getMe();

        setProfile(data);
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setAvatarUrl(data.avatar_url);
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
      const res = await fetch(
        `${API}/api/users/me/avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.detail || "Avatar upload failed"
        );
      }

      setAvatarUrl(data.avatar_url);
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(
        err.message || "Failed to upload avatar"
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  /* ======================
     SAVE PROFILE
  ====================== */

  async function saveProfile() {
    setSaving(true);

    const payload: UpdateProfilePayload = {
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      avatar_url: avatarUrl,
    };

    try {
      await updateMe(payload);

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...payload,
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

  if (loading) {
    return <p style={{ marginTop: 20 }}>Loading profile…</p>;
  }

  if (!profile) {
    return null;
  }

  /* ======================
     UI
  ====================== */

  return (
    <div style={{ maxWidth: 760 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Profile
        </h1>
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
            Please complete your profile to enable
            checkout and delivery.
          </div>
        )}

        {/* AVATAR */}
        <div
          style={{
            display: "flex",
            gap: 18,
            alignItems: "center",
          }}
        >
          <img
            src={
              avatarUrl ||
              "/avatar-placeholder.png"
            }
            alt="Avatar"
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #e5e7eb",
            }}
          />

          <label
            style={{
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {uploadingAvatar
              ? "Uploading..."
              : "Change photo"}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={uploadingAvatar}
              onChange={(e) => {
                const file =
                  e.target.files?.[0];
                if (file) {
                  handleAvatarUpload(file);
                }
              }}
            />
          </label>
        </div>

        {/* FULL NAME */}
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              opacity: 0.6,
            }}
          >
            Full name
          </div>
          <input
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
            placeholder="Your full name"
          />
        </div>

        {/* PHONE */}
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              opacity: 0.6,
            }}
          >
            Phone number
          </div>
          <input
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            placeholder="Phone number"
          />
        </div>

        {/* EMAIL */}
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              opacity: 0.6,
            }}
          >
            Email address
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            {profile.email}
          </div>
        </div>

        {/* META */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(200px,1fr))",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                opacity: 0.6,
              }}
            >
              Account type
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 16,
                fontWeight: 800,
                textTransform: "capitalize",
              }}
            >
              {profile.role}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                opacity: 0.6,
              }}
            >
              Member since
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {new Date(
                profile.created_at
              ).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* SAVE */}
        <div style={{ marginTop: 10 }}>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn btnTech"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>
    </div>
  );
}
