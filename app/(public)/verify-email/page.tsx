"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Amazon-level email verification page
 * Handles success, failure, and missing token safely
 */
export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token");

  const [status, setStatus] = useState<
    "loading" | "success" | "error"
  >("loading");

  const [message, setMessage] = useState<string>(
    "Verifying your email…"
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing verification link.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email?token=${token}`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!res.ok) {
          throw new Error();
        }

        setStatus("success");
        setMessage(
          "Your email has been verified successfully."
        );

        // Redirect to login after short delay
        setTimeout(() => {
          router.replace("/login");
        }, 2500);
      } catch {
        setStatus("error");
        setMessage(
          "This verification link is invalid or has expired."
        );
      }
    }

    verify();
  }, [token, router]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          padding: 28,
          borderRadius: 20,
          textAlign: "center",
          background:
            "linear-gradient(135deg,#ffffff,#f4f9ff)",
          boxShadow:
            "0 20px 60px rgba(15,23,42,0.18)",
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 900,
            marginBottom: 12,
          }}
        >
          Email Verification
        </h1>

        <p
          style={{
            opacity: 0.7,
            marginBottom: 24,
          }}
        >
          {message}
        </p>

        {status === "success" && (
          <p style={{ fontSize: 13, opacity: 0.6 }}>
            Redirecting you to login…
          </p>
        )}

        {status === "error" && (
          <button
            className="btn btnTech"
            onClick={() => router.push("/login")}
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}
