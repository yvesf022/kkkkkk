// FILE: app/(public)/login/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/account";
  const mergeGuestCart = useCart(s => s.mergeGuestCart);
  const fetchCart = useCart(s => s.fetchCart);
  const cartItems = useCart(s => s.cart?.items ?? []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasGuestCart = cartItems.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError(null);
    try {
      await authApi.login({ email, password });
      if (hasGuestCart) {
        await mergeGuestCart().catch(() => {});
      }
      await fetchCart().catch(() => {});
      router.push(redirectTo);
    } catch (e: any) {
      setError(e.message ?? "Invalid email or password");
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>

      <div style={S.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={S.logoRing}>🛍️</div>
          <h1 style={S.title}>Welcome back</h1>
          <p style={S.subtitle}>Sign in to your account</p>
        </div>

        {hasGuestCart && (
          <div style={S.cartNotice}>
            <span style={{ fontSize: 16 }}>🛒</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#065F46", margin: 0 }}>Your cart is saved!</p>
              <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>
                {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} will be synced after login.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div style={S.errorBox}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={S.label}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>Forgot password?</Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...S.input, paddingRight: 44 }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={S.eyeBtn}
              >
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ ...S.submitBtn, opacity: loading ? 0.8 : 1 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <Spinner /> Signing in…
              </span>
            ) : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 14, color: "#64748B", marginTop: 20 }}>
          Don&apos;t have an account?{" "}
          <Link href={`/register?redirect=${encodeURIComponent(redirectTo)}`} style={{ color: ACCENT, fontWeight: 700 }}>
            Create one free
          </Link>
        </p>

        {redirectTo && redirectTo !== "/account" && (
          <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 8 }}>
            You&apos;ll be redirected back after signing in.
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
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
    background: "#fff", borderRadius: 20, padding: "36px 32px",
    width: "100%", maxWidth: 420,
    boxShadow: "0 8px 40px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.06)",
  },
  logoRing: {
    width: 56, height: 56, borderRadius: "50%",
    background: "#EFF6FF", fontSize: 26,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 14px",
  },
  title: { fontSize: 24, fontWeight: 800, color: BRAND, letterSpacing: "-0.03em", margin: 0 },
  subtitle: { fontSize: 14, color: "#94A3B8", margin: "4px 0 0" },
  cartNotice: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 14px", borderRadius: 10,
    background: "#F0FDF4", border: "1px solid #BBF7D0", marginBottom: 16,
  },
  errorBox: {
    padding: "11px 14px", borderRadius: 10,
    background: "#FFF1F2", border: "1px solid #FECDD3",
    color: "#9F1239", fontSize: 13, fontWeight: 600, marginBottom: 4,
  },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: BRAND, marginBottom: 6 },
  input: {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1.5px solid #E2E8F0", fontSize: 14, fontFamily: FF,
    outline: "none", color: BRAND, transition: "border-color .15s",
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
    cursor: "pointer", marginTop: 4,
    boxShadow: "0 4px 16px rgba(37,99,235,.3)",
    transition: "all .15s",
  },
};