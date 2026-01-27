"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        email,
        password,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      toast.success("Account created successfully");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 26,
          padding: "32px 30px",
          background: `
            radial-gradient(
              420px 220px at 10% 0%,
              rgba(96,165,250,0.28),
              transparent 60%
            ),
            radial-gradient(
              360px 200px at 90% 10%,
              rgba(244,114,182,0.20),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow: "0 28px 80px rgba(15,23,42,0.18)",
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          Create Account
        </h1>

        <p
          style={{
            marginTop: 6,
            fontWeight: 600,
            fontSize: 14,
            color: "rgba(15,23,42,0.6)",
          }}
        >
          Create your account to start shopping.
        </p>

        <form
          onSubmit={handleRegister}
          style={{
            marginTop: 22,
            display: "grid",
            gap: 14,
          }}
        >
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              fontWeight: 600,
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              fontWeight: 600,
            }}
          />

          <input
            type="text"
            placeholder="Full name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              fontWeight: 600,
            }}
          />

          <input
            type="text"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              fontWeight: 600,
            }}
          />

          <button
            className="btn btnTech"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? "Creating account…" : "Register"}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(15,23,42,0.6)",
            textAlign: "center",
          }}
        >
          Already have an account?{" "}
          <a
            href="/login"
            style={{
              fontWeight: 800,
              color: "#2563eb",
              textDecoration: "none",
            }}
          >
            Login
          </a>
        </div>
      </section>
    </div>
  );
}
