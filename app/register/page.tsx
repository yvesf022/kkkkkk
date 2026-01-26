"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Status =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function register() {
    setStatus({ type: "idle" });

    /* ---------- CLIENT VALIDATION ---------- */
    if (!email || !password || !confirm) {
      setStatus({
        type: "error",
        message: "All fields are required.",
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

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // backend crashed or returned non-JSON
      }

      /* ---------- BACKEND / DB ERRORS ---------- */
      if (!res.ok) {
        if (res.status >= 500) {
          setStatus({
            type: "error",
            message:
              "Server or database error. Please try again later.",
          });
        } else {
          setStatus({
            type: "error",
            message:
              data?.detail ||
              "Registration failed due to invalid data.",
          });
        }
        return;
      }

      /* ---------- SUCCESS ---------- */
      setStatus({
        type: "success",
        message:
          "Account created successfully. You can now log in.",
      });

      toast.success("Account created 🎉");

      // Give user time to read
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setStatus({
        type: "error",
        message:
          "Network error. Please check your connection.",
      });
    } finally {
      setLoading(false);
    }
  }

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
          maxWidth: 420,
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
          Create Account
        </h1>

        {/* ---------- STATUS MESSAGE ---------- */}
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
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
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
            {loading ? "Creating..." : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
