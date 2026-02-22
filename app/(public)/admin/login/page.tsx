"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/lib/adminAuth";

const FF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif";
const FF_BODY = "'Jost', 'DM Sans', -apple-system, sans-serif";
const PRIMARY = "#0f3f2f";
const ACCENT = "#c8a75a";

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "admin-spin .8s linear infinite" }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity=".2"/>
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

export default function AdminLoginPage() {
  const router = useRouter();
  const { admin, login, hydrate, error } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (admin) router.replace("/admin");
  }, [admin, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back, Admin");
      router.replace("/admin");
    } catch (err: any) {
      toast.error(err.message || "Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Jost:wght@300;400;500;600&display=swap');
        @keyframes admin-spin { to { transform: rotate(360deg); } }
        @keyframes admin-fade { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        * { box-sizing: border-box; }
        .adm-input:focus { border-color: ${ACCENT} !important; outline: none; box-shadow: 0 0 0 3px rgba(200,167,90,0.1); }
        .adm-btn:hover:not(:disabled) { background: #0a2a1f !important; transform: translateY(-1px); box-shadow: 0 10px 36px rgba(15,63,47,0.4) !important; }
        .adm-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none !important; }
      `}</style>

      {/* Dark atmospheric background */}
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg, #07180f 0%, #0a2a1f 50%, #050e08 100%)", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "-25%", right: "-15%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,167,90,0.06) 0%, transparent 60%)", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-30%", left: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,63,47,0.4) 0%, transparent 60%)", zIndex: 0 }} />
      {/* Subtle grid texture */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(200,167,90,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,167,90,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, animation: "admin-fade .5s ease both" }}>

        {/* Brand mark */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={S.logoMark}>
            <ShieldIcon />
          </div>
          <p style={{ fontFamily: FF_BODY, fontSize: 10, fontWeight: 500, letterSpacing: "3.5px", textTransform: "uppercase", color: ACCENT, marginTop: 14, marginBottom: 0, opacity: 0.8 }}>
            Admin Portal
          </p>
        </div>

        {/* Card */}
        <div style={S.card}>
          <div style={{ marginBottom: 28, paddingBottom: 22, borderBottom: "1px solid rgba(200,167,90,0.12)" }}>
            <h1 style={S.title}>Secure Access</h1>
            <p style={S.subtitle}>Administrator credentials required</p>
          </div>

          {error && (
            <div style={S.errorBox}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={S.label}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@karabo.com"
                required
                style={S.input}
                className="adm-input"
              />
            </div>
            <div>
              <label style={S.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={S.input}
                className="adm-input"
              />
            </div>
            <button type="submit" disabled={loading} className="adm-btn" style={S.submitBtn}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "center" }}>
                  <Spinner /> Authenticating…
                </span>
              ) : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: "rgba(200,167,90,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: FF_BODY }}>
          Karabo Luxury · Restricted Area
        </p>
      </div>
    </div>
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
    width: 58,
    height: 58,
    borderRadius: 14,
    background: "linear-gradient(135deg, rgba(200,167,90,0.15) 0%, rgba(200,167,90,0.08) 100%)",
    border: "1px solid rgba(200,167,90,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
    color: ACCENT,
    boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 40px rgba(200,167,90,0.06)",
  },
  card: {
    background: "rgba(5,14,8,0.75)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRadius: 20,
    padding: "34px 34px 30px",
    border: "1px solid rgba(200,167,90,0.15)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 1px 0 rgba(200,167,90,0.08) inset",
  },
  title: {
    fontFamily: FF,
    fontSize: 30,
    fontWeight: 500,
    color: "#f5f0e8",
    letterSpacing: "-0.01em",
    margin: "0 0 6px",
    lineHeight: 1.2,
  },
  subtitle: {
    fontFamily: FF_BODY,
    fontSize: 12,
    color: "rgba(200,167,90,0.5)",
    margin: 0,
    fontWeight: 400,
    letterSpacing: "0.5px",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 14px",
    borderRadius: 10,
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 4,
    fontFamily: FF_BODY,
  },
  label: {
    display: "block",
    fontSize: 10,
    fontWeight: 600,
    color: "rgba(200,167,90,0.7)",
    marginBottom: 8,
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    fontFamily: FF_BODY,
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 10,
    border: "1px solid rgba(200,167,90,0.18)",
    fontSize: 14,
    fontFamily: FF_BODY,
    color: "#f5f0e8",
    background: "rgba(255,255,255,0.04)",
    transition: "border-color .15s, box-shadow .15s",
  },
  submitBtn: {
    width: "100%",
    padding: "15px",
    borderRadius: 12,
    background: PRIMARY,
    color: "#fff",
    border: "none",
    fontWeight: 500,
    fontSize: 12,
    fontFamily: FF_BODY,
    cursor: "pointer",
    letterSpacing: "2px",
    textTransform: "uppercase",
    boxShadow: "0 4px 24px rgba(15,63,47,0.4)",
    transition: "all .2s ease",
    marginTop: 4,
  },
};