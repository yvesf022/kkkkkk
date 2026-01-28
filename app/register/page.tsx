"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRules = {
    length: password.length >= 8,
    number: /\d/.test(password),
    letter: /[a-zA-Z]/.test(password),
  };

  const allRulesPassed = Object.values(passwordRules).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!allRulesPassed) {
      toast.error("Password does not meet requirements");
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      toast.success("Account created successfully");
      router.replace("/login");
    } catch {
      toast.error("Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="pageContentWrap"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "calc(100vh - var(--header-height, 72px))",
      }}
    >
      <section
        className="card"
        style={{
          maxWidth: 460,
          width: "100%",
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="pageTitle">Create an account</h1>
          <p className="pageSubtitle">
            Register to track orders, manage payments, and shop faster.
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: 16 }}
        >
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              style={{ paddingRight: 44 }}
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="btn btnGhost"
              style={{
                position: "absolute",
                right: 4,
                top: 4,
                padding: "6px 10px",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            autoComplete="new-password"
          />

          {/* PASSWORD RULES */}
          <div className="infoBox">
            <strong>Password requirements</strong>
            <ul className="list" style={{ marginTop: 8 }}>
              <li>
                {passwordRules.length ? "✓" : "✕"} At least 8 characters
              </li>
              <li>
                {passwordRules.number ? "✓" : "✕"} Contains a number
              </li>
              <li>
                {passwordRules.letter ? "✓" : "✕"} Contains a letter
              </li>
            </ul>
          </div>

          <button
            type="submit"
            className="btn btnPrimary"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* FOOTER */}
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gap: 10,
          }}
        >
          <Link
            href="/login"
            className="btn btnGhost"
          >
            Already have an account? Sign in
          </Link>

          <p className="mutedText" style={{ textAlign: "center" }}>
            Your details are protected using secure, encrypted sessions.
          </p>
        </div>
      </section>
    </main>
  );
}
