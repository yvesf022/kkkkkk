"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function register() {
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      toast.success("Account created. You can now log in.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Registration error");
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
