"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMe } from "@/lib/api";

/* ======================
   TYPES
====================== */
type UserProfile = {
  email: string;
  role: "user" | "admin";
  created_at?: string;
};

/* ======================
   PAGE
====================== */
export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getMe();
        setProfile(data);
      } catch {
        toast.error("Failed to load profile information");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  return (
    <div style={{ maxWidth: 720 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Profile
        </h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Manage your personal information
        </p>
      </header>

      {/* CONTENT */}
      {loading && <p style={{ marginTop: 20 }}>Loading profile…</p>}

      {!loading && profile && (
        <section
          style={{
            marginTop: 28,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 22,
            padding: 24,
            display: "grid",
            gap: 18,
          }}
        >
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

          {/* ROLE */}
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

          {/* MEMBER SINCE */}
          {profile.created_at && (
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
                {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* INFO NOTE */}
          <div
            style={{
              marginTop: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "#f8fafc",
              fontSize: 13,
              opacity: 0.7,
            }}
          >
            To change your email or password, please visit the
            <b> Security </b>
            section.
          </div>
        </section>
      )}
    </div>
  );
}
