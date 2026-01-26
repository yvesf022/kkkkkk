"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* =========================
   TYPES — BACKEND ALIGNED
========================= */

interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

interface RegisterSuccessResponse {
  id: string;
  email: string;
}

interface FastAPIErrorResponse {
  detail: string;
}

type Status =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function RegisterPage() {
  const router = useRouter();

  /* ---------- FORM STATE ---------- */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  /* =========================
     REGISTER HANDLER
  ========================= */

  async function register() {
    setStatus({ type: "idle" });

    /* ---------- CLIENT VALIDATION ---------- */
    if (!email || !password || !confirm) {
      setStatus({
        type: "error",
        message: "Email and password are required.",
      });
      return;
    }

    if (password.length < 8) {
      setStatus({
        type: "error",
        message: "Password must be at least 8 characters.",
      });
      return;
    }

    if (password !== confirm) {
      setStatus({
        type: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    const payload: RegisterRequest = {
      email,
      password,
    };

    if (fullName.trim()) payload.full_name = fullName.trim();
    if (phone.trim()) payload.phone = phone.trim();

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data:
        | RegisterSuccessResponse
        | FastAPIErrorResponse = await res.json();

      if (!res.ok) {
        setStatus({
          type: "error",
          message:
            "detail" in data
              ? data.detail
              : "Registration failed. Please try again.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Account created successfully. Redirecting to login…",
      });

      toast.success("Welcome to Karabo’s Store 🎉");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setStatus({
        type: "error",
        message: "Network error. Please check your connection.",
      });
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     UI
  ========================= */

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 28,
          borderRadius: 22,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            marginBottom: 18,
          }}
        >
          Create Your Account
        </h1>

        {status.type !== "idle" && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 12,
              fontWeight: 600,
              textAlign: "center",
              background:
                status.type === "success"
                  ? "#ecfdf5"
                  : "#fef2f2",
              color:
                status.type === "success"
                  ? "#065f46"
                  : "#991b1b",
            }}
          >
            {status.message}
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <input
            placeholder="Full name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Phone number (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            onClick={register}
            disabled={loading}
            className="btn btnTech"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
