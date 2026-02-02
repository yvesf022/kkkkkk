"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, CheckCircle, XCircle, Mail, ShieldCheck } from "lucide-react";

/* --------------------------------------------------
   SAFE API BASE (FIXED)
-------------------------------------------------- */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

/* --------------------------------------------------
   REGISTER PAGE — AMAZON LEVEL
-------------------------------------------------- */
export default function RegisterPage() {
  const router = useRouter();

  /* ---------------- STATE ---------------- */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  /* ---------------- PASSWORD RULES ---------------- */
  const passwordRules = useMemo(() => {
    return {
      length: password.length >= 8,
      number: /\d/.test(password),
      letter: /[a-zA-Z]/.test(password),
    };
  }, [password]);

  const passwordValid =
    passwordRules.length &&
    passwordRules.number &&
    passwordRules.letter;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const canSubmit =
    fullName.trim().length >= 2 &&
    email &&
    passwordValid &&
    passwordsMatch &&
    !loading;

  /* ---------------- REGISTER ---------------- */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        email,
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      };

      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      toast.success("Account created 🎉");
      setRegistered(true);
    } catch (err: any) {
      const msg =
        err?.message || "Unable to create account. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SUCCESS ---------------- */
  if (registered) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
          <Mail size={42} className="mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold">Verify your email</h1>

          <p className="mt-3 text-gray-600">
            We sent a verification link to:
          </p>
          <p className="mt-1 font-bold">{email}</p>

          <p className="mt-4 text-sm text-gray-500">
            Please verify your email before signing in.
          </p>

          <div className="mt-6 grid gap-3">
            <button
              className="btn btnPrimary"
              onClick={() => router.push("/login")}
            >
              Go to login
            </button>

            <button
              className="btn btnGhost"
              onClick={() => router.push("/store")}
            >
              Continue shopping
            </button>
          </div>
        </section>
      </main>
    );
  }

  /* ---------------- FORM ---------------- */
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-extrabold">Create account</h1>
        <p className="mt-1 text-sm text-gray-600">
          Shop faster, track orders, and manage your account.
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm text-red-700 font-medium">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-6 grid gap-4">
          {/* FULL NAME */}
          <div>
            <label className="block text-sm font-semibold">
              Full name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-semibold">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>

          {/* PHONE */}
          <div>
            <label className="block text-sm font-semibold">
              Mobile number <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-semibold">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* PASSWORD RULES */}
            <div className="mt-2 space-y-1 text-sm">
              {[
                { ok: passwordRules.length, label: "At least 8 characters" },
                { ok: passwordRules.number, label: "Contains a number" },
                { ok: passwordRules.letter, label: "Contains a letter" },
              ].map((r) => (
                <div
                  key={r.label}
                  className={`flex items-center gap-2 ${
                    r.ok ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {r.ok ? (
                    <CheckCircle size={14} />
                  ) : (
                    <XCircle size={14} />
                  )}
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          {/* CONFIRM */}
          <div>
            <label className="block text-sm font-semibold">
              Re-enter password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {!passwordsMatch && confirmPassword && (
              <p className="mt-1 text-sm text-red-700 font-medium">
                Passwords do not match
              </p>
            )}
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btnPrimary mt-2"
          >
            {loading ? "Creating account…" : "Create your Karabo account"}
          </button>
        </form>

        {/* TRUST */}
        <div className="mt-6 flex items-center gap-2 text-xs text-gray-600">
          <ShieldCheck size={16} />
          Secure registration · Email verification required
        </div>

        {/* FOOTER */}
        <div className="mt-6 grid gap-2 text-sm">
          <button
            className="btn btnGhost"
            onClick={() => router.push("/login")}
          >
            Already have an account? Sign in
          </button>

          <button
            className="btn btnGhost"
            onClick={() => router.push("/store")}
          >
            Continue as guest
          </button>
        </div>
      </section>
    </main>
  );
}
