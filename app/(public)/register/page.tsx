// FILE: app/(public)/register/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
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

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 6.5l3 3L10.5 2"/>
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

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/account";
  const authLogin = useAuth((s) => s.login);
  const mergeGuestCart = useCart((s) => s.mergeGuestCart);
  const fetchCart = useCart((s) => s.fetchCart);
  const cartItems = useCart((s) => s.cart?.items) ?? [];

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
  const pwdColor = pwdStrength === 0 ? "rgba(200,167,90,0.2)" : pwdStrength === 1 ? "#e05c5c" : pwdStrength === 2 ? "#d4a04a" : "#5aad7a";

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
      setTimeout(() => router.push(redirectTo), 900);
    } catch (e: any) {
      setError(e.message ?? "Registration failed. Email may already be in use.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={S.page}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Jost:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; }`}</style>
        <div style={{ position: "fixed", inset: 0, background: `linear-gradient(160deg, ${CREAM} 0%, #f0ede4 40%, #e8e4d8 100%)`, zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, ...S.card, textAlign: "center", padding: "48px 36px", maxWidth: 380 }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: "rgba(15,63,47,0.07)", border: "1px solid rgba(15,63,47,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: PRIMARY }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: FF, fontSize: 28, fontWeight: 600, color: PRIMARY, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Welcome to Karabo</h2>
          <p style={{ fontFamily: FF_BODY, color: "#6b7280", fontSize: 13, margin: 0 }}>Your account is ready. Redirecting…</p>
        </div>
      </div>
    );
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
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={S.logoMark}>
            <span style={{ fontFamily: FF, fontSize: 28, fontWeight: 600, color: "white", letterSpacing: "0.02em" }}>K</span>
            <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
          </div>
          <p style={{ fontFamily: FF_BODY, fontSize: 11, fontWeight: 500, letterSpacing: "3px", textTransform: "uppercase", color: ACCENT, marginTop: 14, marginBottom: 0 }}>Karabo Luxury</p>
        </div>

        {/* Card */}
        <div style={S.card}>
          <div style={{ marginBottom: 24, paddingBottom: 22, borderBottom: "1px solid rgba(200,167,90,0.15)" }}>
            <h1 style={S.title}>Create account</h1>
            <p style={S.subtitle}>Join to shop and track your orders</p>
          </div>

          {hasGuestCart && (
            <div style={S.cartNotice}>
              <CartIcon />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: PRIMARY, margin: 0, fontFamily: FF_BODY }}>Your cart is reserved</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0", fontFamily: FF_BODY }}>
                  {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} will sync after registration
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={S.label}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                style={S.input}
                className="lux-input"
                autoComplete="name"
                required
              />
            </div>

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
              <label style={S.label}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={{ ...S.input, paddingRight: 46 }}
                  className="lux-input"
                  autoComplete="new-password"
                  required
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="lux-eye" style={S.eyeBtn}>
                  <EyeIcon open={showPass} />
                </button>
              </div>
              {password && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i < pwdStrength ? pwdColor : "rgba(200,167,90,0.15)", transition: "background .25s" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {([["length", "8+ chars"], ["uppercase", "Uppercase"], ["number", "Number"]] as const).map(([key, label]) => (
                      <span key={key} style={{ fontSize: 11, color: pwdChecks[key] ? "#5aad7a" : "#9ca3af", display: "flex", alignItems: "center", gap: 4, fontFamily: FF_BODY, fontWeight: 500, transition: "color .2s" }}>
                        {pwdChecks[key]
                          ? <span style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(90,173,122,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#5aad7a" }}><CheckIcon /></span>
                          : <span style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid rgba(200,167,90,0.3)", display: "inline-block" }} />
                        }
                        {label}
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
                  borderColor: confirmPassword && confirmPassword !== password ? "#e05c5c" : undefined,
                }}
                className="lux-input"
                autoComplete="new-password"
                required
              />
              {confirmPassword && confirmPassword !== password && (
                <p style={{ fontSize: 11, color: "#e05c5c", marginTop: 5, fontFamily: FF_BODY }}>Passwords don&apos;t match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="lux-btn" style={{ ...S.submitBtn, marginTop: 4 }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "center" }}>
                  <Spinner /> Creating account…
                </span>
              ) : "Create Account"}
            </button>
          </form>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(200,167,90,0.12)", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0, fontFamily: FF_BODY, fontWeight: 400 }}>
              Already have an account?{" "}
              <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="lux-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: "#9ca3af", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FF_BODY }}>
          Curated Luxury · Est. 2024
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
    padding: "34px 36px 30px",
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
    marginBottom: 16,
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
    fontSize: 10,
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
  },
};