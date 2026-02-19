"use client";

export default function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: "12px 24px",
        borderRadius: 12,
        border: "none",
        background: "#0f172a",
        color: "#fff",
        fontWeight: 800,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      Try Again
    </button>
  );
}