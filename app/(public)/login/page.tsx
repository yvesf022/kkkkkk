// FILE: app/(public)/login/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

const FF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif";
const FF_BODY = "'Jost', 'DM Sans', -apple-system, sans-serif";
const PRIMARY = "#0f3f2f";
const ACCENT = "#c8a75a";
const CREAM = "#fdfcf8";

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "lux-spin .8s linear infinite" }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity=".2"/>
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/account";

  const authLogin = useAuth((s) => s.login);
  const mergeGuestCart = useCart((s) => s.mergeGuestCart);
  const fetchCart = useCart((s) => s.fetchCart);
  const cartItems = useCart((s) => s.cart?.items) ?? [];

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
      await authLogin(email, password);
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Jost:wght@300;400;500;600&display=swap');
        @keyframes lux-spin { to { transform: rotate(360deg); } }
        @keyframes lux-fade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        * { box-sizing: border-box; }
        .lux-input:focus { border-color: ${ACCENT} !important; outline: none; box-shadow: 0 0 0 3px rgba(200,167,90,0.12); }
        .lux-btn:hover:not(:disabled) { background: #0a2a1f !important; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(15,63,47,0.35) !important; }
        .lux-btn:disabled { opacity: 0.75; cursor: not-allowed; }
        .lux-eye:hover { color: ${ACCENT} !important; }
        .lux-link { color: ${ACCENT}; text-decoration: none; font-weight: 500; border-bottom: 1px solid transparent; transition: border-color .15s; }
        .lux-link:hover { border-bottom-color: ${ACCENT}; }
      `}</style>

      {/* Decorative background */}
      <div style={{ position: "fixed", inset: 0, background: `linear-gradient(160deg, ${CREAM} 0%, #f0ede4 40%, #e8e4d8 100%)`, zIndex: 0 }} />
      <div style={{ position: "fixed", top: "-30%", right: "-15%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,167,90,0.07) 0%, transparent 65%)", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-20%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,63,47,0.05) 0%, transparent 65%)", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, animation: "lux-fade .5s ease both" }}>

        {/* Brand mark */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={S.logoMark}>
            <span style={{ fontFamily: FF, fontSize: 28, fontWeight: 600, color: "white", letterSpacing: "0.02em" }}>K</span>
            <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
          </div>
          <p style={{ fontFamily: FF_BODY, fontSize: 11, fontWeight: 500, letterSpacing: "3px", textTransform: "uppercase", color: ACCENT, marginTop: 14, marginBottom: 0 }}>Karabo Luxury</p>
        </div>

        {/* Card */}
        <div style={S.card}>
          <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid rgba(200,167,90,0.15)" }}>
            <h1 style={S.title}>Welcome back</h1>
            <p style={S.subtitle}>Sign in to your account to continue</p>
          </div>

          {hasGuestCart && (
            <div style={S.cartNotice}>
              <CartIcon />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: PRIMARY, margin: 0, fontFamily: FF_BODY }}>Your cart is reserved</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0", fontFamily: FF_BODY }}>
                  {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} will sync after sign in
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={S.errorBox}>
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={S.label}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={S.input}
                className="lux-input"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={S.label}>Password</label>
                <Link href="/forgot-password" className="lux-link" style={{ fontSize: 11, letterSpacing: "0.5px", fontFamily: FF_BODY }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...S.input, paddingRight: 46 }}
                  className="lux-input"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="lux-eye"
                  style={S.eyeBtn}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="lux-btn" style={S.submitBtn}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "center" }}>
                  <Spinner /> Signing in…
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(200,167,90,0.12)", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0, fontFamily: FF_BODY, fontWeight: 400 }}>
              New to Karabo?{" "}
              <Link href={`/register?redirect=${encodeURIComponent(redirectTo)}`} className="lux-link">
                Create an account
              </Link>
            </p>
          </div>

          {redirectTo && redirectTo !== "/account" && (
            <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 10, fontFamily: FF_BODY, letterSpacing: "0.3px" }}>
              You'll be redirected back after signing in.
            </p>
          )}
        </div>

        {/* Footer mark */}
        <p style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: "#9ca3af", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FF_BODY }}>
          Curated Luxury · Est. 2024
        </p>
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
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px",
    fontFamily: FF_BODY,
    position: "relative",
  },
  logoMark: {
    width: 60,
    height: 60,
    borderRadius: 14,
    background: `linear-gradient(135deg, ${PRIMARY} 0%, #1b5e4a 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
    position: "relative",
    boxShadow: "0 8px 24px rgba(15,63,47,0.25)",
  },
  card: {
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 20,
    padding: "36px 36px 32px",
    border: "1px solid rgba(200,167,90,0.18)",
    boxShadow: "0 24px 64px rgba(15,63,47,0.08), 0 1px 0 rgba(255,255,255,0.8) inset",
  },
  title: {
    fontFamily: FF,
    fontSize: 30,
    fontWeight: 600,
    color: PRIMARY,
    letterSpacing: "-0.02em",
    margin: "0 0 6px",
    lineHeight: 1.2,
  },
  subtitle: {
    fontFamily: FF_BODY,
    fontSize: 13,
    color: "#6b7280",
    margin: 0,
    fontWeight: 400,
    letterSpacing: "0.2px",
  },
  cartNotice: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 14px",
    borderRadius: 10,
    background: "rgba(15,63,47,0.05)",
    border: "1px solid rgba(15,63,47,0.12)",
    marginBottom: 18,
    color: PRIMARY,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 14px",
    borderRadius: 10,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 4,
    fontFamily: FF_BODY,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: PRIMARY,
    marginBottom: 8,
    letterSpacing: "1px",
    textTransform: "uppercase",
    fontFamily: FF_BODY,
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 10,
    border: "1px solid rgba(200,167,90,0.25)",
    fontSize: 14,
    fontFamily: FF_BODY,
    color: PRIMARY,
    background: "rgba(255,255,255,0.7)",
    transition: "border-color .15s, box-shadow .15s",
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    padding: 4,
    transition: "color .15s",
  },
  submitBtn: {
    width: "100%",
    padding: "15px",
    borderRadius: 12,
    background: PRIMARY,
    color: "#fff",
    border: "none",
    fontWeight: 500,
    fontSize: 13,
    fontFamily: FF_BODY,
    cursor: "pointer",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    boxShadow: "0 4px 20px rgba(15,63,47,0.28)",
    transition: "all .2s ease",
    marginTop: 4,
  },
};