"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMe, updateMe, uploadAvatar } from "@/lib/api";
import { User } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getMe();
        setUser(me);
        setFullName(me.full_name ?? "");
        setPhone(me.phone ?? "");
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const profileComplete = Boolean(fullName && phone);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateMe({ full_name: fullName, phone });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Avatar upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div>Loading profile…</div>;
  }

  return (
    <div style={{ display: "grid", gap: 32, maxWidth: 900 }}>
      {/* PAGE CONTEXT */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Your profile
        </h1>
        <p style={{ fontSize: 14, opacity: 0.6 }}>
          Manage your personal details used for delivery and support.
        </p>
      </div>

      {/* TRUST / SECURITY BANNER */}
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          background: "#f8fafc",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        🔒 <strong>Your privacy matters.</strong>  
        We only use your profile details to process orders, deliveries,
        and customer support.  
        <br />
        Payment information is <strong>never stored</strong> on your
        account.
      </div>

      {/* PROFILE CARD */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr",
          gap: 24,
          padding: 24,
          borderRadius: 24,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
        }}
      >
        {/* AVATAR */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#e5e7eb",
              margin: "0 auto",
            }}
          >
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}
          </div>

          <label
            style={{
              display: "inline-block",
              marginTop: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "Uploading…" : "Change photo"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarUpload}
            />
          </label>

          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            JPG or PNG · Max 5MB
          </div>
        </div>

        {/* FORM */}
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 700 }}>
              Full name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              style={{ marginTop: 6 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 700 }}>
              Phone number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Used for delivery contact"
              style={{ marginTop: 6 }}
            />
          </div>

          {!profileComplete && (
            <div style={{ fontSize: 13, color: "#b45309" }}>
              ⚠ Complete your profile to avoid delivery delays.
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn btnPrimary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <button
              className="btn btnGhost"
              onClick={() => router.push("/account/addresses")}
            >
              Manage addresses
            </button>
          </div>
        </div>
      </div>

      {/* NEXT ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <button
          className="btn btnGhost"
          onClick={() => router.push("/account/orders")}
        >
          View orders
        </button>

        <button
          className="btn btnTech"
          onClick={() => router.push("/store")}
        >
          Continue shopping
        </button>
      </div>
    </div>
  );
}
