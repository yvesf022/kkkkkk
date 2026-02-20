// FILE: app/(public)/register/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

const FF = "'DM Sans', -apple-system, sans-serif";
const ACCENT = "#2563EB";
const BRAND = "#0F172A";

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M2 2l16 16M8.5 8.6A3 3 0 0011.4 11.5M6 6.1C3.5 7.5 1.9 9.6 1 10c1.5 3 5 6 9 6 1.7 0 3.3-.5 4.7-1.4M14.5 13.6C16.8 12.1 18.3 10.3 19 10c-1.5-3-5-6-9-6-.7 0-1.4.1-2.1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ animation: "spin .7s linear infinite" }}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity=".3"/>
    <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CheckMark = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7.5l3 3L11.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/account";
  const authLogin = useAuth(s => s.login);
  const mergeGuestCart = useCart(s => s.mergeGuestCart);
  const fetchCart = useCart(s => s.fetchCart);
  const cartItems = useCart(s => s.cart?.items ?? []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasGuestCart = cartItems.length > 0;

  const pwdChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const pwdStrength = Object.values(pwdChecks).filter(Boolean).length;
  const pwdColor = pwdStrength === 0 ? "#E2E8F0" : pwdStrength === 1 ? "#F43F5E" : pwdStrength === 2 ? "#F59E0B" : "#10B981";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !email || !password) { setError("Please fill in all fields"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError(null);
    try {
      await authApi.register({ email, password, full_name: fullName });
      await authLogin(email, password);
      if (hasGuestCart) {
        await mergeGuestCart().catch(() => {});
      }
      await fetchCart().catch(() => {});
      setSuccess(true);
      setTimeout(() => router.push(redirectTo), 800);
    } catch (e: any) {
      setError(e.message ?? "Registration failed. Email may already be in use.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ ...S.page }}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: BRAND, margin: "0 0 8px" }}>Account Created!</h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>Redirecting you to checkout…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>

      <div style={S.card}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={S.logoRing}>🛍️</div>
          <h1 style={S.title}>Create account</h1>
          <p style={S.subtitle}>Join to shop and track your orders</p>
        </div>

        {hasGuestCart && (
          <div style={S.cartNotice}>
            <span style={{ fontSize: 16 }}>🛒</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#065F46", margin: 0 }}>Cart saved!</p>
              <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>
                {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} will sync after registration.
              </p>
            </div>
          </div>
        )}

        {error && <div style={S.errorBox}>⚠ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={S.label}>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="John Doe"
              style={S.input}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label style={S.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={S.input}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label style={S.label}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                style={{ ...S.input, paddingRight: 44 }}
                autoComplete="new-password"
                required
              />
              <button type="button" onClick={() => setShowPass(v => !v)} style={S.eyeBtn}>
                <EyeIcon open={showPass} />
              </button>
            </div>
            {password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < pwdStrength ? pwdColor : "#E2E8F0", transition: "background .2s" }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {([["length", "8+ chars"], ["uppercase", "Uppercase"], ["number", "Number"]] as const).map(([key, label]) => (
                    <span key={key} style={{ fontSize: 11, color: pwdChecks[key] ? "#10B981" : "#94A3B8", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                      {pwdChecks[key] ? <CheckMark /> : "○"} {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={S.label}>Confirm Password</label>
            <input
              type={showPass ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              style={{
                ...S.input,
                borderColor: confirmPassword && confirmPassword !== password ? "#F43F5E" : undefined,
              }}
              autoComplete="new-password"
              required
            />
            {confirmPassword && confirmPassword !== password && (
              <p style={{ fontSize: 12, color: "#F43F5E", marginTop: 4 }}>Passwords don&apos;t match</p>
            )}
          </div>

          <button type="submit" disabled={loading} style={{ ...S.submitBtn, opacity: loading ? 0.8 : 1, marginTop: 4 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <Spinner /> Creating account…
              </span>
            ) : "Create Account →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 14, color: "#64748B", marginTop: 20 }}>
          Already have an account?{" "}
          <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} style={{ color: ACCENT, fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)",
    padding: "24px 16px", fontFamily: FF,
  },
  card: {
    background: "#fff", borderRadius: 20, padding: "32px 32px",
    width: "100%", maxWidth: 440,
    boxShadow: "0 8px 40px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.06)",
  },
  logoRing: {
    width: 52, height: 52, borderRadius: "50%",
    background: "#EFF6FF", fontSize: 24,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 12px",
  },
  title: { fontSize: 22, fontWeight: 800, color: BRAND, letterSpacing: "-0.03em", margin: 0 },
  subtitle: { fontSize: 13, color: "#94A3B8", margin: "4px 0 0" },
  cartNotice: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 14px", borderRadius: 10,
    background: "#F0FDF4", border: "1px solid #BBF7D0", marginBottom: 14,
  },
  errorBox: {
    padding: "10px 14px", borderRadius: 10,
    background: "#FFF1F2", border: "1px solid #FECDD3",
    color: "#9F1239", fontSize: 13, fontWeight: 600, marginBottom: 4,
  },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: BRAND, marginBottom: 5 },
  input: {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1.5px solid #E2E8F0", fontSize: 14, fontFamily: FF,
    outline: "none", color: BRAND,
  },
  eyeBtn: {
    position: "absolute" as const, right: 12, top: "50%",
    transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer",
    color: "#94A3B8", display: "flex", padding: 4,
  },
  submitBtn: {
    width: "100%", padding: "14px", borderRadius: 12,
    background: ACCENT, color: "#fff",
    border: "none", fontWeight: 800, fontSize: 15, fontFamily: FF,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(37,99,235,.3)",
  },
};